-- Soft-delete (userService.remove → userRepository.softDelete) sets deleted_at on
-- the public `users` table, but the auth.users record stays intact and the Google
-- OAuth session remains valid. Two gaps made this ineffective:
--
-- 1. has_project_access() never checked is_approved() (deleted_at is null), so a
--    deleted user could still query every project-scoped table via RLS.
-- 2. handle_new_user() used INSERT, not UPSERT — if a deleted user triggered the
--    auth.users after-insert hook again (e.g. re-signup from a different browser
--    that created a fresh auth identity), the INSERT would fail silently on PK
--    conflict and never re-activate the user.
--
-- Fix 1: has_project_access() gates on is_approved() first.
-- Fix 2: handle_new_user() uses ON CONFLICT DO UPDATE.
--
-- The projects SELECT policy still has owner_id = auth.uid() as a direct bypass
-- (so the project owner always sees their project listing) — that's intentional
-- for non-deleted owners. has_project_access() now covers the membership path.

create or replace function has_project_access(p_project_id uuid)
returns boolean as $$
  select is_approved() and (
    exists (
      select 1 from projects where id = p_project_id and owner_id = auth.uid()
    ) or exists (
      select 1 from project_members
      where project_id = p_project_id and user_id = auth.uid() and status = 'accepted'
    )
  );
$$ language sql security definer set search_path = public stable;

create or replace function handle_new_user()
returns trigger as $$
declare
  v_base_username text;
  v_username text;
  v_suffix int := 0;
begin
  insert into public.users (id, email, full_name, avatar_url, role)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    'user'
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = excluded.full_name,
    avatar_url = excluded.avatar_url,
    deleted_at = null,
    role = 'user';

  v_base_username := regexp_replace(lower(split_part(new.email, '@', 1)), '[^a-z0-9_]', '_', 'g');
  v_username := v_base_username;

  while exists (select 1 from public.profiles where username = v_username and id != new.id) loop
    v_suffix := v_suffix + 1;
    v_username := v_base_username || '_' || v_suffix;
  end loop;

  insert into public.profiles (id, username, display_name, avatar_url)
  values (
    new.id,
    v_username,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do update set
    username = v_username,
    display_name = new.raw_user_meta_data->>'full_name',
    avatar_url = new.raw_user_meta_data->>'avatar_url';

  return new;
end;
$$ language plpgsql security definer set search_path = public;
