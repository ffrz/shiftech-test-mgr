-- Stop relying on direct-table RLS for the pending-invitations flow.
--
-- Root cause of "Unknown project" + dead Accept/Decline buttons: has_project_access() (and
-- by extension every project-scoped RLS policy) requires status = 'accepted' in
-- project_members. An invited-but-not-yet-accepted user legitimately has no access to the
-- project yet -- that's correct security-wise. The "invited users - projects select" policy
-- (20260727000013) tried to patch a narrow read exception for this case, but embedding two
-- more levels deep (project -> owner -> profile) through RLS-gated tables is fragile and,
-- per manual testing, still isn't resolving reliably through PostgREST's embed resolution.
--
-- Fix: resolve everything the invitation card needs (project name, inviter name, role) with
-- one security-definer RPC that bypasses RLS entirely for this narrow, already-authorized
-- read (a user reading their OWN pending invitations is always safe to allow). Same pattern
-- as create_notification(). Accept/decline get their own security-definer RPCs too, so we
-- stop depending on the "invitee - project_members respond" UPDATE policy actually being
-- reachable through PostgREST's RLS evaluation for this same-not-yet-a-member case.

create or replace function list_own_pending_invitations()
returns table (
  id uuid,
  project_id uuid,
  role text,
  status text,
  invited_by uuid,
  invited_at timestamptz,
  responded_at timestamptz,
  created_at timestamptz,
  project_name text,
  inviter_username text,
  inviter_display_name text
) as $$
  select
    pm.id,
    pm.project_id,
    pm.role,
    pm.status,
    pm.invited_by,
    pm.invited_at,
    pm.responded_at,
    pm.created_at,
    p.name,
    ip.username,
    ip.display_name
  from project_members pm
  join projects p on p.id = pm.project_id
  left join profiles ip on ip.id = pm.invited_by
  where pm.user_id = auth.uid() and pm.status = 'invited'
  order by pm.invited_at desc;
$$ language sql security definer set search_path = public stable;

create or replace function respond_to_project_invitation(p_id uuid, p_status text)
returns void as $$
begin
  if p_status not in ('accepted', 'declined') then
    raise exception 'invalid status: %', p_status;
  end if;

  update project_members
  set status = p_status, responded_at = now()
  where id = p_id and user_id = auth.uid() and status = 'invited';

  if not found then
    raise exception 'invitation not found or already responded to';
  end if;
end;
$$ language plpgsql security definer set search_path = public;
