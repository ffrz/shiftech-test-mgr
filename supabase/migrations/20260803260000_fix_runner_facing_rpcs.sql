-- Deploy/fix all runner-facing RPCs that the Playwright Local Runner CLI
-- calls via PostgREST. Previous versions had broken search_path (missing
-- 'extensions' schema, causing digest() failures) or didn't exist at all
-- (heartbeat_local_agent was dropped, poll_runner_diagnostic never deployed).
--
-- This migration ensures ALL functions the runner calls exist and work:
--   heartbeat_local_agent -> authenticate + version check
--   poll_automation_job    -> claim queued jobs
--   report_automation_job  -> report job results
--   poll_runner_diagnostic -> stub (no-op, returns null)
--   append_automation_job_log -> stream live logs
--   poll_automation_job_commands -> stub (no step-through control yet)
--
-- Every function uses extensions.digest(...) with the fully-qualified name
-- AND search_path that includes 'extensions' for any legacy digest() calls.

-- === heartbeat_local_agent ===
create or replace function public.heartbeat_local_agent(p_token text, p_payload jsonb default '{}'::jsonb)
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
revoke all on function public.heartbeat_local_agent(text, jsonb) from public;
grant execute on function public.heartbeat_local_agent(text, jsonb) to anon, authenticated;

-- === poll_automation_job (fixed search_path + extensions.digest) ===
create or replace function public.poll_automation_job(p_token text)
returns jsonb as $$
declare
  v_runner automation_runners;
  v_job automation_jobs;
  v_case test_cases;
  v_repository project_repositories;
  v_repository_token text;
  v_repository_payload jsonb := null;
begin
  select * into v_runner
  from automation_runners
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
  where id = v_job.id returning * into v_job;
  select * into v_case from test_cases where id = v_job.test_case_id;

  select r.* into v_repository
  from test_runs tr
  join project_repositories r on r.id = tr.repository_id and r.project_id = v_job.project_id and r.is_active
  where tr.id = v_job.test_run_id;

  if found then
    select s.decrypted_secret into v_repository_token
    from vault.decrypted_secrets s
    where s.id = v_repository.credential_id
      and (v_repository.credential_expires_at is null or v_repository.credential_expires_at > now());

    v_repository_payload := jsonb_build_object(
      'id', v_repository.id,
      'source_type', v_repository.source_type,
      'url_or_path', v_repository.url_or_path,
      'default_branch', v_repository.default_branch,
      'subdirectory', v_repository.subdirectory,
      'token', v_repository_token
    );
  end if;

  return jsonb_build_object('job', jsonb_build_object(
    'id', v_job.id, 'test_run_id', v_job.test_run_id, 'test_case_id', v_job.test_case_id,
    'test_case_code', v_case.code, 'test_case_title', v_case.title, 'script_ref', v_job.script_ref,
    'attempt', v_job.attempt, 'max_attempts', v_job.max_attempts,
    'repository', v_repository_payload));
end; $$ language plpgsql security definer set search_path = public, vault, pg_temp, extensions;
revoke all on function public.poll_automation_job(text) from public;
grant execute on function public.poll_automation_job(text) to anon, authenticated;

-- === report_automation_job (fixed extensions.digest, removed integration_audit) ===
create or replace function public.report_automation_job(p_token text, p_job_id uuid, p_payload jsonb)
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
    update automation_jobs set status = 'queued', runner_id = null, started_at = null,
      artifacts = coalesce(p_payload->'artifacts', '[]'::jsonb), error_message = nullif(trim(p_payload->>'error_message'), '')
    where id = v_job.id;
    return jsonb_build_object('job_id', v_job.id, 'status', 'queued', 'requeued', true);
  end if;

  v_final_status := case when v_result_status = 'pass' then 'passed' else 'failed' end;
  update automation_jobs set status = v_final_status, finished_at = now(),
    artifacts = coalesce(p_payload->'artifacts', '[]'::jsonb), error_message = nullif(trim(p_payload->>'error_message'), '')
  where id = v_job.id;

  update test_results set status = v_result_status, executed_at = now(),
    notes = nullif(trim(p_payload->>'notes'), '')
  where test_run_id = v_job.test_run_id and test_case_id = v_job.test_case_id;

  return jsonb_build_object('job_id', v_job.id, 'status', v_final_status, 'requeued', false);
end; $$ language plpgsql security definer set search_path = public, extensions;
revoke all on function public.report_automation_job(text, uuid, jsonb) from public;
grant execute on function public.report_automation_job(text, uuid, jsonb) to anon, authenticated;

-- === poll_runner_diagnostic (stub — returns null, validates token) ===
create or replace function public.poll_runner_diagnostic(p_token text)
returns jsonb as $$
declare v_runner automation_runners;
begin
  select * into v_runner from automation_runners
  where active and token_hash = encode(extensions.digest(coalesce(p_token, ''), 'sha256'), 'hex');
  if not found then raise exception 'INVALID_RUNNER_TOKEN'; end if;
  update automation_runners set last_seen_at = now() where id = v_runner.id;
  return jsonb_build_object('job', null);
end; $$ language plpgsql security definer set search_path = public, extensions;
revoke all on function public.poll_runner_diagnostic(text) from public;
grant execute on function public.poll_runner_diagnostic(text) to anon, authenticated;

-- === append_automation_job_log ===
create or replace function public.append_automation_job_log(
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
revoke all on function public.append_automation_job_log(text, uuid, integer, integer, text, text) from public;
grant execute on function public.append_automation_job_log(text, uuid, integer, integer, text, text) to anon, authenticated;

-- === poll_automation_job_commands (stub — no step-through control yet) ===
create or replace function public.poll_automation_job_commands(p_token text, p_job_id uuid)
returns jsonb as $$
declare v_runner automation_runners;
begin
  select * into v_runner from automation_runners
  where active and token_hash = encode(extensions.digest(coalesce(p_token, ''), 'sha256'), 'hex');
  if not found then raise exception 'INVALID_RUNNER_TOKEN'; end if;
  if not exists (select 1 from automation_jobs where id = p_job_id and runner_id = v_runner.id) then
    raise exception 'JOB_NOT_CLAIMED_BY_RUNNER';
  end if;
  return jsonb_build_object('commands', '[]'::jsonb);
end; $$ language plpgsql security definer set search_path = public, extensions;
revoke all on function public.poll_automation_job_commands(text, uuid) from public;
grant execute on function public.poll_automation_job_commands(text, uuid) to anon, authenticated;
