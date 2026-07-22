-- Project Roles (RBAC) — run AFTER schema_project_members.sql.
--
-- Expands project_members.role from 2 values (manager/member) to 4:
--   manager    — full access within the project, except delete (archive only)
--   supervisor — can create/edit everything, cannot delete anything, no access to project settings
--   tester     — can run test runs and manage issues (create/edit), cannot delete anything
--   member     — read-only (base role)
-- Admins (profiles.role = 'admin') always have full access regardless of project_members.
--
-- Non-admin users can never manage global users or hard-delete a project — that stays
-- admin-only via existing "admins - projects delete" policy in schema_project_members.sql.

alter table project_members drop constraint if exists project_members_role_check;
alter table project_members add constraint project_members_role_check
  check (role in ('manager', 'supervisor', 'tester', 'member'));

-- === Capability helpers (security definer, short-circuit on is_admin()) ===

create or replace function can_edit_project_content(p_project_id uuid)
returns boolean as $$
  select is_admin() or exists (
    select 1 from project_members
    where project_id = p_project_id and user_id = auth.uid() and role in ('manager', 'supervisor')
  );
$$ language sql security definer set search_path = public stable;

create or replace function can_delete_project_content(p_project_id uuid)
returns boolean as $$
  select is_admin() or exists (
    select 1 from project_members
    where project_id = p_project_id and user_id = auth.uid() and role = 'manager'
  );
$$ language sql security definer set search_path = public stable;

create or replace function can_run_tests(p_project_id uuid)
returns boolean as $$
  select is_admin() or exists (
    select 1 from project_members
    where project_id = p_project_id and user_id = auth.uid() and role in ('manager', 'tester')
  );
$$ language sql security definer set search_path = public stable;

create or replace function can_manage_issues(p_project_id uuid)
returns boolean as $$
  select is_admin() or exists (
    select 1 from project_members
    where project_id = p_project_id and user_id = auth.uid() and role in ('manager', 'tester')
  );
$$ language sql security definer set search_path = public stable;

-- === Split "for all" policies into per-operation policies ===

drop policy if exists "project access - test_plans" on test_plans;
create policy "project access - test_plans select" on test_plans for select
  using (has_project_access(project_id));
create policy "project content editors - test_plans insert" on test_plans for insert
  with check (can_edit_project_content(project_id));
create policy "project content editors - test_plans update" on test_plans for update
  using (can_edit_project_content(project_id)) with check (can_edit_project_content(project_id));
create policy "project content deleters - test_plans delete" on test_plans for delete
  using (can_delete_project_content(project_id));

drop policy if exists "project access - test_cases" on test_cases;
create policy "project access - test_cases select" on test_cases for select
  using (has_project_access(project_id));
create policy "project content editors - test_cases insert" on test_cases for insert
  with check (can_edit_project_content(project_id));
create policy "project content editors - test_cases update" on test_cases for update
  using (can_edit_project_content(project_id)) with check (can_edit_project_content(project_id));
create policy "project content deleters - test_cases delete" on test_cases for delete
  using (can_delete_project_content(project_id));

drop policy if exists "project access - test_plan_cases" on test_plan_cases;
create policy "project access - test_plan_cases select" on test_plan_cases for select
  using (has_project_access((select project_id from test_plans where id = test_plan_id)));
create policy "project content editors - test_plan_cases insert" on test_plan_cases for insert
  with check (can_edit_project_content((select project_id from test_plans where id = test_plan_id)));
create policy "project content editors - test_plan_cases update" on test_plan_cases for update
  using (can_edit_project_content((select project_id from test_plans where id = test_plan_id)))
  with check (can_edit_project_content((select project_id from test_plans where id = test_plan_id)));
create policy "project content deleters - test_plan_cases delete" on test_plan_cases for delete
  using (can_delete_project_content((select project_id from test_plans where id = test_plan_id)));

drop policy if exists "project access - modules" on modules;
create policy "project access - modules select" on modules for select
  using (has_project_access(project_id));
create policy "project content editors - modules insert" on modules for insert
  with check (can_edit_project_content(project_id));
create policy "project content editors - modules update" on modules for update
  using (can_edit_project_content(project_id)) with check (can_edit_project_content(project_id));
create policy "project content deleters - modules delete" on modules for delete
  using (can_delete_project_content(project_id));

drop policy if exists "project access - tags" on tags;
create policy "project access - tags select" on tags for select
  using (has_project_access(project_id));
create policy "project content editors - tags insert" on tags for insert
  with check (can_edit_project_content(project_id));
create policy "project content editors - tags update" on tags for update
  using (can_edit_project_content(project_id)) with check (can_edit_project_content(project_id));
create policy "project content deleters - tags delete" on tags for delete
  using (can_delete_project_content(project_id));

drop policy if exists "project access - test_case_tags" on test_case_tags;
create policy "project access - test_case_tags select" on test_case_tags for select
  using (has_project_access((select project_id from test_cases where id = test_case_id)));
create policy "project content editors - test_case_tags insert" on test_case_tags for insert
  with check (can_edit_project_content((select project_id from test_cases where id = test_case_id)));
create policy "project content editors - test_case_tags update" on test_case_tags for update
  using (can_edit_project_content((select project_id from test_cases where id = test_case_id)))
  with check (can_edit_project_content((select project_id from test_cases where id = test_case_id)));
create policy "project content deleters - test_case_tags delete" on test_case_tags for delete
  using (can_delete_project_content((select project_id from test_cases where id = test_case_id)));

drop policy if exists "project access - test_runs" on test_runs;
create policy "project access - test_runs select" on test_runs for select
  using (has_project_access((select project_id from test_plans where id = test_plan_id)));
create policy "test runners - test_runs insert" on test_runs for insert
  with check (can_run_tests((select project_id from test_plans where id = test_plan_id)));
create policy "test runners - test_runs update" on test_runs for update
  using (can_run_tests((select project_id from test_plans where id = test_plan_id)))
  with check (can_run_tests((select project_id from test_plans where id = test_plan_id)));
create policy "project content deleters - test_runs delete" on test_runs for delete
  using (can_delete_project_content((select project_id from test_plans where id = test_plan_id)));

drop policy if exists "project access - test_results" on test_results;
create policy "project access - test_results select" on test_results for select
  using (has_project_access((select tp.project_id from test_runs tr join test_plans tp on tp.id = tr.test_plan_id where tr.id = test_run_id)));
create policy "test runners - test_results insert" on test_results for insert
  with check (can_run_tests((select tp.project_id from test_runs tr join test_plans tp on tp.id = tr.test_plan_id where tr.id = test_run_id)));
create policy "test runners - test_results update" on test_results for update
  using (can_run_tests((select tp.project_id from test_runs tr join test_plans tp on tp.id = tr.test_plan_id where tr.id = test_run_id)))
  with check (can_run_tests((select tp.project_id from test_runs tr join test_plans tp on tp.id = tr.test_plan_id where tr.id = test_run_id)));
create policy "project content deleters - test_results delete" on test_results for delete
  using (can_delete_project_content((select tp.project_id from test_runs tr join test_plans tp on tp.id = tr.test_plan_id where tr.id = test_run_id)));

drop policy if exists "project access - issues" on issues;
create policy "project access - issues select" on issues for select
  using (has_project_access((
    select tp.project_id from test_results res
    join test_runs tr on tr.id = res.test_run_id
    join test_plans tp on tp.id = tr.test_plan_id
    where res.id = test_result_id
  )));
create policy "issue managers - issues insert" on issues for insert
  with check (can_manage_issues((
    select tp.project_id from test_results res
    join test_runs tr on tr.id = res.test_run_id
    join test_plans tp on tp.id = tr.test_plan_id
    where res.id = test_result_id
  )));
create policy "issue managers - issues update" on issues for update
  using (can_manage_issues((
    select tp.project_id from test_results res
    join test_runs tr on tr.id = res.test_run_id
    join test_plans tp on tp.id = tr.test_plan_id
    where res.id = test_result_id
  )))
  with check (can_manage_issues((
    select tp.project_id from test_results res
    join test_runs tr on tr.id = res.test_run_id
    join test_plans tp on tp.id = tr.test_plan_id
    where res.id = test_result_id
  )));
create policy "project content deleters - issues delete" on issues for delete
  using (can_delete_project_content((
    select tp.project_id from test_results res
    join test_runs tr on tr.id = res.test_run_id
    join test_plans tp on tp.id = tr.test_plan_id
    where res.id = test_result_id
  )));
