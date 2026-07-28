-- Drop the temporary diagnostic RPC from 20260728000005 -- superseded by the real fix in
-- 20260728000006 (list_own_pending_invitations / respond_to_project_invitation).

drop function if exists debug_own_invitations();
