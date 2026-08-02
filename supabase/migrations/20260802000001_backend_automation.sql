-- Backend (Go MCP) automation tables — Playwright Local Runner orchestration.
-- Ported from NvlFr-testify schema_024_p3_automation.sql, adapted to this
-- project's schema conventions:
--   * created_by FK -> profiles(id) (identity split: profiles = public)
--   * RLS helpers are the local ones (has_project_access /
--     can_edit_project_content / can_delete_project_content), NOT
--     is_project_manager
--   * the runner/queue RPCs (create_automation_runner, enqueue_automation_jobs,
--     poll/report/heartbeat/cancel) are intentionally NOT ported — the Go MCP
--     server talks to Postgres directly over a privileged connection and does
--     not need security-definer RPCs; runner token auth stays server-side.
--
-- Model: browsers never run on the central server. A local runner installed on
-- the tester/on-prem machine connects outbound, pulls queued jobs, executes
-- Playwright locally, and reports results back. The central server only stores
-- script mappings, enqueues jobs, and records results.

-- Registered local runners. A runner belongs to one project and advertises the
-- capabilities (labels) it can execute, e.g. {chromium, staging, vpn-internal}.
create table if not exists automation_runners (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null,
  labels text[] not null default '{}',
  token_prefix text not null,
  token_hash text not null,
  active boolean not null default true,
  last_seen_at timestamptz,
  created_by uuid not null references profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint automation_runners_name_not_blank check (length(trim(name)) between 1 and 120),
  constraint automation_runners_token_prefix check (token_prefix ~ '^tm_[a-zA-Z0-9]{8}$')
);
create index if not exists idx_automation_runners_project on automation_runners(project_id, active);
create unique index if not exists idx_automation_runners_token_hash on automation_runners(token_hash);

-- Mapping Test Case <-> automation script. A REFERENCE (path/spec id) is
-- stored, never the executable script body — the runner resolves and runs it
-- locally.
create table if not exists automation_scripts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  test_case_id uuid not null references test_cases(id) on delete cascade,
  script_ref text not null,
  runner_labels text[] not null default '{}',
  created_by uuid not null references profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint automation_scripts_ref_not_blank check (length(trim(script_ref)) between 1 and 500),
  unique (test_case_id)
);
create index if not exists idx_automation_scripts_project on automation_scripts(project_id);
create index if not exists idx_automation_scripts_case on automation_scripts(test_case_id);

-- Automation jobs are the unit of execution pulled by runners. Each job belongs
-- to a Test Run (the session) and targets one Test Case; its result lands in
-- the corresponding test_results row. Artifacts hold metadata/URLs only.
create table if not exists automation_jobs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  test_run_id uuid not null references test_runs(id) on delete cascade,
  test_case_id uuid not null references test_cases(id) on delete cascade,
  script_ref text not null,
  required_labels text[] not null default '{}',
  status text not null default 'queued' check (status in ('queued', 'running', 'passed', 'failed', 'canceled')),
  attempt integer not null default 0,
  max_attempts integer not null default 1,
  runner_id uuid references automation_runners(id) on delete set null,
  artifacts jsonb not null default '[]',
  error_message text,
  queued_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  created_by uuid not null references profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint automation_jobs_max_attempts check (max_attempts between 1 and 10)
);
create index if not exists idx_automation_jobs_project on automation_jobs(project_id, status);
create index if not exists idx_automation_jobs_run on automation_jobs(test_run_id);
create index if not exists idx_automation_jobs_queue on automation_jobs(status, queued_at) where status = 'queued';

drop trigger if exists trg_automation_runners_updated_at on automation_runners;
create trigger trg_automation_runners_updated_at before update on automation_runners
  for each row execute function set_updated_at();
drop trigger if exists trg_automation_scripts_updated_at on automation_scripts;
create trigger trg_automation_scripts_updated_at before update on automation_scripts
  for each row execute function set_updated_at();
drop trigger if exists trg_automation_jobs_updated_at on automation_jobs;
create trigger trg_automation_jobs_updated_at before update on automation_jobs
  for each row execute function set_updated_at();

-- Keep script mapping consistent: the mapped Test Case must belong to project_id.
create or replace function validate_automation_script_case()
returns trigger as $$
begin
  if not exists (select 1 from test_cases where id = new.test_case_id and project_id = new.project_id) then
    raise exception 'CASE_PROJECT_MISMATCH';
  end if;
  return new;
end; $$ language plpgsql security definer set search_path = public;
drop trigger if exists trg_automation_script_case on automation_scripts;
create trigger trg_automation_script_case before insert or update of project_id, test_case_id on automation_scripts
  for each row execute function validate_automation_script_case();

revoke execute on function public.validate_automation_script_case() from public, anon, authenticated;

alter table automation_runners enable row level security;
alter table automation_scripts enable row level security;
alter table automation_jobs enable row level security;

-- Runners: project members read; managers manage. Token hash is never selected
-- by the client repository (column list excludes it).
drop policy if exists "project access - automation runners select" on automation_runners;
create policy "project access - automation runners select" on automation_runners for select
  using (has_project_access(project_id));
drop policy if exists "project managers - automation runners insert" on automation_runners;
create policy "project managers - automation runners insert" on automation_runners for insert
  with check (can_edit_project_content(project_id) and created_by = auth.uid());
drop policy if exists "project managers - automation runners update" on automation_runners;
create policy "project managers - automation runners update" on automation_runners for update
  using (can_edit_project_content(project_id)) with check (can_edit_project_content(project_id));
drop policy if exists "project managers - automation runners delete" on automation_runners;
create policy "project managers - automation runners delete" on automation_runners for delete
  using (can_delete_project_content(project_id));

-- Script mappings: read by members, managed by editors.
drop policy if exists "project access - automation scripts select" on automation_scripts;
create policy "project access - automation scripts select" on automation_scripts for select
  using (has_project_access(project_id));
drop policy if exists "project editors - automation scripts insert" on automation_scripts;
create policy "project editors - automation scripts insert" on automation_scripts for insert
  with check (can_edit_project_content(project_id) and created_by = auth.uid());
drop policy if exists "project editors - automation scripts update" on automation_scripts;
create policy "project editors - automation scripts update" on automation_scripts for update
  using (can_edit_project_content(project_id)) with check (can_edit_project_content(project_id));
drop policy if exists "project editors - automation scripts delete" on automation_scripts;
create policy "project editors - automation scripts delete" on automation_scripts for delete
  using (can_edit_project_content(project_id));

-- Jobs: read-only for clients. All writes are server-controlled (Go MCP) and
-- go through the privileged backend connection, so no insert/update/delete
-- policies are needed for PostgREST clients.
drop policy if exists "project access - automation jobs select" on automation_jobs;
create policy "project access - automation jobs select" on automation_jobs for select
  using (has_project_access(project_id));
