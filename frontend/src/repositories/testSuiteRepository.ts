import { supabase } from '../config/supabaseClient';
import {
  mapTestSuiteItemRow,
  mapTestSuiteItemStepRow,
  mapTestSuiteRow,
} from '../helpers/mappers';
import type { TestSuite, TestSuiteItem, TestSuiteItemStep } from '../types/domain';

export const testSuiteRepository = {
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

  async create(input: { name: string; description: string | null }): Promise<TestSuite> {
    const { data, error } = await supabase
      .from('test_suites')
      .insert({ name: input.name, description: input.description })
      .select('*')
      .single();
    if (error) throw error;
    return mapTestSuiteRow(data);
  },

  async update(id: string, changes: { name?: string; description?: string | null }): Promise<TestSuite> {
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
