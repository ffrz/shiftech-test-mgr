import { supabase } from '../../../config/supabaseClient';
import { mapProjectMemberRow, mapProjectMemberInvitationRow, mapProfileRow } from '../../../helpers/mappers';
import type { ProjectMemberRole, ProjectMemberWithProfile, ProjectMemberInvitation, Profile } from '../../../types/domain';
import type { ProjectMemberRepository } from '../../interfaces/projectMemberRepository';

async function resolveProfiles(userIds: string[]): Promise<Map<string, Profile>> {
  const map = new Map<string, Profile>();
  if (userIds.length === 0) return map;
  const { data } = await supabase.from('profiles').select('*').in('id', userIds);
  for (const row of (data ?? [])) {
    map.set(row.id, mapProfileRow(row));
  }
  return map;
}

function buildMemberWithProfile(row: any, profiles?: Map<string, Profile>): ProjectMemberWithProfile {
  const profile = profiles?.get(row.user_id) ?? null;
  const email = row.member?.email ?? '';
  return {
    ...mapProjectMemberRow(row),
    profile: profile ?? (email ? { id: row.user_id, username: email, displayName: email, avatarUrl: null, bio: null, usernameChanged: false, createdAt: '', updatedAt: '' } : null),
    email,
  };
}

export const projectMemberRepositoryAdapter: ProjectMemberRepository = {
  async findAllByProject(projectId: string): Promise<ProjectMemberWithProfile[]> {
    const { data, error } = await supabase
      .from('project_members')
      .select('*, member:users!project_members_user_id_fkey(email)')
      .eq('project_id', projectId)
      .order('created_at');
    if (error) throw error;
    const rows = data ?? [];
    const profiles = await resolveProfiles(rows.map((r: any) => r.user_id));
    return rows.map((r: any) => buildMemberWithProfile(r, profiles));
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
      .select('*, member:users!project_members_user_id_fkey(email)')
      .single();
    if (error) throw error;
    const profiles = await resolveProfiles([data.user_id]);
    return buildMemberWithProfile(data, profiles);
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
      .select('*, member:users!project_members_user_id_fkey(email)')
      .single();
    if (error) throw error;
    const profiles = await resolveProfiles([data.user_id]);
    return buildMemberWithProfile(data, profiles);
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('project_members').delete().eq('id', id);
    if (error) throw error;
  },
};
