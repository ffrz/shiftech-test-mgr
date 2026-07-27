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

  async listPendingInvitationsForUser(userId: string): Promise<ProjectMemberInvitation[]> {
    const { data, error } = await supabase
      .from('project_members')
      .select(`${MEMBER_WITH_PROFILE_SELECT}, project:projects(id, name, owner:users!projects_owner_id_fkey(profile:profiles(username, display_name)))`)
      .eq('user_id', userId)
      .eq('status', 'invited')
      .order('invited_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapProjectMemberInvitationRow);
  },

  async respond(id: string, status: 'accepted' | 'declined'): Promise<void> {
    const { error } = await supabase
      .from('project_members')
      .update({ status, responded_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  },

  async updateRole(id: string, role: ProjectMemberRole): Promise<void> {
    const { error } = await supabase.from('project_members').update({ role }).eq('id', id);
    if (error) throw error;
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('project_members').delete().eq('id', id);
    if (error) throw error;
  },
};
