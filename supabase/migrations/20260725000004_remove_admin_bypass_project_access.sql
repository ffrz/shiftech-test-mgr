-- Remove the is_admin() bypass from project-scoped access-check helpers.
--
-- 20260725000003 removed the admin bypass from the projects table's own RLS policies,
-- but has_project_access() / is_project_manager() (and the role-capability helpers built
-- on top of them) still short-circuited true for admins. These functions gate every
-- project-scoped table (test_plans, test_cases, modules, tags, test_runs, test_results,
-- issues, test_plan_cases, test_case_tags, project_members), so admins could still see and
-- edit content of projects they were never added to. Admin no longer implies project access
-- anywhere — an admin must be the project's creator or an explicit project_members row,
-- exactly like any other user. Admin's remaining special powers (global user/profile
-- management) are untouched, as they live entirely in the profiles table policies.

create or replace function has_project_access(p_project_id uuid)
returns boolean as $$
  select exists (
    select 1 from project_members where project_id = p_project_id and user_id = auth.uid()
  );
$$ language sql security definer set search_path = public stable;

create or replace function is_project_manager(p_project_id uuid)
returns boolean as $$
  select exists (
    select 1 from project_members
    where project_id = p_project_id and user_id = auth.uid() and role = 'manager'
  );
$$ language sql security definer set search_path = public stable;

create or replace function can_edit_project_content(p_project_id uuid)
returns boolean as $$
  select exists (
    select 1 from project_members
    where project_id = p_project_id and user_id = auth.uid() and role in ('manager', 'supervisor')
  );
$$ language sql security definer set search_path = public stable;

create or replace function can_delete_project_content(p_project_id uuid)
returns boolean as $$
  select exists (
    select 1 from project_members
    where project_id = p_project_id and user_id = auth.uid() and role = 'manager'
  );
$$ language sql security definer set search_path = public stable;

create or replace function can_run_tests(p_project_id uuid)
returns boolean as $$
  select exists (
    select 1 from project_members
    where project_id = p_project_id and user_id = auth.uid() and role in ('manager', 'tester')
  );
$$ language sql security definer set search_path = public stable;

create or replace function can_manage_issues(p_project_id uuid)
returns boolean as $$
  select exists (
    select 1 from project_members
    where project_id = p_project_id and user_id = auth.uid() and role in ('manager', 'tester')
  );
$$ language sql security definer set search_path = public stable;

-- projects SELECT still needs created_by as a separate OR-branch (has_project_access alone
-- no longer covers the creator-without-a-members-row edge case from 20260725000002).
-- No change needed here — 20260725000003 already has created_by = auth.uid() in the policy.
