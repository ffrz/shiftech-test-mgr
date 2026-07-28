import { supabase } from '../config/supabaseClient';
import {
  mapTestSuiteItemRow,
  mapTestSuiteItemStepRow,
  mapTestSuiteRow,
} from '../helpers/mappers';
import type { TestSuite, TestSuiteItem, TestSuiteItemStep, TestSuiteVisibility } from '../types/domain';

export const testSuiteRepository = {
  async findAllPaginated(params: {
    search?: string;
    ownership?: 'mine' | 'all';
    visibilityFilter?: string[];
    userId?: string;
    page: number;
    pageSize: number;
    sortField?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ data: TestSuite[]; total: number }> {
    let query = supabase.from('test_suites').select('*', { count: 'exact' });

    if (params.ownership === 'mine' && params.userId) {
      query = query.eq('owner_id', params.userId);
    }

    if (params.search) {
      const q = params.search.replace(/%/g, '');
      query = query.ilike('name', `%${q}%`);
    }

    if (params.visibilityFilter?.length) {
      query = query.in('visibility', params.visibilityFilter);
    }

    const sortFieldMap: Record<string, string> = {
      name: 'name',
      updatedAt: 'updated_at',
      createdAt: 'created_at',
    };
    const col = sortFieldMap[params.sortField ?? 'name'] ?? 'name';
    query = query.order(col, { ascending: params.sortOrder !== 'desc' });

    const from = (params.page - 1) * params.pageSize;
    query = query.range(from, from + params.pageSize - 1);

    const { data, error, count } = await query;
    if (error) throw error;
    return { data: (data ?? []).map(mapTestSuiteRow), total: count ?? 0 };
  },

  async findAll(): Promise<TestSuite[]> {
    const { data, error } = await supabase.from('test_suites').select('*').order('name');
    if (error) throw error;
    return (data ?? []).map(mapTestSuiteRow);
  },

  async findById(id: string): Promise<TestSuite | null> {
    const { data, error } = await supabase.from('test_suites').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? mapTestSuiteRow(data) : null;
  },

  async create(input: { name: string; description: string | null; visibility?: TestSuiteVisibility }): Promise<TestSuite> {
    const { data, error } = await supabase
      .from('test_suites')
      .insert({ name: input.name, description: input.description, visibility: input.visibility })
      .select('*')
      .single();
    if (error) throw error;
    return mapTestSuiteRow(data);
  },

  async update(id: string, changes: { name?: string; description?: string | null; visibility?: TestSuiteVisibility }): Promise<TestSuite> {
    const { data, error } = await supabase.from('test_suites').update(changes).eq('id', id).select('*').single();
    if (error) throw error;
    return mapTestSuiteRow(data);
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('test_suites').delete().eq('id', id);
    if (error) throw error;
  },

  // --- Suite items ---

  async findItemsBySuite(suiteId: string): Promise<TestSuiteItem[]> {
    const { data, error } = await supabase
      .from('test_suite_items')
      .select('*')
      .eq('suite_id', suiteId)
      .order('order_index', { ascending: true });
    if (error) throw error;
    return (data ?? []).map(mapTestSuiteItemRow);
  },

  async findItemsByIds(itemIds: string[]): Promise<TestSuiteItem[]> {
    if (itemIds.length === 0) return [];
    const { data, error } = await supabase.from('test_suite_items').select('*').in('id', itemIds);
    if (error) throw error;
    return (data ?? []).map(mapTestSuiteItemRow);
  },

  async createItem(
    input: Omit<TestSuiteItem, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<TestSuiteItem> {
    const { data, error } = await supabase
      .from('test_suite_items')
      .insert({
        suite_id: input.suiteId,
        module_name: input.moduleName,
        title: input.title,
        objective: input.objective,
        preconditions: input.preconditions,
        steps: input.steps,
        expected_result: input.expectedResult,
        priority: input.priority,
        step_type: input.stepType,
        target_role: input.targetRole,
        tag_names: input.tagNames,
        order_index: input.orderIndex,
      })
      .select('*')
      .single();
    if (error) throw error;
    return mapTestSuiteItemRow(data);
  },

  async updateItem(id: string, changes: Partial<Omit<TestSuiteItem, 'id' | 'suiteId' | 'createdAt' | 'updatedAt'>>): Promise<TestSuiteItem> {
    const payload: Record<string, unknown> = {};
    if (changes.moduleName !== undefined) payload.module_name = changes.moduleName;
    if (changes.title !== undefined) payload.title = changes.title;
    if (changes.objective !== undefined) payload.objective = changes.objective;
    if (changes.preconditions !== undefined) payload.preconditions = changes.preconditions;
    if (changes.steps !== undefined) payload.steps = changes.steps;
    if (changes.expectedResult !== undefined) payload.expected_result = changes.expectedResult;
    if (changes.priority !== undefined) payload.priority = changes.priority;
    if (changes.stepType !== undefined) payload.step_type = changes.stepType;
    if (changes.targetRole !== undefined) payload.target_role = changes.targetRole;
    if (changes.tagNames !== undefined) payload.tag_names = changes.tagNames;
    if (changes.orderIndex !== undefined) payload.order_index = changes.orderIndex;

    const { data, error } = await supabase.from('test_suite_items').update(payload).eq('id', id).select('*').single();
    if (error) throw error;
    return mapTestSuiteItemRow(data);
  },

  async removeItem(id: string): Promise<void> {
    const { error } = await supabase.from('test_suite_items').delete().eq('id', id);
    if (error) throw error;
  },

  async removeItemsMany(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const { error } = await supabase.from('test_suite_items').delete().in('id', ids);
    if (error) throw error;
  },

  async createItemsMany(
    inputs: Omit<TestSuiteItem, 'id' | 'createdAt' | 'updatedAt'>[],
  ): Promise<TestSuiteItem[]> {
    if (inputs.length === 0) return [];
    const { data, error } = await supabase
      .from('test_suite_items')
      .insert(
        inputs.map((i) => ({
          suite_id: i.suiteId,
          module_name: i.moduleName,
          title: i.title,
          objective: i.objective,
          preconditions: i.preconditions,
          steps: i.steps,
          expected_result: i.expectedResult,
          priority: i.priority,
          step_type: i.stepType,
          target_role: i.targetRole,
          tag_names: i.tagNames,
          order_index: i.orderIndex,
        })),
      )
      .select('*');
    if (error) throw error;
    return (data ?? []).map(mapTestSuiteItemRow);
  },

  async findStepsByItems(suiteItemIds: string[]): Promise<TestSuiteItemStep[]> {
    if (suiteItemIds.length === 0) return [];
    const { data, error } = await supabase
      .from('test_suite_item_steps')
      .select('*')
      .in('suite_item_id', suiteItemIds)
      .order('step_number', { ascending: true });
    if (error) throw error;
    return (data ?? []).map(mapTestSuiteItemStepRow);
  },

  async createStepsMany(
    steps: { suiteItemId: string; action: string; expectedResult: string | null; stepNumber: number }[],
  ): Promise<TestSuiteItemStep[]> {
    if (steps.length === 0) return [];
    const { data, error } = await supabase
      .from('test_suite_item_steps')
      .insert(
        steps.map((s) => ({
          suite_item_id: s.suiteItemId,
          step_number: s.stepNumber,
          action: s.action,
          expected_result: s.expectedResult,
        })),
      )
      .select('*');
    if (error) throw error;
    return (data ?? []).map(mapTestSuiteItemStepRow);
  },

  // --- Item steps (only meaningful when stepType === 'detailed') ---

  async findStepsByItem(suiteItemId: string): Promise<TestSuiteItemStep[]> {
    const { data, error } = await supabase
      .from('test_suite_item_steps')
      .select('*')
      .eq('suite_item_id', suiteItemId)
      .order('step_number', { ascending: true });
    if (error) throw error;
    return (data ?? []).map(mapTestSuiteItemStepRow);
  },

  // Full-replace, mirrors testCaseStepRepository.replaceForTestCase.
  async replaceStepsForItem(
    suiteItemId: string,
    steps: { action: string; expectedResult: string | null }[],
  ): Promise<TestSuiteItemStep[]> {
    const { error: deleteError } = await supabase
      .from('test_suite_item_steps')
      .delete()
      .eq('suite_item_id', suiteItemId);
    if (deleteError) throw deleteError;

    if (steps.length === 0) return [];

    const { data, error } = await supabase
      .from('test_suite_item_steps')
      .insert(
        steps.map((step, index) => ({
          suite_item_id: suiteItemId,
          step_number: index + 1,
          action: step.action,
          expected_result: step.expectedResult,
        })),
      )
      .select('*')
      .order('step_number', { ascending: true });

    if (error) throw error;
    return (data ?? []).map(mapTestSuiteItemStepRow);
  },
};
