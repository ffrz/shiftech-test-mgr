import { supabase } from '../../../config/supabaseClient';
import { mapTestCaseStepRow } from '../../../helpers/mappers';
import type { TestCaseStepRepository } from '../../interfaces/testCaseStepRepository';
import type { TestCaseStep } from '../../../types/domain';

export const testCaseStepRepositoryAdapter: TestCaseStepRepository = {
  async findAllByTestCase(testCaseId: string): Promise<TestCaseStep[]> {
    const { data, error } = await supabase
      .from('test_case_steps')
      .select('*')
      .eq('test_case_id', testCaseId)
      .order('step_number', { ascending: true });
    if (error) throw error;
    return (data ?? []).map(mapTestCaseStepRow);
  },

  async findAllByTestCases(testCaseIds: string[]): Promise<TestCaseStep[]> {
    if (testCaseIds.length === 0) return [];
    const { data, error } = await supabase
      .from('test_case_steps')
      .select('*')
      .in('test_case_id', testCaseIds)
      .order('step_number', { ascending: true });
    if (error) throw error;
    return (data ?? []).map(mapTestCaseStepRow);
  },

  async createMany(
    steps: { testCaseId: string; action: string; expectedResult: string | null; stepNumber: number }[],
  ): Promise<TestCaseStep[]> {
    if (steps.length === 0) return [];
    const { data, error } = await supabase
      .from('test_case_steps')
      .insert(steps.map((s) => ({
        test_case_id: s.testCaseId, step_number: s.stepNumber,
        action: s.action, expected_result: s.expectedResult,
      })))
      .select('*');
    if (error) throw error;
    return (data ?? []).map(mapTestCaseStepRow);
  },

  async replaceForTestCase(
    testCaseId: string,
    steps: { action: string; expectedResult: string | null }[],
  ): Promise<TestCaseStep[]> {
    const { error: deleteError } = await supabase.from('test_case_steps').delete().eq('test_case_id', testCaseId);
    if (deleteError) throw deleteError;
    if (steps.length === 0) return [];
    const { data, error } = await supabase
      .from('test_case_steps')
      .insert(steps.map((step, index) => ({
        test_case_id: testCaseId, step_number: index + 1,
        action: step.action, expected_result: step.expectedResult,
      })))
      .select('*').order('step_number', { ascending: true });
    if (error) throw error;
    return (data ?? []).map(mapTestCaseStepRow);
  },
};
