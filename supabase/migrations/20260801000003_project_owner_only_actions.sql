-- Project lifecycle + membership actions are owner-only.
--
-- Product rule (per feedback): Edit, Set Active/Inactive, Archive, Permanently Delete,
-- and managing project members are actions ONLY the project owner may take. A non-owner
-- 'manager' can still open Project Settings (Modules/Tags/Test Roles) and manage
-- content (test plans/cases/runs/issues) — but not the project row or membership.
--
-- Previously is_project_manager() (owner OR project_members.role='manager' accepted)
-- let a non-owner manager update the project, change its status, archive/delete it, and
-- invite/change-role/remove members. The UI already hid these for non-owners, but per
-- project convention RLS is the real security boundary, so the same rule is enforced here.

create or replace function is_project_owner(p_project_id uuid)
returns boolean as $$
  select exists (
    select 1 from projects where id = p_project_id and owner_id = auth.uid()
  );
$$ language sql security definer set search_path = public stable;

-- === projects: update + delete become owner-only ===
-- was "project managers - projects update" / "project managers - projects delete"

drop policy if exists "project managers - projects update" on projects;
create policy "project owner - projects update" on projects for update
  using (is_project_owner(id));

drop policy if exists "project managers - projects delete" on projects;
create policy "project owner - projects delete" on projects for delete
  using (is_project_owner(id));

-- === project_members: invite / change-role / remove become owner-only ===
-- "invitee - project_members respond" (self-respond on own invited row) is untouched —
-- the accept/decline flow goes through the security-definer respond_to_project_invitation()
-- RPC anyway and must keep working.

drop policy if exists "project managers - project_members insert" on project_members;
create policy "project owner - project_members insert" on project_members for insert
  with check (is_project_owner(project_id));

drop policy if exists "project managers - project_members update" on project_members;
create policy "project owner - project_members update" on project_members for update
  using (is_project_owner(project_id)) with check (is_project_owner(project_id));

drop policy if exists "project managers - project_members delete" on project_members;
create policy "project owner - project_members delete" on project_members for delete
  using (is_project_owner(project_id));
