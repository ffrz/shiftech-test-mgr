-- Fix: Invited members show "-" for username and name in Project Settings
-- because the identity table (users in V2, profiles in V1) only allows
-- self-read or admin-read RLS. Co-members of the same project need read
-- access to see each other's profile info.
--
-- On V2 (split: users + profiles), the PostgREST join goes
-- project_members -> users -> profiles. The block is on users.
-- On V1 (pre-split: profiles only), the join goes directly to profiles.
--
-- Apply to whichever identity table(s) exist.

do $$
begin
  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'users') then
    drop policy if exists "project co-members read users" on users;
    create policy "project co-members read users" on users for select
      using (
        exists (
          select 1
          from project_members pm_self
          join project_members pm_target on pm_target.project_id = pm_self.project_id
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
  end if;

  -- On V1 (pre-split), the FK points to profiles directly
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'email'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'username'
  ) then
    drop policy if exists "project co-members read profiles" on profiles;
    create policy "project co-members read profiles" on profiles for select
      using (
        exists (
          select 1
          from project_members pm_self
          join project_members pm_target on pm_target.project_id = pm_self.project_id
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
  end if;
end $$;
