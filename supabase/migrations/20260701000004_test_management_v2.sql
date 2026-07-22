-- Test Management v2 — run AFTER schema.sql, schema_auth.sql, schema_project_lifecycle.sql.
--
-- Reshapes the domain around the workflow documented in docs/PRD.md §Test Management Concept:
--   Project -> Module -> Test Case (template, no result)
--   Project -> Test Plan -> (which Test Cases are in scope)
--   Test Plan -> Test Run (one execution session, e.g. "Regression Test 2026-07-25")
--   Test Run -> Test Result (one row per Test Case executed in that run: PASS/FAIL/SKIP)
--   Test Result -> Issue (0..N issues filed against a FAIL result)
--   Test Case <-> Tag (many-to-many, cross-cutting labels distinct from Module)
--
-- PASS/FAIL/SKIP belongs to Test Result, never to Test Case — Test Case stays a reusable,
-- resultless template. Re-running the same plan creates a new Test Run, so history of every
-- past execution is preserved (no more overwriting a single "last_result" column).

-- ============================================================================
-- Module (master, scoped per project)
-- ============================================================================

create table if not exists modules (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, name)
);

create trigger trg_modules_updated_at before update on modules
  for each row execute function set_updated_at();

-- ============================================================================
-- Tag (master, scoped per project) + Test Case <-> Tag junction
-- ============================================================================

create table if not exists tags (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (project_id, name)
);

create table if not exists test_case_tags (
  test_case_id uuid not null references test_cases(id) on delete cascade,
  tag_id uuid not null references tags(id) on delete cascade,
  primary key (test_case_id, tag_id)
);

-- ============================================================================
-- Test Case: add module_id, objective, notes; status becomes active/archived
-- ============================================================================

alter table test_cases add column if not exists module_id uuid references modules(id) on delete set null;
alter table test_cases add column if not exists objective text;
alter table test_cases add column if not exists notes text;

-- Old status values (draft/ready/deprecated) map onto the new two-state model:
-- draft/ready -> active (still usable), deprecated -> archived (retired, hidden by default).
alter table test_cases drop constraint if exists test_cases_status_check;
update test_cases set status = 'active' where status in ('draft', 'ready');
update test_cases set status = 'archived' where status = 'deprecated';
alter table test_cases alter column status set default 'active';
alter table test_cases add constraint test_cases_status_check check (status in ('active', 'archived'));

create index if not exists idx_test_cases_module on test_cases (module_id);

-- ============================================================================
-- test_plan_cases: strip result columns — this table is now ONLY "which test
-- cases are in scope for this plan". Results live in test_results instead.
-- ============================================================================

alter table test_plan_cases drop column if exists last_result;
alter table test_plan_cases drop column if exists notes;

-- ============================================================================
-- Test Run: one execution session against a Test Plan
-- ============================================================================

create table if not exists test_runs (
  id uuid primary key default gen_random_uuid(),
  test_plan_id uuid not null references test_plans(id) on delete cascade,
  name text not null,
  status text not null default 'in_progress' check (status in ('in_progress', 'completed')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_test_runs_updated_at before update on test_runs
  for each row execute function set_updated_at();

create index if not exists idx_test_runs_plan on test_runs (test_plan_id);

-- ============================================================================
-- Test Result: one row per (Test Run x Test Case). This is where PASS/FAIL/SKIP lives.
-- ============================================================================

create table if not exists test_results (
  id uuid primary key default gen_random_uuid(),
  test_run_id uuid not null references test_runs(id) on delete cascade,
  test_case_id uuid not null references test_cases(id) on delete cascade,
  tester_id uuid references profiles(id) on delete set null,
  status text not null default 'not_run' check (status in ('pass', 'fail', 'skip', 'blocked', 'not_run')),
  executed_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (test_run_id, test_case_id)
);

create trigger trg_test_results_updated_at before update on test_results
  for each row execute function set_updated_at();

create index if not exists idx_test_results_run on test_results (test_run_id);
create index if not exists idx_test_results_case on test_results (test_case_id);

-- ============================================================================
-- Issue: 0..N per Test Result (1:many — a single FAIL can spawn multiple
-- distinct tracked issues).
-- ============================================================================

create table if not exists issues (
  id uuid primary key default gen_random_uuid(),
  test_result_id uuid not null references test_results(id) on delete cascade,
  title text not null,
  description text,
  actual_result text,
  expected_result text,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'critical')),
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved', 'verified', 'closed')),
  assigned_to uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_issues_updated_at before update on issues
  for each row execute function set_updated_at();

create index if not exists idx_issues_test_result on issues (test_result_id);
create index if not exists idx_issues_status on issues (status);

-- ============================================================================
-- RLS — same "approved users only" policy shape as every other domain table
-- ============================================================================

alter table modules enable row level security;
alter table tags enable row level security;
alter table test_case_tags enable row level security;
alter table test_runs enable row level security;
alter table test_results enable row level security;
alter table issues enable row level security;

create policy "approved users - modules" on modules for all
  using (is_approved()) with check (is_approved());
create policy "approved users - tags" on tags for all
  using (is_approved()) with check (is_approved());
create policy "approved users - test_case_tags" on test_case_tags for all
  using (is_approved()) with check (is_approved());
create policy "approved users - test_runs" on test_runs for all
  using (is_approved()) with check (is_approved());
create policy "approved users - test_results" on test_results for all
  using (is_approved()) with check (is_approved());
create policy "approved users - issues" on issues for all
  using (is_approved()) with check (is_approved());
