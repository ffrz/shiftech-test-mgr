import { supabase } from '../config/supabaseClient';
import { mapProjectMemberWithProfileRow, mapProjectMemberInvitationRow } from '../helpers/mappers';
import type { ProjectMemberRole, ProjectMemberWithProfile, ProjectMemberInvitation } from '../types/domain';

const MEMBER_WITH_PROFILE_SELECT = '*, member_user:users!project_members_user_id_fkey(email, profile:profiles(*))';

export const projectMemberRepository = {
  async findAllByProject(projectId: string): Promise<ProjectMemberWithProfile[]> {
    const { data, error } = await supabase
      .from('project_members')
      .select(MEMBER_WITH_PROFILE_SELECT)
      .eq('project_id', projectId)
      .order('created_at');
    if (error) throw error;
    return (data ?? []).map(mapProjectMemberWithProfileRow);
  },

  async findOwnRole(projectId: string, userId: string): Promise<ProjectMemberRole | null> {
    const { data, error } = await supabase
      .from('project_members')
      .select('role')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .eq('status', 'accepted')
      .maybeSingle();
    if (error) throw error;
    return data?.role ?? null;
  },

  // Invite a user to a project — lands as status='invited', not immediately a member.
  // They must accept() before has_project_access() grants them anything (see
  // 20260725000009's has_project_access() redefinition).
  async invite(projectId: string, userId: string, role: ProjectMemberRole, invitedBy: string): Promise<ProjectMemberWithProfile> {
    const { data, error } = await supabase
      .from('project_members')
      .insert({ project_id: projectId, user_id: userId, role, status: 'invited', invited_by: invitedBy })
      .select(MEMBER_WITH_PROFILE_SELECT)
      .single();
    if (error) throw error;
    return mapProjectMemberWithProfileRow(data);
  },

  // Uses a security-definer RPC rather than a direct table select -- an invited-but-not-yet-
  // accepted user has no RLS access to `projects`/`users` (correctly, since accepting is what
  // grants access), so resolving the project name and inviter display name for the
  // invitation card can't rely on regular RLS-gated embeds. See
  // 20260728000006_invitation_rpc_security_definer.sql.
  async listPendingInvitationsForUser(userId: string): Promise<ProjectMemberInvitation[]> {
    const { data, error } = await supabase.rpc('list_own_pending_invitations');
    if (error) throw error;
    return (data ?? []).map((row: any) => mapProjectMemberInvitationRow(row, userId));
  },

  // Uses a security-definer RPC for the same reason as above -- also sidesteps ever having to
  // debug "did the direct-table RLS UPDATE policy actually match" again.
  async respond(id: string, status: 'accepted' | 'declined'): Promise<void> {
    const { error } = await supabase.rpc('respond_to_project_invitation', { p_id: id, p_status: status });
    if (error) throw error;
  },

  async updateRole(id: string, role: ProjectMemberRole): Promise<void> {
    const { error } = await supabase.from('project_members').update({ role }).eq('id', id);
    if (error) throw error;
  },

  async reinvite(id: string, role: ProjectMemberRole, invitedBy: string): Promise<ProjectMemberWithProfile> {
    const { data, error } = await supabase
      .from('project_members')
      .update({
        status: 'invited',
        role,
        invited_by: invitedBy,
        invited_at: new Date().toISOString(),
        responded_at: null,
      })
      .eq('id', id)
      .select(MEMBER_WITH_PROFILE_SELECT)
      .single();
    if (error) throw error;
    return mapProjectMemberWithProfileRow(data);
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('project_members').delete().eq('id', id);
    if (error) throw error;
  },
};
