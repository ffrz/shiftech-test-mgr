-- Project Members (access control) — run AFTER schema_test_management_v2.sql.
--
-- Adds a project_members junction table so access to a project's data (modules, tags,
-- test plans, test cases, test runs, results, issues) is restricted to users explicitly
-- added to the project, or admins (who always see everything).
--
-- Role within a project: 'manager' (can manage members/settings) | 'member' (regular access).
-- This is distinct from the global profiles.role (pending/user/admin).

create table if not exists project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('manager', 'member')),
  created_at timestamptz not null default now(),
  unique (project_id, user_id)
);

create index if not exists idx_project_members_project on project_members (project_id);
create index if not exists idx_project_members_user on project_members (user_id);

-- === Access-check helper (security definer to avoid RLS recursion) ===

create or replace function has_project_access(p_project_id uuid)
returns boolean as $$
  select is_admin() or exists (
    select 1 from project_members where project_id = p_project_id and user_id = auth.uid()
  );
$$ language sql security definer set search_path = public stable;

create or replace function is_project_manager(p_project_id uuid)
returns boolean as $$
  select is_admin() or exists (
    select 1 from project_members
    where project_id = p_project_id and user_id = auth.uid() and role = 'manager'
  );
$$ language sql security definer set search_path = public stable;

-- === project_members RLS ===

alter table project_members enable row level security;

create policy "project access - project_members select" on project_members for select
  using (has_project_access(project_id));

create policy "project managers - project_members write" on project_members for all
  using (is_project_manager(project_id)) with check (is_project_manager(project_id));

-- === Replace "approved users" policies with project-scoped access on domain tables ===

drop policy if exists "approved users - projects" on projects;
create policy "project access - projects select" on projects for select
  using (is_approved() and (is_admin() or has_project_access(id)));
create policy "approved users - projects insert" on projects for insert
  with check (is_approved());
create policy "project managers - projects update" on projects for update
  using (is_admin() or is_project_manager(id));
create policy "admins - projects delete" on projects for delete
  using (is_admin());

drop policy if exists "approved users - test_plans" on test_plans;
create policy "project access - test_plans" on test_plans for all
  using (has_project_access(project_id)) with check (has_project_access(project_id));

drop policy if exists "approved users - test_cases" on test_cases;
create policy "project access - test_cases" on test_cases for all
  using (has_project_access(project_id)) with check (has_project_access(project_id));

drop policy if exists "approved users - test_plan_cases" on test_plan_cases;
create policy "project access - test_plan_cases" on test_plan_cases for all
  using (has_project_access((select project_id from test_plans where id = test_plan_id)))
  with check (has_project_access((select project_id from test_plans where id = test_plan_id)));

drop policy if exists "approved users - modules" on modules;
create policy "project access - modules" on modules for all
  using (has_project_access(project_id)) with check (has_project_access(project_id));

drop policy if exists "approved users - tags" on tags;
create policy "project access - tags" on tags for all
  using (has_project_access(project_id)) with check (has_project_access(project_id));

drop policy if exists "approved users - test_case_tags" on test_case_tags;
create policy "project access - test_case_tags" on test_case_tags for all
  using (has_project_access((select project_id from test_cases where id = test_case_id)))
  with check (has_project_access((select project_id from test_cases where id = test_case_id)));

drop policy if exists "approved users - test_runs" on test_runs;
create policy "project access - test_runs" on test_runs for all
  using (has_project_access((select project_id from test_plans where id = test_plan_id)))
  with check (has_project_access((select project_id from test_plans where id = test_plan_id)));

drop policy if exists "approved users - test_results" on test_results;
create policy "project access - test_results" on test_results for all
  using (has_project_access((select tp.project_id from test_runs tr join test_plans tp on tp.id = tr.test_plan_id where tr.id = test_run_id)))
  with check (has_project_access((select tp.project_id from test_runs tr join test_plans tp on tp.id = tr.test_plan_id where tr.id = test_run_id)));

drop policy if exists "approved users - issues" on issues;
create policy "project access - issues" on issues for all
  using (has_project_access((
    select tp.project_id from test_results res
    join test_runs tr on tr.id = res.test_run_id
    join test_plans tp on tp.id = tr.test_plan_id
    where res.id = test_result_id
  )))
  with check (has_project_access((
    select tp.project_id from test_results res
    join test_runs tr on tr.id = res.test_run_id
    join test_plans tp on tp.id = tr.test_plan_id
    where res.id = test_result_id
  )));

-- === Auto-add the creator of a project as its first manager ===

create or replace function handle_new_project()
returns trigger as $$
begin
  insert into public.project_members (project_id, user_id, role)
  values (new.id, auth.uid(), 'manager')
  on conflict (project_id, user_id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger trg_on_project_created
  after insert on projects
  for each row execute function handle_new_project();
