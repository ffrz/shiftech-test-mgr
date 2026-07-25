-- Platform Evolution V2, Phase 4 (V2-P4-T01..T10) — project membership invite/accept
-- flow. Replaces direct-add with Invite -> Pending -> Accepted -> Member, per
-- docs/ARCHITECTURE_V2.md §1/§6 and docs/ROADMAP_V2.md Phase 4.

-- === V2-P4-T01: status + invite metadata columns ===
-- Existing rows default to 'accepted' so current members aren't retroactively kicked
-- out of projects they already have access to.

alter table project_members add column if not exists status text not null default 'accepted'
  check (status in ('invited', 'accepted', 'declined'));
alter table project_members add column if not exists invited_by uuid references users(id);
alter table project_members add column if not exists invited_at timestamptz not null default now();
alter table project_members add column if not exists responded_at timestamptz;

-- === V2-P4-T02: has_project_access() / is_project_manager() now require accepted ===
--
-- A project's owner (projects.owner_id) is treated as always having access, independent
-- of their project_members row's status -- the owner should never be blocked by their
-- own invite/accept lifecycle (they're auto-added as 'manager'/'accepted' by
-- handle_new_project() below, but this is an extra safety net, same reasoning as
-- 20260725000002's original created_by fix).

create or replace function has_project_access(p_project_id uuid)
returns boolean as $$
  select exists (
    select 1 from projects where id = p_project_id and owner_id = auth.uid()
  ) or exists (
    select 1 from project_members
    where project_id = p_project_id and user_id = auth.uid() and status = 'accepted'
  );
$$ language sql security definer set search_path = public stable;

create or replace function is_project_manager(p_project_id uuid)
returns boolean as $$
  select exists (
    select 1 from projects where id = p_project_id and owner_id = auth.uid()
  ) or exists (
    select 1 from project_members
    where project_id = p_project_id and user_id = auth.uid() and role = 'manager' and status = 'accepted'
  );
$$ language sql security definer set search_path = public stable;

-- The capability helpers (can_edit_project_content, can_delete_project_content,
-- can_run_tests, can_manage_issues) all check `project_members.role in (...)` directly
-- without going through has_project_access() -- they also need the accepted filter,
-- otherwise an invited-but-not-yet-accepted 'manager'/'tester' row would grant write
-- access before the user ever consented to join.

create or replace function can_edit_project_content(p_project_id uuid)
returns boolean as $$
  select exists (
    select 1 from project_members
    where project_id = p_project_id and user_id = auth.uid() and role in ('manager', 'supervisor') and status = 'accepted'
  );
$$ language sql security definer set search_path = public stable;

create or replace function can_delete_project_content(p_project_id uuid)
returns boolean as $$
  select exists (
    select 1 from project_members
    where project_id = p_project_id and user_id = auth.uid() and role = 'manager' and status = 'accepted'
  );
$$ language sql security definer set search_path = public stable;

create or replace function can_run_tests(p_project_id uuid)
returns boolean as $$
  select exists (
    select 1 from project_members
    where project_id = p_project_id and user_id = auth.uid() and role in ('manager', 'tester') and status = 'accepted'
  );
$$ language sql security definer set search_path = public stable;

create or replace function can_manage_issues(p_project_id uuid)
returns boolean as $$
  select exists (
    select 1 from project_members
    where project_id = p_project_id and user_id = auth.uid() and role in ('manager', 'tester') and status = 'accepted'
  );
$$ language sql security definer set search_path = public stable;

-- === V2-P4-T03: an invitee can see + respond to their own pending invitation row ===
-- even though has_project_access() correctly excludes them from the project's data
-- until they accept.

drop policy if exists "project access - project_members select" on project_members;
create policy "project access - project_members select" on project_members for select
  using (has_project_access(project_id) or user_id = auth.uid());

drop policy if exists "project managers - project_members write" on project_members;
create policy "project managers - project_members insert" on project_members for insert
  with check (is_project_manager(project_id));

create policy "invitee - project_members respond" on project_members for update
  using (user_id = auth.uid() and status = 'invited')
  with check (status in ('accepted', 'declined'));

create policy "project managers - project_members update" on project_members for update
  using (is_project_manager(project_id)) with check (is_project_manager(project_id));

create policy "project managers - project_members delete" on project_members for delete
  using (is_project_manager(project_id));

-- === V2-P4-T10: handle_new_project() explicitly sets status = 'accepted' ===
-- (already the column default, but explicit here for clarity/future-proofing against
-- the default ever changing). Creator is both projects.owner_id AND gets this
-- project_members row so they show up in member lists/role checks consistently with
-- everyone else.

create or replace function handle_new_project()
returns trigger as $$
begin
  insert into public.project_members (project_id, user_id, role, status, invited_by, responded_at)
  values (new.id, auth.uid(), 'manager', 'accepted', auth.uid(), now())
  on conflict (project_id, user_id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;
