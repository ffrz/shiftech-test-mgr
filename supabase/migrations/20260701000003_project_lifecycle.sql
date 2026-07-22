-- Project lifecycle + user management enhancements — run AFTER schema.sql and schema_auth.sql.
-- Adds: project status (active/inactive/archived), soft-delete for profiles (approve/reject/remove flow).

-- === projects: status lifecycle ===

alter table projects add column if not exists status text not null default 'active'
  check (status in ('active', 'inactive', 'archived'));

create index if not exists idx_projects_status on projects (status);
create index if not exists idx_projects_name on projects (lower(name));

-- === profiles: soft delete (admin can remove a user from the roster) ===

alter table profiles add column if not exists deleted_at timestamptz;

-- Deleted users must not read their own profile anymore -> effectively logged out of the app
-- (they still have a valid Supabase auth session, but the app treats them as unknown/blocked).
drop policy if exists "read own profile" on profiles;
create policy "read own profile" on profiles for select
  using (id = auth.uid() and deleted_at is null);

drop policy if exists "admins read all profiles" on profiles;
create policy "admins read all profiles" on profiles for select
  using (is_admin());

-- Recreate is_approved/is_admin so a soft-deleted profile is never treated as approved/admin,
-- even if its role column still says 'user'/'admin'.
create or replace function is_admin()
returns boolean as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin' and deleted_at is null
  );
$$ language sql security definer set search_path = public stable;

create or replace function is_approved()
returns boolean as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role in ('user', 'admin') and deleted_at is null
  );
$$ language sql security definer set search_path = public stable;
