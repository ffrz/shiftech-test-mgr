-- Fix: creating a project as a non-admin approved user always failed with
-- "new row violates row-level security policy for table projects" (42501),
-- even though the INSERT itself is allowed by "approved users - projects insert".
--
-- Root cause: the client does `INSERT ... RETURNING *` (via supabase-js
-- .insert().select().single()). The SELECT policy on projects requires
-- has_project_access(id), which checks project_members — but that row is only
-- created by the trg_on_project_created AFTER INSERT trigger. Postgres does not
-- reliably make that trigger's effect visible to the RLS check backing the
-- RETURNING clause of the very same INSERT statement, so the RETURNING/select
-- fails even though the INSERT committed successfully. Admins never hit this
-- because their SELECT access short-circuits via is_admin(), skipping
-- has_project_access() entirely.
--
-- Fix: let the creator see their own just-inserted row directly, without
-- depending on the trigger-created project_members row being visible yet.
-- created_by is also generally useful (audit/ownership), so it stays.

alter table projects add column if not exists created_by uuid references profiles(id) on delete set null;

-- Backfill from project_members (the manager added at creation time is the best
-- available proxy for "creator" for existing rows).
update projects p
set created_by = pm.user_id
from project_members pm
where pm.project_id = p.id and pm.role = 'manager' and p.created_by is null;

alter table projects alter column created_by set default auth.uid();

drop policy if exists "project access - projects select" on projects;
create policy "project access - projects select" on projects for select
  using (is_approved() and (is_admin() or created_by = auth.uid() or has_project_access(id)));
