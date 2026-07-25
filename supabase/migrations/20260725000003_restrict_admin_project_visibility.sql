-- Restrict admin's blanket access to projects — run AFTER schema_project_lifecycle etc.
--
-- Previously, admins could see, edit, and delete ANY project via an is_admin() bypass in
-- the projects RLS policies, even projects they were never added to. Since every approved
-- user can now create projects, "admin" should not imply "can see/manage everyone else's
-- projects" — an admin only has elevated access to a project if they're its creator or a
-- member (same as any other user). Admin's remaining special powers (global user management,
-- approving/rejecting profiles) are untouched — those live in the profiles table policies.

drop policy if exists "project access - projects select" on projects;
create policy "project access - projects select" on projects for select
  using (is_approved() and (created_by = auth.uid() or has_project_access(id)));

drop policy if exists "project managers - projects update" on projects;
create policy "project managers - projects update" on projects for update
  using (is_project_manager(id));

drop policy if exists "admins - projects delete" on projects;
create policy "project managers - projects delete" on projects for delete
  using (is_project_manager(id));
