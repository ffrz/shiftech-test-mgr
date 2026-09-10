-- Fix authorization capabilities:
-- 1. can_manage_issues: grant to 'supervisor' (labeled as 'Manager' in the UI) alongside 'manager' ('Owner') and 'tester'.
-- 2. can_create_modules: allow 'tester' to create and update modules (e.g. quick-add module when creating/editing test cases and issues).

create or replace function can_manage_issues(p_project_id uuid)
returns boolean as $$
  select exists (
    select 1 from project_members
    where project_id = p_project_id and user_id = auth.uid() and role in ('manager', 'supervisor', 'tester') and status = 'accepted'
  );
$$ language sql security definer set search_path = public stable;

create or replace function can_manage_modules(p_project_id uuid)
returns boolean as $$
  select exists (
    select 1 from project_members
    where project_id = p_project_id and user_id = auth.uid() and role in ('manager', 'supervisor', 'tester') and status = 'accepted'
  );
$$ language sql security definer set search_path = public stable;

-- Update modules RLS policies for insert and update to use can_manage_modules
drop policy if exists "project content editors - modules insert" on modules;
create policy "project content editors - modules insert" on modules for insert
  with check (can_manage_modules(project_id));

drop policy if exists "project content editors - modules update" on modules;
create policy "project content editors - modules update" on modules for update
  using (can_manage_modules(project_id)) with check (can_manage_modules(project_id));
