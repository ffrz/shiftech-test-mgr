-- TestManager — consolidated final schema (Postgres dialect)
--
-- This migration represents the FINAL shape of the schema as of 2026-07-23,
-- ported from supabase/migrations/*.sql (19 historical incremental files).
-- It is NOT a replay of those files: obsolete intermediate shapes (e.g. the
-- original test_plan_cases.last_result column, issues.test_result_id 1:1 FK,
-- test_cases.target_role as free text) are intentionally omitted — we go
-- straight to the final column list.
--
-- Explicitly excluded vs. the Supabase source:
--   - Row Level Security (ALTER TABLE ... ENABLE ROW LEVEL SECURITY, CREATE POLICY)
--     -- authorization is reimplemented at the Go application layer instead.
--   - Supabase Realtime (`alter publication supabase_realtime add table ...`).
--   - Anything referencing Supabase Auth's `auth.users` schema or the
--     `handle_new_user()` trigger — `profiles` stands alone with its own
--     `id uuid primary key` (no longer FK'd to a Supabase-managed table); the
--     Go auth service creates profile rows itself.
--
-- New table not present in the Supabase schema, added for the Go backend's
-- own auth design: `refresh_tokens`.

create extension if not exists pgcrypto;

-- ============================================================================
-- Shared trigger function: keeps updated_at current on every UPDATE.
-- Attached to every table below that has an updated_at column, except pure
-- junction tables (test_plan_cases, test_case_tags, issue_test_results,
-- issue_tags) and tags, which are insert/delete-only and never updated in place.
-- ============================================================================

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ============================================================================
-- Auth / profiles (stands alone — no longer FK'd to Supabase auth.users)
-- ============================================================================

-- 1:1 application user profile. Go's auth service creates this row itself
-- (no DB trigger, unlike the old Supabase handle_new_user()).
create table profiles (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  full_name text,
  avatar_url text,
  role text not null default 'user' check (role in ('pending', 'user', 'admin')),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_profiles_updated_at before update on profiles
  for each row execute function set_updated_at();

-- Refresh tokens for the Go backend's own JWT-based auth (not present in the
-- Supabase source schema — required by the new backend's auth design).
create table refresh_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  token_hash varchar(255) not null,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_refresh_tokens_user on refresh_tokens (user_id);
create index idx_refresh_tokens_token_hash on refresh_tokens (token_hash);

-- ============================================================================
-- Core project tables
-- ============================================================================

-- Container for all test management data for a given effort.
create table projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  status text not null default 'active' check (status in ('active', 'inactive', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Case-insensitive uniqueness on project name.
create unique index idx_projects_name_lower on projects (lower(name));
create index idx_projects_status on projects (status);

create trigger trg_projects_updated_at before update on projects
  for each row execute function set_updated_at();

-- Per-project membership + role (manager/supervisor/tester/member) — access
-- control distinct from the global profiles.role.
create table project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('manager', 'supervisor', 'tester', 'member')),
  created_at timestamptz not null default now(),
  unique (project_id, user_id)
);

create index idx_project_members_project on project_members (project_id);
create index idx_project_members_user on project_members (user_id);

-- Master module list, one per project. Referenced by test_cases and issues.
create table modules (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  code text not null,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, name),
  unique (project_id, code)
);

create trigger trg_modules_updated_at before update on modules
  for each row execute function set_updated_at();

-- Master tag list, one per project. Insert/delete only — no updated_at.
create table tags (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (project_id, name)
);

-- Role WITHIN the application under test (e.g. Admin/Manager/Member), master
-- per project — distinct from profiles.role / project_members.role.
create table test_roles (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, name)
);

create trigger trg_test_roles_updated_at before update on test_roles
  for each row execute function set_updated_at();

-- Bookkeeping for auto-generated entity codes (MOD-####/TC-####/TP-####/
-- TR-####/ISS-####). Code GENERATION happens in the Go application service
-- layer, not in SQL (the source Postgres next_entity_code() function /
-- BEFORE INSERT triggers are intentionally not ported) — this table only
-- stores the per-(project, prefix) counter.
create table entity_code_sequences (
  project_id uuid not null references projects(id) on delete cascade,
  prefix text not null,
  "last_value" integer not null default 0,
  primary key (project_id, prefix)
);

-- ============================================================================
-- Test case tables
-- ============================================================================

-- Test Case: reusable, resultless template. Never stores pass/fail — that
-- always lives on test_results.
create table test_cases (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  module_id uuid references modules(id) on delete set null,
  code text not null,
  title text not null,
  objective text,
  preconditions text,
  steps text not null,
  expected_result text not null,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'critical')),
  status text not null default 'active' check (status in ('active', 'archived')),
  notes text,
  step_type text not null default 'simple' check (step_type in ('simple', 'detailed')),
  target_role_id uuid references test_roles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, code)
);

create index idx_test_cases_module on test_cases (module_id);
create index idx_test_cases_target_role on test_cases (target_role_id);

create trigger trg_test_cases_updated_at before update on test_cases
  for each row execute function set_updated_at();

-- Junction: many-to-many Test Case <-> Tag.
create table test_case_tags (
  test_case_id uuid not null references test_cases(id) on delete cascade,
  tag_id uuid not null references tags(id) on delete cascade,
  primary key (test_case_id, tag_id)
);

-- Template steps, only relevant when test_cases.step_type = 'detailed'.
create table test_case_steps (
  id uuid primary key default gen_random_uuid(),
  test_case_id uuid not null references test_cases(id) on delete cascade,
  step_number integer not null,
  action text not null,
  expected_result text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (test_case_id, step_number)
);

create index idx_test_case_steps_test_case on test_case_steps (test_case_id);

create trigger trg_test_case_steps_updated_at before update on test_case_steps
  for each row execute function set_updated_at();

-- ============================================================================
-- Test plan / test run / test result tables
-- ============================================================================

-- Test Plan: scope of test cases relevant for a given release/cycle.
create table test_plans (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  code text not null,
  name text not null,
  description text,
  status text not null default 'draft' check (status in ('draft', 'active', 'completed', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, code)
);

create trigger trg_test_plans_updated_at before update on test_plans
  for each row execute function set_updated_at();

-- Junction: which Test Cases are in scope for a Test Plan, plus execution
-- order. NO result column — results always live on test_results.
create table test_plan_cases (
  id uuid primary key default gen_random_uuid(),
  test_plan_id uuid not null references test_plans(id) on delete cascade,
  test_case_id uuid not null references test_cases(id) on delete cascade,
  "order" integer not null default 0,
  unique (test_plan_id, test_case_id)
);

-- Test Run: one execution session. project_id is direct and required;
-- test_plan_id is nullable (an "unplanned/custom" run has no plan).
create table test_runs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  test_plan_id uuid references test_plans(id) on delete cascade,
  code text not null,
  name text not null,
  status text not null default 'in_progress' check (status in ('in_progress', 'completed')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, code)
);

create index idx_test_runs_project on test_runs (project_id);
create index idx_test_runs_plan on test_runs (test_plan_id) where test_plan_id is not null;

create trigger trg_test_runs_updated_at before update on test_runs
  for each row execute function set_updated_at();

-- Test Result: one row per (Test Run x Test Case) — this is where the actual
-- pass/fail/skip/blocked/not_run result lives. Snapshot columns capture the
-- test case's content (and its plan order) at the moment the run started, so
-- history stays accurate even if the source test case is edited/archived later.
create table test_results (
  id uuid primary key default gen_random_uuid(),
  test_run_id uuid not null references test_runs(id) on delete cascade,
  test_case_id uuid not null references test_cases(id) on delete cascade,
  tester_id uuid references profiles(id) on delete set null,
  status text not null default 'not_run' check (status in ('pass', 'fail', 'skip', 'blocked', 'not_run')),
  executed_at timestamptz,
  notes text,
  test_case_code text,
  test_case_title text not null,
  test_case_objective text,
  test_case_preconditions text,
  test_case_steps text not null,
  test_case_expected_result text not null,
  test_case_priority text not null,
  "order" integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (test_run_id, test_case_id)
);

create index idx_test_results_run on test_results (test_run_id);
create index idx_test_results_case on test_results (test_case_id);
create index idx_test_results_run_order on test_results (test_run_id, "order");

create trigger trg_test_results_updated_at before update on test_results
  for each row execute function set_updated_at();

-- Per-step result, only relevant for Test Cases with step_type = 'detailed'.
create table test_result_steps (
  id uuid primary key default gen_random_uuid(),
  test_result_id uuid not null references test_results(id) on delete cascade,
  test_case_step_id uuid not null references test_case_steps(id) on delete cascade,
  status text not null default 'not_run' check (status in ('pass', 'fail', 'not_run')),
  actual_result text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (test_result_id, test_case_step_id)
);

create index idx_test_result_steps_test_result on test_result_steps (test_result_id);
create index idx_test_result_steps_test_case_step on test_result_steps (test_case_step_id);

create trigger trg_test_result_steps_updated_at before update on test_result_steps
  for each row execute function set_updated_at();

-- ============================================================================
-- Issue tracking tables
-- ============================================================================

-- Issue: project-level entity (not bound 1:1 to a single Test Result).
-- Linked to zero, one, or many Test Results via the issue_test_results junction.
create table issues (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  module_id uuid references modules(id) on delete set null,
  code text not null,
  type text not null default 'bug' check (type in ('bug', 'feature', 'improvement', 'task')),
  title text not null,
  description text,
  actual_result text,
  expected_result text,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'critical')),
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved', 'verified', 'closed')),
  assigned_to uuid references profiles(id) on delete set null,
  github_links jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, code)
);

create index idx_issues_project on issues (project_id);
create index idx_issues_module on issues (module_id);
create index idx_issues_type on issues (type);
create index idx_issues_status on issues (status);

create trigger trg_issues_updated_at before update on issues
  for each row execute function set_updated_at();

-- Junction: Issue <-> Test Result (N:M).
create table issue_test_results (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid not null references issues(id) on delete cascade,
  test_result_id uuid not null references test_results(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (issue_id, test_result_id)
);

create index idx_issue_test_results_issue on issue_test_results (issue_id);
create index idx_issue_test_results_test_result on issue_test_results (test_result_id);

-- Junction: Issue <-> Tag (N:M, reuses the `tags` table).
create table issue_tags (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid not null references issues(id) on delete cascade,
  tag_id uuid not null references tags(id) on delete cascade,
  unique (issue_id, tag_id)
);

create index idx_issue_tags_issue on issue_tags (issue_id);
create index idx_issue_tags_tag on issue_tags (tag_id);

-- File attachments on an Issue, via a swappable storage adapter.
create table attachments (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid not null references issues(id) on delete cascade,
  storage_provider text not null default 'internal',
  url text not null,
  file_name text not null,
  file_size integer,
  content_type text,
  created_at timestamptz not null default now()
);

create index idx_attachments_issue on attachments (issue_id);

-- ============================================================================
-- Test Case Template library (global, NOT project-scoped)
-- ============================================================================

-- Global, admin-managed library of reusable test case sets any project can
-- clone from — not scoped to a project.
create table test_case_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_test_case_templates_updated_at before update on test_case_templates
  for each row execute function set_updated_at();

-- Item within a template. module_name/tag_names are free text (not FKs) since
-- modules/tags are project-scoped while templates are not; resolved via
-- find-or-create at clone time.
create table test_case_template_items (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references test_case_templates(id) on delete cascade,
  module_name text,
  title text not null,
  objective text,
  preconditions text,
  steps text not null default '',
  expected_result text not null default '',
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'critical')),
  step_type text not null default 'simple' check (step_type in ('simple', 'detailed')),
  target_role text,
  tag_names text[] not null default '{}',
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_test_case_template_items_template on test_case_template_items (template_id, order_index);

create trigger trg_test_case_template_items_updated_at before update on test_case_template_items
  for each row execute function set_updated_at();

-- Step detail for template items with step_type = 'detailed'.
create table test_case_template_item_steps (
  id uuid primary key default gen_random_uuid(),
  template_item_id uuid not null references test_case_template_items(id) on delete cascade,
  step_number integer not null,
  action text not null,
  expected_result text,
  unique (template_item_id, step_number)
);
