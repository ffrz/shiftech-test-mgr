import { supabase } from '../config/supabaseClient';
import { mapModuleRow, mapTagRow, mapTestCaseRow, mapTestPlanCaseRow } from '../helpers/mappers';
import type { TestCase, TestCaseWithDetails, TestPlanCase, TestPlanCaseWithDetails } from '../types/domain';

export const testCaseRepository = {
  async findAllByProject(projectId: string): Promise<TestCase[]> {
    const { data, error } = await supabase
      .from('test_cases')
      .select('*')
      .eq('project_id', projectId)
      .order('code');

    if (error) throw error;
    return (data ?? []).map(mapTestCaseRow);
  },

  // Includes module + tags in one round trip — used by the list page so the
  // Module column and tag chips don't need N+1 queries.
  async findAllByProjectWithDetails(projectId: string): Promise<TestCaseWithDetails[]> {
    const { data, error } = await supabase
      .from('test_cases')
      .select('*, module:modules(*), test_case_tags(tag:tags(*))')
      .eq('project_id', projectId)
      .order('code');

    if (error) throw error;
    return (data ?? []).map((row: any) => ({
      ...mapTestCaseRow(row),
      module: row.module ? mapModuleRow(row.module) : null,
      tags: (row.test_case_tags ?? []).map((t: any) => mapTagRow(t.tag)),
    }));
  },

  async findById(id: string): Promise<TestCase | null> {
    const { data, error } = await supabase.from('test_cases').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? mapTestCaseRow(data) : null;
  },

  async findByIdWithDetails(id: string): Promise<(TestCaseWithDetails & { project: { id: string; name: string } }) | null> {
    const { data, error } = await supabase
      .from('test_cases')
      .select('*, module:modules(*), test_case_tags(tag:tags(*)), project:projects(id, name)')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return {
      ...mapTestCaseRow(data),
      module: data.module ? mapModuleRow(data.module) : null,
      tags: (data.test_case_tags ?? []).map((t: any) => mapTagRow(t.tag)),
      project: data.project,
    };
  },

  // `code` optional — omit/empty lets the `set_test_case_code` DB trigger auto-generate TC-####.
  async create(input: Omit<TestCase, 'id' | 'createdAt' | 'updatedAt' | 'code'> & { code?: string | null }): Promise<TestCase> {
    const { data, error } = await supabase
      .from('test_cases')
      .insert({
        project_id: input.projectId,
        module_id: input.moduleId,
        code: input.code || undefined,
        title: input.title,
        objective: input.objective,
        preconditions: input.preconditions,
        steps: input.steps,
        expected_result: input.expectedResult,
        priority: input.priority,
        status: input.status,
        notes: input.notes,
        step_type: input.stepType,
      })
      .select('*')
      .single();

    if (error) throw error;
    return mapTestCaseRow(data);
  },

  async update(id: string, changes: Partial<Omit<TestCase, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>>): Promise<TestCase> {
    const payload: Record<string, unknown> = {};
    if (changes.moduleId !== undefined) payload.module_id = changes.moduleId;
    if (changes.code !== undefined) payload.code = changes.code;
    if (changes.title !== undefined) payload.title = changes.title;
    if (changes.objective !== undefined) payload.objective = changes.objective;
    if (changes.preconditions !== undefined) payload.preconditions = changes.preconditions;
    if (changes.steps !== undefined) payload.steps = changes.steps;
    if (changes.expectedResult !== undefined) payload.expected_result = changes.expectedResult;
    if (changes.priority !== undefined) payload.priority = changes.priority;
    if (changes.status !== undefined) payload.status = changes.status;
    if (changes.notes !== undefined) payload.notes = changes.notes;
    if (changes.stepType !== undefined) payload.step_type = changes.stepType;

    const { data, error } = await supabase
      .from('test_cases')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    return mapTestCaseRow(data);
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('test_cases').delete().eq('id', id);
    if (error) throw error;
  },

  // --- Junction: which test cases are in scope for a test plan (no result columns) ---

  async findCasesForPlan(testPlanId: string): Promise<TestPlanCaseWithDetails[]> {
    const { data, error } = await supabase
      .from('test_plan_cases')
      .select('*, test_case:test_cases(*, module:modules(*), test_case_tags(tag:tags(*)))')
      .eq('test_plan_id', testPlanId)
      .order('order', { ascending: true });

    if (error) throw error;
    return (data ?? []).map((row: any) => ({
      ...mapTestPlanCaseRow(row),
      testCase: {
        ...mapTestCaseRow(row.test_case),
        module: row.test_case.module ? mapModuleRow(row.test_case.module) : null,
        tags: (row.test_case.test_case_tags ?? []).map((t: any) => mapTagRow(t.tag)),
      },
    }));
  },

  async attachToPlan(testPlanId: string, testCaseId: string, order: number): Promise<TestPlanCase> {
    const { data, error } = await supabase
      .from('test_plan_cases')
      .insert({ test_plan_id: testPlanId, test_case_id: testCaseId, order })
      .select('*')
      .single();

    if (error) throw error;
    return mapTestPlanCaseRow(data);
  },

  // Bulk update after a drag-reorder — each testPlanCaseId gets its array index as its new
  // `order`. Sequence is a guide for workflow-style test plans, not an execution constraint
  // (testers can still record results out of order) — this only changes the order rows are
  // listed/inherited into new Test Runs.
  async reorderCases(orderedTestPlanCaseIds: string[]): Promise<void> {
    await Promise.all(
      orderedTestPlanCaseIds.map((testPlanCaseId, index) =>
        supabase.from('test_plan_cases').update({ order: index }).eq('id', testPlanCaseId).then(({ error }) => {
          if (error) throw error;
        }),
      ),
    );
  },

  async detachFromPlan(testPlanCaseId: string): Promise<void> {
    const { error } = await supabase.from('test_plan_cases').delete().eq('id', testPlanCaseId);
    if (error) throw error;
  },
};
