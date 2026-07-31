-- Fix: ProjectSettingsPage members list throws "Cannot read properties of undefined
-- (reading 'id')" in mapProfileRow for non-admin managers, because `users` RLS (added back
-- in 20260701000002_auth_rbac.sql, when the table was still called `profiles`) only allows
-- self-read or admin-read. The member list query joins
-- project_members -> users!project_members_user_id_fkey -> profiles to show each member's
-- email, so any co-member's `users` row that isn't the caller's own gets filtered out by
-- RLS, leaving `member_user` (and therefore `.profile`) undefined in the mapper.
--
-- Add read access for accepted co-members of any project the caller also has accepted
-- access to (mirrors has_project_access(), just checked against the target user's own
-- memberships instead of auth.uid()'s).

create policy "project co-members read users" on users for select
  using (
    exists (
      select 1
      from project_members pm_self
      join project_members pm_target
        on pm_target.project_id = pm_self.project_id
      where pm_self.user_id = auth.uid()
        and pm_self.status = 'accepted'
        and pm_target.user_id = users.id
        and pm_target.status = 'accepted'
    )
    or exists (
      select 1
      from projects p
      join project_members pm_target on pm_target.project_id = p.id
      where p.owner_id = auth.uid()
        and pm_target.user_id = users.id
        and pm_target.status = 'accepted'
    )
    or exists (
      select 1
      from project_members pm_self
      join projects p on p.id = pm_self.project_id
      where pm_self.user_id = auth.uid()
        and pm_self.status = 'accepted'
        and p.owner_id = users.id
    )
  );
