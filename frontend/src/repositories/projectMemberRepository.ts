import { supabase } from '../config/supabaseClient';
import { mapProjectMemberWithProfileRow } from '../helpers/mappers';
import type { ProjectMemberRole, ProjectMemberWithProfile } from '../types/domain';

export const projectMemberRepository = {
  async findAllByProject(projectId: string): Promise<ProjectMemberWithProfile[]> {
    const { data, error } = await supabase
      .from('project_members')
      .select('*, member_user:users!project_members_user_id_fkey(email, profile:profiles(*))')
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
      .maybeSingle();
    if (error) throw error;
    return data?.role ?? null;
  },

  async add(projectId: string, userId: string, role: ProjectMemberRole): Promise<ProjectMemberWithProfile> {
    const { data, error } = await supabase
      .from('project_members')
      .insert({ project_id: projectId, user_id: userId, role })
      .select('*, member_user:users!project_members_user_id_fkey(email, profile:profiles(*))')
      .single();
    if (error) throw error;
    return mapProjectMemberWithProfileRow(data);
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
