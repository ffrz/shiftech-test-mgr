-- Fix: Invited members show "-" for username and name in Project Settings
-- member list because the `project co-members read users` RLS policy requires
-- pm_target.status = 'accepted'. Invited users (status='invited') are filtered
-- out, leaving member_user (and therefore profile) null.
--
-- Expand the policy to also include status='invited'.
drop policy if exists "project co-members read users" on users;

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
        and pm_target.status in ('accepted', 'invited')
    )
    or exists (
      select 1
      from projects p
      join project_members pm_target on pm_target.project_id = p.id
      where p.owner_id = auth.uid()
        and pm_target.user_id = users.id
        and pm_target.status in ('accepted', 'invited')
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
