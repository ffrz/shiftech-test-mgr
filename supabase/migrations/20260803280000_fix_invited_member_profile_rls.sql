-- Fix: Invited members show "-" for username and name in Project Settings
-- member list because the profiles RLS only allows self-read or admin-read.
-- The project_members FK still points to profiles (pre-V2 identity split on
-- remote), and co-members of the same project (including the owner) need read
-- access to see each other's profile info when viewing the member list.
--
-- This policy covers both accepted and invited statuses. The "member" entry in
-- project_members is the key — an invited user who hasn't accepted yet still
-- has a row, and the inviter (project owner/manager) should see their profile.
drop policy if exists "project co-members read profiles" on profiles;

create policy "project co-members read profiles" on profiles for select
  using (
    exists (
      select 1
      from project_members pm_self
      join project_members pm_target
        on pm_target.project_id = pm_self.project_id
      where pm_self.user_id = auth.uid()
        and pm_self.status = 'accepted'
        and pm_target.user_id = profiles.id
        and pm_target.status in ('accepted', 'invited')
    )
    or exists (
      select 1
      from projects p
      join project_members pm_target on pm_target.project_id = p.id
      where p.owner_id = auth.uid()
        and pm_target.user_id = profiles.id
        and pm_target.status in ('accepted', 'invited')
    )
    or exists (
      select 1
      from project_members pm_self
      join projects p on p.id = pm_self.project_id
      where pm_self.user_id = auth.uid()
        and pm_self.status = 'accepted'
        and p.owner_id = profiles.id
    )
  );
