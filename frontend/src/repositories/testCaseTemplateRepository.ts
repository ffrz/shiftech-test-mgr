import { supabase } from '../config/supabaseClient';
import {
  mapTestCaseTemplateItemRow,
  mapTestCaseTemplateItemStepRow,
  mapTestCaseTemplateRow,
} from '../helpers/mappers';
import type { TestCaseTemplate, TestCaseTemplateItem, TestCaseTemplateItemStep } from '../types/domain';

export const testCaseTemplateRepository = {
  async findAll(): Promise<TestCaseTemplate[]> {
    const { data, error } = await supabase.from('test_case_templates').select('*').order('name');
    if (error) throw error;
    return (data ?? []).map(mapTestCaseTemplateRow);
  },

  async findById(id: string): Promise<TestCaseTemplate | null> {
    const { data, error } = await supabase.from('test_case_templates').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? mapTestCaseTemplateRow(data) : null;
  },

  async create(input: { name: string; description: string | null }): Promise<TestCaseTemplate> {
    const { data, error } = await supabase
      .from('test_case_templates')
      .insert({ name: input.name, description: input.description })
      .select('*')
      .single();
    if (error) throw error;
    return mapTestCaseTemplateRow(data);
  },

  async update(id: string, changes: { name?: string; description?: string | null }): Promise<TestCaseTemplate> {
    const { data, error } = await supabase.from('test_case_templates').update(changes).eq('id', id).select('*').single();
    if (error) throw error;
    return mapTestCaseTemplateRow(data);
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('test_case_templates').delete().eq('id', id);
    if (error) throw error;
  },

  // --- Template items ---

  async findItemsByTemplate(templateId: string): Promise<TestCaseTemplateItem[]> {
    const { data, error } = await supabase
      .from('test_case_template_items')
      .select('*')
      .eq('template_id', templateId)
      .order('order_index', { ascending: true });
    if (error) throw error;
    return (data ?? []).map(mapTestCaseTemplateItemRow);
  },

  async findItemsByIds(itemIds: string[]): Promise<TestCaseTemplateItem[]> {
    if (itemIds.length === 0) return [];
    const { data, error } = await supabase.from('test_case_template_items').select('*').in('id', itemIds);
    if (error) throw error;
    return (data ?? []).map(mapTestCaseTemplateItemRow);
  },

  async createItem(
    input: Omit<TestCaseTemplateItem, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<TestCaseTemplateItem> {
    const { data, error } = await supabase
      .from('test_case_template_items')
      .insert({
        template_id: input.templateId,
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
    return mapTestCaseTemplateItemRow(data);
  },

  async updateItem(id: string, changes: Partial<Omit<TestCaseTemplateItem, 'id' | 'templateId' | 'createdAt' | 'updatedAt'>>): Promise<TestCaseTemplateItem> {
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

    const { data, error } = await supabase.from('test_case_template_items').update(payload).eq('id', id).select('*').single();
    if (error) throw error;
    return mapTestCaseTemplateItemRow(data);
  },

  async removeItem(id: string): Promise<void> {
    const { error } = await supabase.from('test_case_template_items').delete().eq('id', id);
    if (error) throw error;
  },

  // --- Item steps (only meaningful when stepType === 'detailed') ---

  async findStepsByItem(templateItemId: string): Promise<TestCaseTemplateItemStep[]> {
    const { data, error } = await supabase
      .from('test_case_template_item_steps')
      .select('*')
      .eq('template_item_id', templateItemId)
      .order('step_number', { ascending: true });
    if (error) throw error;
    return (data ?? []).map(mapTestCaseTemplateItemStepRow);
  },

  // Full-replace, mirrors testCaseStepRepository.replaceForTestCase.
  async replaceStepsForItem(
    templateItemId: string,
    steps: { action: string; expectedResult: string | null }[],
  ): Promise<TestCaseTemplateItemStep[]> {
    const { error: deleteError } = await supabase
      .from('test_case_template_item_steps')
      .delete()
      .eq('template_item_id', templateItemId);
    if (deleteError) throw deleteError;

    if (steps.length === 0) return [];

    const { data, error } = await supabase
      .from('test_case_template_item_steps')
      .insert(
        steps.map((step, index) => ({
          template_item_id: templateItemId,
          step_number: index + 1,
          action: step.action,
          expected_result: step.expectedResult,
        })),
      )
      .select('*')
      .order('step_number', { ascending: true });

    if (error) throw error;
    return (data ?? []).map(mapTestCaseTemplateItemStepRow);
  },
};
