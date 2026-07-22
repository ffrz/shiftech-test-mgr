-- Structured Test Case Steps — adds an optional "detailed" mode to Test Case, where the
-- free-text `steps` field is replaced by a normalized list of steps (action + expected
-- result per step), and each step gets its own pass/fail result per Test Run execution.
-- Run AFTER schema_test_case_steps prerequisite: schema_project_roles.sql.

alter table test_cases add column if not exists step_type text not null default 'simple' check (step_type in ('simple', 'detailed'));

-- === Template steps (only relevant when test_cases.step_type = 'detailed') ===

create table if not exists test_case_steps (
  id uuid primary key default gen_random_uuid(),
  test_case_id uuid not null references test_cases(id) on delete cascade,
  step_number integer not null,
  action text not null,
  expected_result text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (test_case_id, step_number)
);

create trigger trg_test_case_steps_updated_at before update on test_case_steps
  for each row execute function set_updated_at();

create index if not exists idx_test_case_steps_test_case on test_case_steps (test_case_id);

-- === Per-step results, one row per (test_result x test_case_step) ===

create table if not exists test_result_steps (
  id uuid primary key default gen_random_uuid(),
  test_result_id uuid not null references test_results(id) on delete cascade,
  test_case_step_id uuid not null references test_case_steps(id) on delete cascade,
  status text not null default 'not_run' check (status in ('pass', 'fail', 'not_run')),
  actual_result text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (test_result_id, test_case_step_id)
);

create trigger trg_test_result_steps_updated_at before update on test_result_steps
  for each row execute function set_updated_at();

create index if not exists idx_test_result_steps_test_result on test_result_steps (test_result_id);
create index if not exists idx_test_result_steps_test_case_step on test_result_steps (test_case_step_id);

-- === RLS — mirror the project-scoped access pattern from schema_project_roles.sql ===

alter table test_case_steps enable row level security;
alter table test_result_steps enable row level security;

create policy "project access - test_case_steps select" on test_case_steps for select
  using (has_project_access((select project_id from test_cases where id = test_case_id)));
create policy "project content editors - test_case_steps insert" on test_case_steps for insert
  with check (can_edit_project_content((select project_id from test_cases where id = test_case_id)));
create policy "project content editors - test_case_steps update" on test_case_steps for update
  using (can_edit_project_content((select project_id from test_cases where id = test_case_id)))
  with check (can_edit_project_content((select project_id from test_cases where id = test_case_id)));
create policy "project content deleters - test_case_steps delete" on test_case_steps for delete
  using (can_delete_project_content((select project_id from test_cases where id = test_case_id)));

create policy "project access - test_result_steps select" on test_result_steps for select
  using (has_project_access((
    select tp.project_id from test_results res
    join test_runs run on run.id = res.test_run_id
    join test_plans tp on tp.id = run.test_plan_id
    where res.id = test_result_id
  )));
create policy "test runners - test_result_steps insert" on test_result_steps for insert
  with check (can_run_tests((
    select tp.project_id from test_results res
    join test_runs run on run.id = res.test_run_id
    join test_plans tp on tp.id = run.test_plan_id
    where res.id = test_result_id
  )));
create policy "test runners - test_result_steps update" on test_result_steps for update
  using (can_run_tests((
    select tp.project_id from test_results res
    join test_runs run on run.id = res.test_run_id
    join test_plans tp on tp.id = run.test_plan_id
    where res.id = test_result_id
  )))
  with check (can_run_tests((
    select tp.project_id from test_results res
    join test_runs run on run.id = res.test_run_id
    join test_plans tp on tp.id = run.test_plan_id
    where res.id = test_result_id
  )));
create policy "project content deleters - test_result_steps delete" on test_result_steps for delete
  using (can_delete_project_content((
    select tp.project_id from test_results res
    join test_runs run on run.id = res.test_run_id
    join test_plans tp on tp.id = run.test_plan_id
    where res.id = test_result_id
  )));
