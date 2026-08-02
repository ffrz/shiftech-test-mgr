import { supabase } from '../../../config/supabaseClient';
import { mapTestPlanRow } from '../../../helpers/mappers';
import type { TestPlanRepository } from '../../interfaces/testPlanRepository';

export const testPlanRepositoryAdapter: TestPlanRepository = {
  async findAllByProject(projectId, options) {
    let query = supabase.from('test_plans').select('*').eq('project_id', projectId);
    if (options?.search?.trim()) {
      const q = options.search.trim();
      query = query.or(`name.ilike.%${q}%,code.ilike.%${q}%`);
    }
    if (options?.statuses?.length) query = query.in('status', options.statuses);
    const { data, error } = await query.order('code');
    if (error) throw error;
    return (data ?? []).map(mapTestPlanRow);
  },

  async findById(id) {
    const { data, error } = await supabase.from('test_plans').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? mapTestPlanRow(data) : null;
  },

  async create(input) {
    const { data, error } = await supabase
      .from('test_plans')
      .insert({ project_id: input.projectId, code: input.code || undefined, name: input.name, description: input.description, status: 'draft', created_by: input.createdBy ?? null })
      .select('*').single();
    if (error) throw error;
    return mapTestPlanRow(data);
  },

  async update(id, changes) {
    const { data, error } = await supabase.from('test_plans').update(changes).eq('id', id).select('*').single();
    if (error) throw error;
    return mapTestPlanRow(data);
  },

  async remove(id) {
    const { error } = await supabase.from('test_plans').delete().eq('id', id);
    if (error) throw error;
  },
};
