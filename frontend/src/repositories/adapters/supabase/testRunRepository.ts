import { supabase } from '../../../config/supabaseClient';
import { mapTestRunRow } from '../../../helpers/mappers';
import type { TestRun, TestRunStatus } from '../../../types/domain';
import type { TestRunRepository, TestRunWithPlan } from '../../interfaces/testRunRepository';

export const testRunRepositoryAdapter: TestRunRepository = {
  async findAllByPlan(testPlanId: string): Promise<TestRun[]> {
    const { data, error } = await supabase
      .from('test_runs')
      .select('*')
      .eq('test_plan_id', testPlanId)
      .order('started_at', { ascending: false });

    if (error) throw error;
    return (data ?? []).map(mapTestRunRow);
  },

  async findAllByPlanPaginated(
    testPlanId: string,
    options: { search?: string; statuses?: TestRunStatus[]; page: number; rowsPerPage: number },
  ): Promise<{ data: TestRun[]; total: number }> {
    let query = supabase
      .from('test_runs')
      .select('*', { count: 'exact' })
      .eq('test_plan_id', testPlanId);

    if (options.search?.trim()) {
      const q = options.search.trim();
      query = query.or(`name.ilike.%${q}%,code.ilike.%${q}%`);
    }
    if (options.statuses?.length) {
      query = query.in('status', options.statuses);
    }

    if (options.rowsPerPage > 0) {
      const from = (options.page - 1) * options.rowsPerPage;
      query = query.range(from, from + options.rowsPerPage - 1);
    }

    const { data, error, count } = await query.order('started_at', { ascending: false });

    if (error) throw error;
    return { data: (data ?? []).map(mapTestRunRow), total: count ?? 0 };
  },

  async findAllByProject(
    projectId: string,
    options?: { search?: string; statuses?: TestRunStatus[] },
  ): Promise<TestRunWithPlan[]> {
    let query = supabase
      .from('test_runs')
      .select('*, test_plan:test_plans(name, code)')
      .eq('project_id', projectId);

    if (options?.search?.trim()) {
      const q = options.search.trim();
      query = query.or(`name.ilike.%${q}%,code.ilike.%${q}%`);
    }
    if (options?.statuses?.length) {
      query = query.in('status', options.statuses);
    }

    const { data, error } = await query.order('started_at', { ascending: false });

    if (error) throw error;
    return (data ?? []).map((row: any) => ({
      ...mapTestRunRow(row),
      testPlanName: row.test_plan?.name ?? null,
      testPlanCode: row.test_plan?.code ?? null,
    }));
  },

  async findById(id: string): Promise<TestRun | null> {
    const { data, error } = await supabase.from('test_runs').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? mapTestRunRow(data) : null;
  },

  async create(input: { projectId: string; testPlanId?: string | null; name: string; code?: string | null; startedBy?: string | null }): Promise<TestRun> {
    const { data, error } = await supabase
      .from('test_runs')
      .insert({
        project_id: input.projectId,
        test_plan_id: input.testPlanId ?? null,
        name: input.name,
        code: input.code || undefined,
        started_by: input.startedBy ?? null,
      })
      .select('*')
      .single();

    if (error) throw error;
    return mapTestRunRow(data);
  },

  async update(id: string, changes: { name?: string; code?: string }): Promise<TestRun> {
    const { data, error } = await supabase.from('test_runs').update(changes).eq('id', id).select('*').single();
    if (error) throw error;
    return mapTestRunRow(data);
  },

  async updateStatus(id: string, status: TestRunStatus, notes?: string | null): Promise<TestRun> {
    const payload: Record<string, unknown> = { status };
    if (status === 'completed') payload.completed_at = new Date().toISOString();
    if (notes !== undefined) payload.notes = notes;
    const { data, error } = await supabase.from('test_runs').update(payload).eq('id', id).select('*').single();
    if (error) throw error;
    return mapTestRunRow(data);
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('test_runs').delete().eq('id', id);
    if (error) throw error;
  },
};
