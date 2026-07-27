import { supabase } from '../config/supabaseClient';
import { mapTestRoleRow } from '../helpers/mappers';
import type { TestRole } from '../types/domain';

export const testRoleRepository = {
  async findAllByProject(projectId: string): Promise<TestRole[]> {
    const { data, error } = await supabase
      .from('test_roles')
      .select('*')
      .eq('project_id', projectId)
      .order('name');

    if (error) throw error;
    return (data ?? []).map(mapTestRoleRow);
  },

  async create(input: { projectId: string; name: string }): Promise<TestRole> {
    const { data, error } = await supabase
      .from('test_roles')
      .insert({ project_id: input.projectId, name: input.name })
      .select('*')
      .single();

    if (error) throw error;
    return mapTestRoleRow(data);
  },

  async update(id: string, changes: { name: string }): Promise<TestRole> {
    const { data, error } = await supabase.from('test_roles').update(changes).eq('id', id).select('*').single();
    if (error) throw error;
    return mapTestRoleRow(data);
  },

  async createMany(inputs: { projectId: string; name: string }[]): Promise<TestRole[]> {
    if (inputs.length === 0) return [];
    const { data, error } = await supabase
      .from('test_roles')
      .insert(inputs.map((i) => ({ project_id: i.projectId, name: i.name })))
      .select('*');
    if (error) throw error;
    return (data ?? []).map(mapTestRoleRow);
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('test_roles').delete().eq('id', id);
    if (error) throw error;
  },
};
