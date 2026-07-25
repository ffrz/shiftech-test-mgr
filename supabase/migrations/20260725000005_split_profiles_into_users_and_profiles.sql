-- Platform Evolution V2, Phase 1 (V2-P1-T01..T06) — split the auth-bound `profiles` row
-- (email, role) from public identity (username, display_name, avatar_url, bio).
--
-- Rationale: email must never be public (see docs/PRODUCT_CONSTITUTION.md /
-- docs/ARCHITECTURE_V2.md §1/§3). The old `profiles` table conflated both, so any join
-- for a public-facing display (tester name, assignee name, project member list) also
-- exposed email. This migration renames the old table to `users` (private: email, role)
-- and introduces a new `profiles` table (public: username, display_name, avatar_url, bio).
--
-- NOTE: role still allows 'pending' here — dropping the approval gate is Phase 2
-- (V2-P2-*), a separate migration. This migration only backfills stray 'pending' rows
-- to 'user' so nobody is left locked out if Phase 2 lands later without re-auditing.

-- === V2-P1-T01: backfill pending -> user ===

update profiles set role = 'user' where role = 'pending';

-- === V2-P1-T02: rename profiles -> users ===

alter table profiles rename to users;

alter table users drop constraint if exists profiles_role_check;
alter table users add constraint users_role_check check (role in ('user', 'admin'));

alter index if exists profiles_pkey rename to users_pkey;

-- Existing FKs that pointed at profiles(id) — test_results.tester_id, issues.assigned_to,
-- project_members.user_id, projects.created_by — follow the renamed table automatically
-- (Postgres FK constraints track the referenced table's OID, not its name). No action
-- needed: they now correctly reference users(id), which is exactly what we want since
-- tester/assignee/member/creator are auth-bound identities, not public-profile display data.
-- New code should still resolve display fields (name/avatar) via a join to the new
-- `profiles` table using the same id, not by adding a second FK.

-- Rename dependent trigger for clarity (function itself is generic set_updated_at()).
alter trigger trg_profiles_updated_at on users rename to trg_users_updated_at;

-- === V2-P1-T03: create new profiles table (public identity) ===

create table profiles (
  id uuid primary key references users(id) on delete cascade,
  username text not null unique,
  display_name text,
  avatar_url text,
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_profiles_username on profiles (lower(username));

create trigger trg_profiles_updated_at before update on profiles
  for each row execute function set_updated_at();

-- === V2-P1-T04: backfill profiles row per existing users row ===
--
-- username defaults to the email local-part, de-duplicated with a numeric suffix on
-- collision (case-insensitive uniqueness enforced by idx_profiles_username above, but the
-- unique constraint itself is case-sensitive — collisions are resolved here at backfill time
-- and enforced going forward at the application layer, same pattern as entity codes).

with base as (
  select
    id,
    avatar_url,
    full_name,
    regexp_replace(lower(split_part(email, '@', 1)), '[^a-z0-9_]', '_', 'g') as base_username,
    row_number() over (
      partition by regexp_replace(lower(split_part(email, '@', 1)), '[^a-z0-9_]', '_', 'g')
      order by created_at
    ) as rn
  from users
)
insert into profiles (id, username, display_name, avatar_url)
select
  id,
  case when rn = 1 then base_username else base_username || '_' || rn end,
  full_name,
  avatar_url
from base;

alter table profiles alter column username set not null;

-- === V2-P1-T05: RLS on new profiles — public read, self-only write ===

alter table profiles enable row level security;

create policy "public read - profiles" on profiles for select
  using (true);

create policy "own profile - profiles update" on profiles for update
  using (id = auth.uid()) with check (id = auth.uid());

-- === users RLS: carry forward existing policies untouched (table renamed, not re-created) ===
-- "read own profile" / "admins read all profiles" / "admins update profiles" policies from
-- schema_auth.sql / schema_project_lifecycle.sql already apply to the renamed table as-is —
-- Postgres preserves policies across `rename table`. No action needed here.

-- === CRITICAL: redefine is_admin()/is_approved() to query `users`, not `profiles` ===
--
-- These are `security definer sql` functions — Postgres resolves the bare `profiles`
-- identifier inside their body at CALL time (via search_path), not at CREATE time. After
-- the rename above, the name `profiles` now refers to the NEW public-identity table (no
-- `role`/`deleted_at` columns), not the renamed `users` table. Without this redefinition,
-- every RLS policy in the app that depends on is_admin()/is_approved() (which is nearly
-- all of them) would break immediately and silently. Bodies are otherwise unchanged from
-- schema_project_lifecycle.sql — only `profiles` -> `users`.

create or replace function is_admin()
returns boolean as $$
  select exists (
    select 1 from users where id = auth.uid() and role = 'admin' and deleted_at is null
  );
$$ language sql security definer set search_path = public stable;

create or replace function is_approved()
returns boolean as $$
  select exists (
    select 1 from users where id = auth.uid() and role in ('user', 'admin') and deleted_at is null
  );
$$ language sql security definer set search_path = public stable;

-- === V2-P1-T06: handle_new_user() now inserts into both users and profiles ===

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
  );

  v_base_username := regexp_replace(lower(split_part(new.email, '@', 1)), '[^a-z0-9_]', '_', 'g');
  v_username := v_base_username;

  while exists (select 1 from public.profiles where username = v_username) loop
    v_suffix := v_suffix + 1;
    v_username := v_base_username || '_' || v_suffix;
  end loop;

  insert into public.profiles (id, username, display_name, avatar_url)
  values (
    new.id,
    v_username,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );

  return new;
end;
$$ language plpgsql security definer set search_path = public;
