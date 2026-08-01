-- Lock the project owner's own project_members row.
--
-- The members tab and the project_members update/delete policies must never allow the
-- owner's own membership row to be reassigned (role/status changed) or removed.
-- Ownership transfer is a deliberate future feature (Danger Zone), not something the
-- members tab or a direct API call should be able to do. The owner row is auto-inserted
-- by handle_new_project() and is otherwise immutable; deleting it would silently break
-- the owner's role-based settings access.

drop policy if exists "project owner - project_members update" on project_members;
create policy "project owner - project_members update" on project_members for update
  using (
    is_project_owner(project_id)
    and not exists (
      select 1 from projects p where p.id = project_id and p.owner_id = user_id
    )
  )
  with check (
    is_project_owner(project_id)
    and not exists (
      select 1 from projects p where p.id = project_id and p.owner_id = user_id
    )
  );

drop policy if exists "project owner - project_members delete" on project_members;
create policy "project owner - project_members delete" on project_members for delete
  using (
    is_project_owner(project_id)
    and not exists (
      select 1 from projects p where p.id = project_id and p.owner_id = user_id
    )
  );
