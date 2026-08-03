-- Runner-facing RPCs for the Playwright Local Runner CLI (copied into runner/
-- + packages/agent-core/ from nvLfr-testify), adapted onto the automation
-- tables already ported in 20260802000001_backend_automation.sql.
--
-- That earlier migration deliberately did NOT port any automation RPCs,
-- because the plan was for the Go MCP backend to talk to Postgres directly
-- over a privileged connection (see backend/service/automation_service.go,
-- backend/repository/postgres/automation_repo.go — Enqueue/MapScript/
-- RerunFailed/RunnerList/JobStatus already live there and are NOT duplicated
-- here). But the Go REST API has no automation endpoints yet, so the runner
-- CLI currently has nothing to poll. These functions are the deliberate,
-- temporary exception: the minimum runner-facing surface (heartbeat / poll /
-- report / log) needed to run a job end to end via Supabase directly. They
-- should be retired once a REST endpoint exists for the runner to call
-- instead — do not add manager-facing writes (create runner, enqueue, cancel)
-- here, those stay Go-side.
--
-- Token auth mirrors this repo's existing convention (sha256 hex via pgcrypto,
-- see mint_api_token / mcp_begin_tool_call): the runner token in the request
-- body is the real credential, validated against automation_runners.token_hash.
-- The Supabase anon key is only transport-level auth (see SupabaseRpcTransport).

-- === Heartbeat ===
-- Called on runner start and every TM_HEARTBEAT_INTERVAL_SECONDS. Updates
-- last_seen_at (drives the online/offline computed status) and returns a
-- minimal version policy so the runner can warn on incompatible versions.
-- p_payload carries the AgentHeartbeatPayload shape from packages/agent-core
-- (agent/version/process/capabilities/runtime) — informational only for now,
-- not persisted, since automation_runners has no columns for it yet.
create or replace function heartbeat_local_agent(p_token text, p_payload jsonb default '{}'::jsonb)
returns jsonb as $$
declare v_runner automation_runners;
begin
  update automation_runners
  set last_seen_at = now()
  where active and token_hash = encode(extensions.digest(coalesce(p_token, ''), 'sha256'), 'hex')
  returning * into v_runner;

  if not found then raise exception 'INVALID_RUNNER_TOKEN'; end if;

  return jsonb_build_object(
    'agent_id', v_runner.id,
    'active', v_runner.active,
    'last_seen_at', v_runner.last_seen_at,
    'server_version', '0.1.0',
    'minimum_supported_runner_version', '0.1.0'
  );
end; $$ language plpgsql security definer set search_path = public, extensions;

revoke all on function heartbeat_local_agent(text, jsonb) from public;
grant execute on function heartbeat_local_agent(text, jsonb) to anon, authenticated;

-- === Poll ===
-- Runner pulls the next matching queued job. required_labels must be a subset
-- of the runner's advertised labels. SKIP LOCKED lets multiple runners poll
-- the same project safely.
create or replace function poll_automation_job(p_token text)
returns jsonb as $$
declare
  v_runner automation_runners;
  v_job automation_jobs;
  v_case test_cases;
begin
  select * into v_runner from automation_runners
  where active and token_hash = encode(extensions.digest(coalesce(p_token, ''), 'sha256'), 'hex');
  if not found then raise exception 'INVALID_RUNNER_TOKEN'; end if;

  update automation_runners set last_seen_at = now() where id = v_runner.id;

  select * into v_job from automation_jobs
  where project_id = v_runner.project_id and status = 'queued' and required_labels <@ v_runner.labels
  order by queued_at asc
  for update skip locked
  limit 1;

  if not found then return jsonb_build_object('job', null); end if;

  update automation_jobs
  set status = 'running', runner_id = v_runner.id, attempt = attempt + 1, started_at = now()
  where id = v_job.id
  returning * into v_job;

  select * into v_case from test_cases where id = v_job.test_case_id;

  return jsonb_build_object('job', jsonb_build_object(
    'id', v_job.id,
    'test_run_id', v_job.test_run_id,
    'test_case_id', v_job.test_case_id,
    'test_case_code', v_case.code,
    'test_case_title', v_case.title,
    'script_ref', v_job.script_ref,
    'attempt', v_job.attempt,
    'max_attempts', v_job.max_attempts,
    'repository', null
  ));
end; $$ language plpgsql security definer set search_path = public, extensions;

revoke all on function poll_automation_job(text) from public;
grant execute on function poll_automation_job(text) to anon, authenticated;

-- === Report ===
-- Runner reports the outcome of a running job it holds. Result maps onto the
-- test_results row already seeded by the Go enqueue path (one row per
-- test_run_id x test_case_id). A failed job with attempts remaining is
-- requeued when p_payload.retry is true, matching the Go service's
-- max_attempts validation (already enforced at enqueue time; not repeated
-- here since attempt/max_attempts are read from the existing row).
create or replace function report_automation_job(p_token text, p_job_id uuid, p_payload jsonb)
returns jsonb as $$
declare
  v_runner automation_runners;
  v_job automation_jobs;
  v_result_status text;
  v_final_status text;
  v_requeue boolean := false;
begin
  select * into v_runner from automation_runners
  where active and token_hash = encode(extensions.digest(coalesce(p_token, ''), 'sha256'), 'hex');
  if not found then raise exception 'INVALID_RUNNER_TOKEN'; end if;

  update automation_runners set last_seen_at = now() where id = v_runner.id;

  select * into v_job from automation_jobs where id = p_job_id for update;
  if not found or v_job.runner_id <> v_runner.id or v_job.status <> 'running' then
    raise exception 'JOB_NOT_CLAIMED_BY_RUNNER';
  end if;

  if jsonb_typeof(p_payload) <> 'object' then raise exception 'INVALID_PAYLOAD'; end if;
  if (p_payload->>'result') not in ('pass', 'fail', 'blocked', 'skip') then raise exception 'INVALID_RESULT'; end if;
  v_result_status := p_payload->>'result';

  if v_result_status <> 'pass' and coalesce((p_payload->>'retry')::boolean, false) and v_job.attempt < v_job.max_attempts then
    v_requeue := true;
  end if;

  if v_requeue then
    update automation_jobs
    set status = 'queued', runner_id = null, started_at = null,
      artifacts = coalesce(p_payload->'artifacts', '[]'::jsonb),
      error_message = nullif(trim(p_payload->>'error_message'), '')
    where id = v_job.id;

    return jsonb_build_object('job_id', v_job.id, 'status', 'queued', 'requeued', true);
  end if;

  v_final_status := case when v_result_status = 'pass' then 'passed' else 'failed' end;

  update automation_jobs
  set status = v_final_status, finished_at = now(),
    artifacts = coalesce(p_payload->'artifacts', '[]'::jsonb),
    error_message = nullif(trim(p_payload->>'error_message'), '')
  where id = v_job.id;

  update test_results
  set status = v_result_status, executed_at = now(),
    notes = nullif(trim(p_payload->>'notes'), '')
  where test_run_id = v_job.test_run_id and test_case_id = v_job.test_case_id;

  return jsonb_build_object('job_id', v_job.id, 'status', v_final_status, 'requeued', false);
end; $$ language plpgsql security definer set search_path = public, extensions;

revoke all on function report_automation_job(text, uuid, jsonb) from public;
grant execute on function report_automation_job(text, uuid, jsonb) to anon, authenticated;

-- === Job logs ===
-- Live stdout/stderr/system log lines streamed during execution, so the UI
-- can tail a running job. Sequence is caller-assigned (monotonic per job) —
-- stored append-only, no read RPC yet since there is no live-log viewer UI
-- in this repo yet either; this just keeps the runner's append calls from
-- failing outright.
create table if not exists automation_job_logs (
  id bigint generated always as identity primary key,
  job_id uuid not null references automation_jobs(id) on delete cascade,
  attempt integer not null,
  sequence integer not null,
  stream text not null check (stream in ('stdout', 'stderr', 'system')),
  content text not null,
  created_at timestamptz not null default now(),
  unique (job_id, attempt, sequence)
);
create index if not exists idx_automation_job_logs_job on automation_job_logs(job_id, attempt, sequence);

alter table automation_job_logs enable row level security;

drop policy if exists "project access - automation job logs select" on automation_job_logs;
create policy "project access - automation job logs select" on automation_job_logs for select
  using (exists (
    select 1 from automation_jobs j where j.id = automation_job_logs.job_id and has_project_access(j.project_id)
  ));

create or replace function append_automation_job_log(
  p_token text, p_job_id uuid, p_attempt integer, p_sequence integer, p_stream text, p_content text
)
returns jsonb as $$
declare v_runner automation_runners;
begin
  select * into v_runner from automation_runners
  where active and token_hash = encode(extensions.digest(coalesce(p_token, ''), 'sha256'), 'hex');
  if not found then raise exception 'INVALID_RUNNER_TOKEN'; end if;

  if p_stream not in ('stdout', 'stderr', 'system') then raise exception 'INVALID_STREAM'; end if;
  if not exists (select 1 from automation_jobs where id = p_job_id and runner_id = v_runner.id) then
    raise exception 'JOB_NOT_CLAIMED_BY_RUNNER';
  end if;

  insert into automation_job_logs(job_id, attempt, sequence, stream, content)
  values (p_job_id, p_attempt, p_sequence, p_stream, left(coalesce(p_content, ''), 8000))
  on conflict (job_id, attempt, sequence) do nothing;

  return jsonb_build_object('job_id', p_job_id, 'sequence', p_sequence);
end; $$ language plpgsql security definer set search_path = public, extensions;

revoke all on function append_automation_job_log(text, uuid, integer, integer, text, text) from public;
grant execute on function append_automation_job_log(text, uuid, integer, integer, text, text) to anon, authenticated;

-- === Codegen script attach (low-risk, table already exists) ===
-- Runner's `sync.ts` calls this after a human maps a freshly-discovered
-- Playwright script to a Test Case interactively. Trivial upsert onto
-- automation_scripts, which already exists (20260802000001_backend_automation.sql)
-- with a unique(test_case_id) constraint — no new table needed. Unlike
-- list_runner_codegen_test_cases (below, skipped), this doesn't need to
-- enumerate/join test_case_steps, so it carries much less shape-guessing risk.
create or replace function attach_runner_codegen_script(p_token text, p_test_case_id uuid, p_script_ref text)
returns jsonb as $$
declare
  v_runner automation_runners;
  v_script automation_scripts;
begin
  select * into v_runner from automation_runners
  where active and token_hash = encode(extensions.digest(coalesce(p_token, ''), 'sha256'), 'hex');
  if not found then raise exception 'INVALID_RUNNER_TOKEN'; end if;

  if length(trim(coalesce(p_script_ref, ''))) not between 1 and 500 then
    raise exception 'INVALID_SCRIPT_REF';
  end if;
  if not exists (select 1 from test_cases where id = p_test_case_id and project_id = v_runner.project_id) then
    raise exception 'TEST_CASE_NOT_FOUND';
  end if;

  insert into automation_scripts (project_id, test_case_id, script_ref, created_by)
  values (v_runner.project_id, p_test_case_id, trim(p_script_ref), v_runner.created_by)
  on conflict (test_case_id) do update set script_ref = excluded.script_ref
  returning * into v_script;

  return jsonb_build_object('test_case_id', v_script.test_case_id, 'script_ref', v_script.script_ref);
end; $$ language plpgsql security definer set search_path = public, extensions;

revoke all on function attach_runner_codegen_script(text, uuid, text) from public;
grant execute on function attach_runner_codegen_script(text, uuid, text) to anon, authenticated;

-- === Mint (manager-facing, authenticated — NOT a runner-token RPC) ===
-- Lets a project manager create a runner + get its one-time-shown token from
-- the SQL editor or a future UI, without hand-writing an insert. Mirrors
-- mint_api_token's pattern (20260802170708_api_tokens_mint_rpc.sql): generate
-- a random token, store only its hash, return the raw token once. This is a
-- stand-in for the sibling repo's create_automation_runner + bootstrap-code
-- flow — no short-lived enrollment code here, just a direct mint for a
-- project you already manage.
create or replace function mint_automation_runner_token(p_project_id uuid, p_name text, p_labels text[] default '{}')
returns jsonb as $$
declare
  v_raw_token text;
  v_runner automation_runners;
begin
  if not can_edit_project_content(p_project_id) then raise exception 'FORBIDDEN'; end if;
  if length(trim(coalesce(p_name, ''))) not between 1 and 120 then raise exception 'INVALID_NAME'; end if;

  v_raw_token := 'tm_' || encode(extensions.gen_random_bytes(32), 'hex');

  insert into automation_runners (project_id, name, labels, token_prefix, token_hash, created_by)
  values (
    p_project_id,
    trim(p_name),
    coalesce(p_labels, '{}'),
    left(v_raw_token, 11),
    encode(extensions.digest(v_raw_token, 'sha256'), 'hex'),
    auth.uid()
  )
  returning * into v_runner;

  return jsonb_build_object('runner', to_jsonb(v_runner) - 'token_hash', 'token', v_raw_token);
end; $$ language plpgsql security definer set search_path = public, extensions;

revoke all on function mint_automation_runner_token(uuid, text, text[]) from public, anon;
grant execute on function mint_automation_runner_token(uuid, text, text[]) to authenticated;

-- === Skipped for this pass ===
-- redeem_agent_bootstrap_code, poll_runner_diagnostic / report_runner_diagnostic,
-- poll_automation_job_commands (step-through control channel), and
-- list_runner_codegen_test_cases (codegen test-case picker, needs
-- test_case_steps join + CodegenTestCase shape not confirmed here) are NOT
-- ported. None are on the critical path to get one job running end to end
-- (heartbeat -> poll -> execute -> report), and their shapes depend on
-- UI/bootstrap flows (runner enrollment via a short-lived code, live
-- step-through control) that don't exist in this repo's frontend yet. Port
-- them alongside the corresponding UI work.
