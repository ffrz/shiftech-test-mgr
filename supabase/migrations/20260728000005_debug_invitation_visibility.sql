-- Temporary diagnostic RPC to see exactly what an invitee's RLS-scoped view of their own
-- pending invitation + the underlying project looks like. Callable from the browser console
-- as the logged-in user via supabase.rpc('debug_own_invitations'). Not security definer --
-- runs under the caller's own RLS, same as the real app query, so it reflects reality.
--
-- Safe to drop once the "Unknown project" investigation is resolved.

create or replace function debug_own_invitations()
returns table (
  member_id uuid,
  member_status text,
  member_project_id uuid,
  project_row_id uuid,
  project_row_name text,
  project_row_owner_id uuid
) as $$
  select
    pm.id,
    pm.status,
    pm.project_id,
    p.id,
    p.name,
    p.owner_id
  from project_members pm
  left join projects p on p.id = pm.project_id
  where pm.user_id = auth.uid() and pm.status = 'invited';
$$ language sql stable;
