import { supabase } from '../config/supabaseClient';
import { mapTestPlanRow } from '../helpers/mappers';
import type { TestPlan, TestPlanStatus } from '../types/domain';

// Repository layer: only raw Supabase queries + row-to-domain mapping.
// No business rules here — that belongs in the service layer.

export const testPlanRepository = {
  async findAllByProject(projectId: string, options?: { search?: string; statuses?: TestPlanStatus[] }): Promise<TestPlan[]> {
    let query = supabase
      .from('test_plans')
      .select('*')
      .eq('project_id', projectId);

    if (options?.search?.trim()) {
      const q = options.search.trim();
      query = query.or(`name.ilike.%${q}%,code.ilike.%${q}%`);
    }
    if (options?.statuses?.length) {
      query = query.in('status', options.statuses);
    }

    const { data, error } = await query.order('code');

    if (error) throw error;
    return (data ?? []).map(mapTestPlanRow);
  },

  async findById(id: string): Promise<TestPlan | null> {
    const { data, error } = await supabase
      .from('test_plans')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data ? mapTestPlanRow(data) : null;
  },

  // `code` optional — omit/empty lets the `set_test_plan_code` DB trigger auto-generate TP-####.
  async create(input: { projectId: string; name: string; description: string | null; code?: string | null }): Promise<TestPlan> {
    const { data, error } = await supabase
      .from('test_plans')
      .insert({
        project_id: input.projectId,
        code: input.code || undefined,
        name: input.name,
        description: input.description,
        status: 'draft' satisfies TestPlanStatus,
      })
      .select('*')
      .single();

    if (error) throw error;
    return mapTestPlanRow(data);
  },

  async update(id: string, changes: Partial<Pick<TestPlan, 'name' | 'description' | 'status' | 'code'>>): Promise<TestPlan> {
    const { data, error } = await supabase
      .from('test_plans')
      .update(changes)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    return mapTestPlanRow(data);
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('test_plans').delete().eq('id', id);
    if (error) throw error;
  },
};
