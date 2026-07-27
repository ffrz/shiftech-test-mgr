-- Fix: invited user can see project id + name + owner info on their pending invitations.
--
-- The existing "project access - projects select" policy requires has_project_access()
-- which (since 20260725000009) checks status = 'accepted'. An invited user can see their
-- own project_members row (per the "project access - project_members select" policy's
-- `or user_id = auth.uid()` clause) but the JOIN to projects(name) silently returns null
-- because the projects row is filtered out by RLS.
--
-- This policy allows a user who has been invited (status = 'invited') to read basic
-- project metadata (id, name, owner_id) so the invitation UI can display
-- "@ownerUsername / project-name" instead of "Unknown project".
--
-- scope: SELECT only, no write access extension.
-- security: security definer subquery (same pattern as has_project_access).

create policy "invited users - projects select" on projects for select
  using (
    exists (
      select 1 from project_members
      where project_id = id and user_id = auth.uid() and status = 'invited'
    )
  );
