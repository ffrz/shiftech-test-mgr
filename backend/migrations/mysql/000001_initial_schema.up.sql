-- TestManager — consolidated final schema (MySQL dialect)
--
-- This migration represents the FINAL shape of the schema as of 2026-07-23,
-- ported from supabase/migrations/*.sql (19 historical incremental files).
-- It is NOT a replay of those files: obsolete intermediate shapes (e.g. the
-- original test_plan_cases.last_result column, issues.test_result_id 1:1 FK,
-- test_cases.target_role as free text) are intentionally omitted — we go
-- straight to the final column list.
--
-- Explicitly excluded vs. the Supabase source:
--   - Row Level Security (Postgres-only concept, no MySQL equivalent) —
--     authorization is reimplemented at the Go application layer instead.
--   - Supabase Realtime (`alter publication supabase_realtime add table ...`).
--   - Anything referencing Supabase Auth's `auth.users` schema or the
--     `handle_new_user()` trigger — `profiles` stands alone with its own
--     `id CHAR(36) PRIMARY KEY`; the Go auth service creates profile rows itself.
--
-- New table not present in the Supabase schema, added for the Go backend's
-- own auth design: `refresh_tokens`.
--
-- UUID primary keys: CHAR(36), no DB-side default (MySQL has no native uuid
-- type / gen_random_uuid()) — the application (GORM BeforeCreate hook)
-- generates UUIDs before insert.
--
-- updated_at: uses `TIMESTAMP ... ON UPDATE CURRENT_TIMESTAMP` directly on the
-- column (no trigger needed, unlike Postgres). Junction tables and `tags`
-- (insert/delete-only) skip updated_at entirely, matching the source schema.

-- ============================================================================
-- Auth / profiles (stands alone — no longer FK'd to Supabase auth.users)
-- ============================================================================

create table profiles (
  id char(36) primary key,
  email varchar(255) not null,
  full_name varchar(255),
  avatar_url text,
  role varchar(20) not null default 'user' check (role in ('pending', 'user', 'admin')),
  deleted_at timestamp null,
  created_at timestamp not null default current_timestamp,
  updated_at timestamp not null default current_timestamp on update current_timestamp
) engine=innodb character set utf8mb4 collate utf8mb4_unicode_ci;

-- Refresh tokens for the Go backend's own JWT-based auth (not present in the
-- Supabase source schema — required by the new backend's auth design).
create table refresh_tokens (
  id char(36) primary key,
  user_id char(36) not null,
  token_hash varchar(255) not null,
  expires_at timestamp not null,
  revoked_at timestamp null,
  created_at timestamp not null default current_timestamp,
  constraint fk_refresh_tokens_user foreign key (user_id) references profiles(id) on delete cascade
) engine=innodb character set utf8mb4 collate utf8mb4_unicode_ci;

create index idx_refresh_tokens_user on refresh_tokens (user_id);
create index idx_refresh_tokens_token_hash on refresh_tokens (token_hash);

-- ============================================================================
-- Core project tables
-- ============================================================================

-- Container for all test management data for a given effort. name UNIQUE
-- relies on utf8mb4_unicode_ci collation for case-insensitive uniqueness
-- (Postgres uses a functional lower(name) index instead).
create table projects (
  id char(36) primary key,
  name varchar(255) not null,
  description text,
  status varchar(20) not null default 'active' check (status in ('active', 'inactive', 'archived')),
  created_at timestamp not null default current_timestamp,
  updated_at timestamp not null default current_timestamp on update current_timestamp,
  unique (name)
) engine=innodb character set utf8mb4 collate utf8mb4_unicode_ci;

create index idx_projects_status on projects (status);

-- Per-project membership + role (manager/supervisor/tester/member) — access
-- control distinct from the global profiles.role.
create table project_members (
  id char(36) primary key,
  project_id char(36) not null,
  user_id char(36) not null,
  role varchar(20) not null default 'member' check (role in ('manager', 'supervisor', 'tester', 'member')),
  created_at timestamp not null default current_timestamp,
  unique (project_id, user_id),
  constraint fk_project_members_project foreign key (project_id) references projects(id) on delete cascade,
  constraint fk_project_members_user foreign key (user_id) references profiles(id) on delete cascade
) engine=innodb character set utf8mb4 collate utf8mb4_unicode_ci;

create index idx_project_members_project on project_members (project_id);
create index idx_project_members_user on project_members (user_id);

-- Master module list, one per project. Referenced by test_cases and issues.
create table modules (
  id char(36) primary key,
  project_id char(36) not null,
  code varchar(50) not null,
  name varchar(255) not null,
  created_at timestamp not null default current_timestamp,
  updated_at timestamp not null default current_timestamp on update current_timestamp,
  unique (project_id, name),
  unique (project_id, code),
  constraint fk_modules_project foreign key (project_id) references projects(id) on delete cascade
) engine=innodb character set utf8mb4 collate utf8mb4_unicode_ci;

-- Master tag list, one per project. Insert/delete only — no updated_at.
create table tags (
  id char(36) primary key,
  project_id char(36) not null,
  name varchar(255) not null,
  created_at timestamp not null default current_timestamp,
  unique (project_id, name),
  constraint fk_tags_project foreign key (project_id) references projects(id) on delete cascade
) engine=innodb character set utf8mb4 collate utf8mb4_unicode_ci;

-- Role WITHIN the application under test (e.g. Admin/Manager/Member), master
-- per project — distinct from profiles.role / project_members.role.
create table test_roles (
  id char(36) primary key,
  project_id char(36) not null,
  name varchar(255) not null,
  created_at timestamp not null default current_timestamp,
  updated_at timestamp not null default current_timestamp on update current_timestamp,
  unique (project_id, name),
  constraint fk_test_roles_project foreign key (project_id) references projects(id) on delete cascade
) engine=innodb character set utf8mb4 collate utf8mb4_unicode_ci;

-- Bookkeeping for auto-generated entity codes (MOD-####/TC-####/TP-####/
-- TR-####/ISS-####). Code GENERATION happens in the Go application service
-- layer, not in SQL — this table only stores the per-(project, prefix) counter.
create table entity_code_sequences (
  project_id char(36) not null,
  prefix varchar(20) not null,
  `last_value` int not null default 0,
  primary key (project_id, prefix),
  constraint fk_entity_code_sequences_project foreign key (project_id) references projects(id) on delete cascade
) engine=innodb character set utf8mb4 collate utf8mb4_unicode_ci;

-- ============================================================================
-- Test case tables
-- ============================================================================

-- Test Case: reusable, resultless template. Never stores pass/fail — that
-- always lives on test_results.
create table test_cases (
  id char(36) primary key,
  project_id char(36) not null,
  module_id char(36),
  code varchar(50) not null,
  title varchar(500) not null,
  objective text,
  preconditions text,
  steps text not null,
  expected_result text not null,
  priority varchar(20) not null default 'medium' check (priority in ('low', 'medium', 'high', 'critical')),
  status varchar(20) not null default 'active' check (status in ('active', 'archived')),
  notes text,
  step_type varchar(20) not null default 'simple' check (step_type in ('simple', 'detailed')),
  target_role_id char(36),
  created_at timestamp not null default current_timestamp,
  updated_at timestamp not null default current_timestamp on update current_timestamp,
  unique (project_id, code),
  constraint fk_test_cases_project foreign key (project_id) references projects(id) on delete cascade,
  constraint fk_test_cases_module foreign key (module_id) references modules(id) on delete set null,
  constraint fk_test_cases_target_role foreign key (target_role_id) references test_roles(id) on delete set null
) engine=innodb character set utf8mb4 collate utf8mb4_unicode_ci;

create index idx_test_cases_module on test_cases (module_id);
create index idx_test_cases_target_role on test_cases (target_role_id);

-- Junction: many-to-many Test Case <-> Tag.
create table test_case_tags (
  test_case_id char(36) not null,
  tag_id char(36) not null,
  primary key (test_case_id, tag_id),
  constraint fk_test_case_tags_case foreign key (test_case_id) references test_cases(id) on delete cascade,
  constraint fk_test_case_tags_tag foreign key (tag_id) references tags(id) on delete cascade
) engine=innodb character set utf8mb4 collate utf8mb4_unicode_ci;

-- Template steps, only relevant when test_cases.step_type = 'detailed'.
create table test_case_steps (
  id char(36) primary key,
  test_case_id char(36) not null,
  step_number int not null,
  action text not null,
  expected_result text,
  created_at timestamp not null default current_timestamp,
  updated_at timestamp not null default current_timestamp on update current_timestamp,
  unique (test_case_id, step_number),
  constraint fk_test_case_steps_case foreign key (test_case_id) references test_cases(id) on delete cascade
) engine=innodb character set utf8mb4 collate utf8mb4_unicode_ci;

create index idx_test_case_steps_test_case on test_case_steps (test_case_id);

-- ============================================================================
-- Test plan / test run / test result tables
-- ============================================================================

-- Test Plan: scope of test cases relevant for a given release/cycle.
create table test_plans (
  id char(36) primary key,
  project_id char(36) not null,
  code varchar(50) not null,
  name varchar(255) not null,
  description text,
  status varchar(20) not null default 'draft' check (status in ('draft', 'active', 'completed', 'archived')),
  created_at timestamp not null default current_timestamp,
  updated_at timestamp not null default current_timestamp on update current_timestamp,
  unique (project_id, code),
  constraint fk_test_plans_project foreign key (project_id) references projects(id) on delete cascade
) engine=innodb character set utf8mb4 collate utf8mb4_unicode_ci;

-- Junction: which Test Cases are in scope for a Test Plan, plus execution
-- order. NO result column — results always live on test_results.
create table test_plan_cases (
  id char(36) primary key,
  test_plan_id char(36) not null,
  test_case_id char(36) not null,
  `order` int not null default 0,
  unique (test_plan_id, test_case_id),
  constraint fk_test_plan_cases_plan foreign key (test_plan_id) references test_plans(id) on delete cascade,
  constraint fk_test_plan_cases_case foreign key (test_case_id) references test_cases(id) on delete cascade
) engine=innodb character set utf8mb4 collate utf8mb4_unicode_ci;

-- Test Run: one execution session. project_id is direct and required;
-- test_plan_id is nullable (an "unplanned/custom" run has no plan).
create table test_runs (
  id char(36) primary key,
  project_id char(36) not null,
  test_plan_id char(36),
  code varchar(50) not null,
  name varchar(255) not null,
  status varchar(20) not null default 'in_progress' check (status in ('in_progress', 'completed')),
  started_at timestamp not null default current_timestamp,
  completed_at timestamp null,
  notes text,
  created_at timestamp not null default current_timestamp,
  updated_at timestamp not null default current_timestamp on update current_timestamp,
  unique (project_id, code),
  constraint fk_test_runs_project foreign key (project_id) references projects(id) on delete cascade,
  constraint fk_test_runs_plan foreign key (test_plan_id) references test_plans(id) on delete cascade
) engine=innodb character set utf8mb4 collate utf8mb4_unicode_ci;

create index idx_test_runs_project on test_runs (project_id);
create index idx_test_runs_plan on test_runs (test_plan_id);

-- Test Result: one row per (Test Run x Test Case) — this is where the actual
-- pass/fail/skip/blocked/not_run result lives. Snapshot columns capture the
-- test case's content (and its plan order) at the moment the run started, so
-- history stays accurate even if the source test case is edited/archived later.
create table test_results (
  id char(36) primary key,
  test_run_id char(36) not null,
  test_case_id char(36) not null,
  tester_id char(36),
  status varchar(20) not null default 'not_run' check (status in ('pass', 'fail', 'skip', 'blocked', 'not_run')),
  executed_at timestamp null,
  notes text,
  test_case_code varchar(50),
  test_case_title varchar(500) not null,
  test_case_objective text,
  test_case_preconditions text,
  test_case_steps text not null,
  test_case_expected_result text not null,
  test_case_priority varchar(20) not null,
  `order` int not null default 0,
  created_at timestamp not null default current_timestamp,
  updated_at timestamp not null default current_timestamp on update current_timestamp,
  unique (test_run_id, test_case_id),
  constraint fk_test_results_run foreign key (test_run_id) references test_runs(id) on delete cascade,
  constraint fk_test_results_case foreign key (test_case_id) references test_cases(id) on delete cascade,
  constraint fk_test_results_tester foreign key (tester_id) references profiles(id) on delete set null
) engine=innodb character set utf8mb4 collate utf8mb4_unicode_ci;

create index idx_test_results_run on test_results (test_run_id);
create index idx_test_results_case on test_results (test_case_id);
create index idx_test_results_run_order on test_results (test_run_id, `order`);

-- Per-step result, only relevant for Test Cases with step_type = 'detailed'.
create table test_result_steps (
  id char(36) primary key,
  test_result_id char(36) not null,
  test_case_step_id char(36) not null,
  status varchar(20) not null default 'not_run' check (status in ('pass', 'fail', 'not_run')),
  actual_result text,
  created_at timestamp not null default current_timestamp,
  updated_at timestamp not null default current_timestamp on update current_timestamp,
  unique (test_result_id, test_case_step_id),
  constraint fk_test_result_steps_result foreign key (test_result_id) references test_results(id) on delete cascade,
  constraint fk_test_result_steps_step foreign key (test_case_step_id) references test_case_steps(id) on delete cascade
) engine=innodb character set utf8mb4 collate utf8mb4_unicode_ci;

create index idx_test_result_steps_test_result on test_result_steps (test_result_id);
create index idx_test_result_steps_test_case_step on test_result_steps (test_case_step_id);

-- ============================================================================
-- Issue tracking tables
-- ============================================================================

-- Issue: project-level entity (not bound 1:1 to a single Test Result).
-- Linked to zero, one, or many Test Results via the issue_test_results junction.
create table issues (
  id char(36) primary key,
  project_id char(36) not null,
  module_id char(36),
  code varchar(50) not null,
  type varchar(20) not null default 'bug' check (type in ('bug', 'feature', 'improvement', 'task')),
  title varchar(500) not null,
  description text,
  actual_result text,
  expected_result text,
  priority varchar(20) not null default 'medium' check (priority in ('low', 'medium', 'high', 'critical')),
  status varchar(20) not null default 'open' check (status in ('open', 'in_progress', 'resolved', 'verified', 'closed')),
  assigned_to char(36),
  github_links json not null default (json_array()),
  created_at timestamp not null default current_timestamp,
  updated_at timestamp not null default current_timestamp on update current_timestamp,
  unique (project_id, code),
  constraint fk_issues_project foreign key (project_id) references projects(id) on delete cascade,
  constraint fk_issues_module foreign key (module_id) references modules(id) on delete set null,
  constraint fk_issues_assigned_to foreign key (assigned_to) references profiles(id) on delete set null
) engine=innodb character set utf8mb4 collate utf8mb4_unicode_ci;

create index idx_issues_project on issues (project_id);
create index idx_issues_module on issues (module_id);
create index idx_issues_type on issues (type);
create index idx_issues_status on issues (status);

-- Junction: Issue <-> Test Result (N:M).
create table issue_test_results (
  id char(36) primary key,
  issue_id char(36) not null,
  test_result_id char(36) not null,
  created_at timestamp not null default current_timestamp,
  unique (issue_id, test_result_id),
  constraint fk_issue_test_results_issue foreign key (issue_id) references issues(id) on delete cascade,
  constraint fk_issue_test_results_result foreign key (test_result_id) references test_results(id) on delete cascade
) engine=innodb character set utf8mb4 collate utf8mb4_unicode_ci;

create index idx_issue_test_results_issue on issue_test_results (issue_id);
create index idx_issue_test_results_test_result on issue_test_results (test_result_id);

-- Junction: Issue <-> Tag (N:M, reuses the `tags` table).
create table issue_tags (
  id char(36) primary key,
  issue_id char(36) not null,
  tag_id char(36) not null,
  unique (issue_id, tag_id),
  constraint fk_issue_tags_issue foreign key (issue_id) references issues(id) on delete cascade,
  constraint fk_issue_tags_tag foreign key (tag_id) references tags(id) on delete cascade
) engine=innodb character set utf8mb4 collate utf8mb4_unicode_ci;

create index idx_issue_tags_issue on issue_tags (issue_id);
create index idx_issue_tags_tag on issue_tags (tag_id);

-- File attachments on an Issue, via a swappable storage adapter.
create table attachments (
  id char(36) primary key,
  issue_id char(36) not null,
  storage_provider varchar(50) not null default 'internal',
  url text not null,
  file_name varchar(500) not null,
  file_size int,
  content_type varchar(255),
  created_at timestamp not null default current_timestamp,
  constraint fk_attachments_issue foreign key (issue_id) references issues(id) on delete cascade
) engine=innodb character set utf8mb4 collate utf8mb4_unicode_ci;

create index idx_attachments_issue on attachments (issue_id);

-- ============================================================================
-- Test Case Template library (global, NOT project-scoped)
-- ============================================================================

-- Global, admin-managed library of reusable test case sets any project can
-- clone from — not scoped to a project.
create table test_case_templates (
  id char(36) primary key,
  name varchar(255) not null,
  description text,
  created_at timestamp not null default current_timestamp,
  updated_at timestamp not null default current_timestamp on update current_timestamp
) engine=innodb character set utf8mb4 collate utf8mb4_unicode_ci;

-- Item within a template. module_name/tag_names are free text (not FKs) since
-- modules/tags are project-scoped while templates are not; resolved via
-- find-or-create at clone time. tag_names stored as JSON (MySQL has no native
-- text[] array type).
create table test_case_template_items (
  id char(36) primary key,
  template_id char(36) not null,
  module_name varchar(255),
  title varchar(500) not null,
  objective text,
  preconditions text,
  steps text not null,
  expected_result text not null,
  priority varchar(20) not null default 'medium' check (priority in ('low', 'medium', 'high', 'critical')),
  step_type varchar(20) not null default 'simple' check (step_type in ('simple', 'detailed')),
  target_role varchar(255),
  tag_names json not null default (json_array()),
  order_index int not null default 0,
  created_at timestamp not null default current_timestamp,
  updated_at timestamp not null default current_timestamp on update current_timestamp,
  constraint fk_test_case_template_items_template foreign key (template_id) references test_case_templates(id) on delete cascade
) engine=innodb character set utf8mb4 collate utf8mb4_unicode_ci;

create index idx_test_case_template_items_template on test_case_template_items (template_id, order_index);

-- Step detail for template items with step_type = 'detailed'.
create table test_case_template_item_steps (
  id char(36) primary key,
  template_item_id char(36) not null,
  step_number int not null,
  action text not null,
  expected_result text,
  unique (template_item_id, step_number),
  constraint fk_test_case_template_item_steps_item foreign key (template_item_id) references test_case_template_items(id) on delete cascade
) engine=innodb character set utf8mb4 collate utf8mb4_unicode_ci;
