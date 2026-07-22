-- Auth & RBAC schema — run AFTER schema.sql, in Supabase SQL Editor.
-- Adds `profiles` table (1:1 with auth.users) + role-based RLS on all tables.

-- === profiles ===

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  role text not null default 'pending' check (role in ('pending', 'user', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_profiles_updated_at before update on profiles
  for each row execute function set_updated_at();

-- Auto-create a profile row whenever a new auth user signs up (via Google OAuth).
-- New users start as 'pending' until an admin approves them.
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- === Role-check helpers (security definer to avoid RLS recursion on profiles) ===

create or replace function is_admin()
returns boolean as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer set search_path = public stable;

create or replace function is_approved()
returns boolean as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role in ('user', 'admin')
  );
$$ language sql security definer set search_path = public stable;

-- === profiles RLS ===

alter table profiles enable row level security;

-- Anyone authenticated can read their own profile (needed right after signup, while still 'pending').
create policy "read own profile" on profiles for select
  using (id = auth.uid());

-- Admins can read every profile (User Management page).
create policy "admins read all profiles" on profiles for select
  using (is_admin());

-- Admins can update anyone's role/profile (approve/reject, promote/demote).
create policy "admins update profiles" on profiles for update
  using (is_admin());

-- === Replace permissive policies on domain tables with role-based ones ===

drop policy if exists "allow all - projects" on projects;
drop policy if exists "allow all - test_plans" on test_plans;
drop policy if exists "allow all - test_cases" on test_cases;
drop policy if exists "allow all - test_plan_cases" on test_plan_cases;

create policy "approved users - projects" on projects for all
  using (is_approved()) with check (is_approved());

create policy "approved users - test_plans" on test_plans for all
  using (is_approved()) with check (is_approved());

create policy "approved users - test_cases" on test_cases for all
  using (is_approved()) with check (is_approved());

create policy "approved users - test_plan_cases" on test_plan_cases for all
  using (is_approved()) with check (is_approved());
