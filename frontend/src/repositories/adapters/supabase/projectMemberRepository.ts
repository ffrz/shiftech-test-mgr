import { supabase } from '../../../config/supabaseClient';
import { mapProjectMemberWithProfileRow, mapProjectMemberInvitationRow } from '../../../helpers/mappers';
import type { ProjectMemberRole, ProjectMemberWithProfile, ProjectMemberInvitation } from '../../../types/domain';
import type { ProjectMemberRepository } from '../../interfaces/projectMemberRepository';

const MEMBER_WITH_PROFILE_SELECT = '*, member_user:users!project_members_user_id_fkey(email, profile:profiles(*))';

export const projectMemberRepositoryAdapter: ProjectMemberRepository = {
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

  async invite(projectId: string, userId: string, role: ProjectMemberRole, invitedBy: string): Promise<ProjectMemberWithProfile> {
    const { data, error } = await supabase
      .from('project_members')
      .insert({ project_id: projectId, user_id: userId, role, status: 'invited', invited_by: invitedBy })
      .select(MEMBER_WITH_PROFILE_SELECT)
      .single();
    if (error) throw error;
    return mapProjectMemberWithProfileRow(data);
  },

  async listPendingInvitationsForUser(userId: string): Promise<ProjectMemberInvitation[]> {
    const { data, error } = await supabase.rpc('list_own_pending_invitations');
    if (error) throw error;
    return (data ?? []).map((row: any) => mapProjectMemberInvitationRow(row, userId));
  },

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
