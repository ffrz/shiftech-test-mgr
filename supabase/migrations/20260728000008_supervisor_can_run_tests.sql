-- Grant the "Manager" role (internal name: supervisor -- not to be confused with the
-- "Owner"-labeled internal `manager` role, see PROJECT_MEMBER_ROLE_LABEL in
-- frontend/src/helpers/statusLabels.ts) permission to run tests, matching the frontend's
-- canRunTests update in useProjectRole.ts.

create or replace function can_run_tests(p_project_id uuid)
returns boolean as $$
  select exists (
    select 1 from project_members
    where project_id = p_project_id and user_id = auth.uid() and role in ('manager', 'supervisor', 'tester') and status = 'accepted'
  );
$$ language sql security definer set search_path = public stable;
