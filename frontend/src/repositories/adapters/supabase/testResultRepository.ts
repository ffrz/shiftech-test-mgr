import { supabase } from '../../../config/supabaseClient';
import { mapModuleRow, mapProfileRow, mapTagRow, mapTestCaseRow, mapTestCaseStepRow, mapTestResultRow, mapTestResultStepRow, mapTestRoleRow } from '../../../helpers/mappers';
import type { TestResult, TestResultStatus, TestResultStep, TestResultWithDetails } from '../../../types/domain';
import type { TestResultRepository } from '../../interfaces/testResultRepository';

export const testResultRepositoryAdapter: TestResultRepository = {
  async seedForRun(testRunId: string, testCaseIds: string[]): Promise<void> {
    if (testCaseIds.length === 0) return;
    const { data: testCases, error: fetchError } = await supabase
      .from('test_cases')
      .select('*')
      .in('id', testCaseIds);
    if (fetchError) throw fetchError;

    if (!testCases || testCases.length === 0) {
      throw new Error('No test cases could be retrieved to start the run — check RLS access or whether the test cases were deleted.');
    }
    if (testCases.length !== testCaseIds.length) {
      throw new Error(
        `Only ${testCases.length} of ${testCaseIds.length} test cases in the plan's scope could be retrieved — some may have been deleted or are inaccessible.`,
      );
    }

    const orderByTestCaseId = new Map(testCaseIds.map((caseId, index) => [caseId, index]));
    const rows = testCases.map((tc: any) => ({
      test_run_id: testRunId,
      test_case_id: tc.id,
      test_case_code: tc.code,
      test_case_title: tc.title,
      test_case_objective: tc.objective,
      test_case_preconditions: tc.preconditions,
      test_case_steps: tc.steps,
      test_case_expected_result: tc.expected_result,
      test_case_priority: tc.priority,
      test_case_notes: tc.notes,
      order: orderByTestCaseId.get(tc.id) ?? 0,
    }));
    const { data: insertedResults, error } = await supabase.from('test_results').insert(rows).select('id, test_case_id');
    if (error) throw error;

    const detailedCaseIds = (testCases ?? []).filter((tc: any) => tc.step_type === 'detailed').map((tc: any) => tc.id);
    if (detailedCaseIds.length === 0) return;

    const { data: templateSteps, error: stepsError } = await supabase
      .from('test_case_steps')
      .select('id, test_case_id')
      .in('test_case_id', detailedCaseIds);
    if (stepsError) throw stepsError;
    if (!templateSteps?.length) return;

    const resultIdByCaseId = Object.fromEntries((insertedResults ?? []).map((r: any) => [r.test_case_id, r.id]));
    const stepResultRows = templateSteps
      .map((step: any) => ({
        test_result_id: resultIdByCaseId[step.test_case_id],
        test_case_step_id: step.id,
      }))
      .filter((row) => row.test_result_id);

    if (stepResultRows.length === 0) return;
    const { error: seedStepsError } = await supabase.from('test_result_steps').insert(stepResultRows);
    if (seedStepsError) throw seedStepsError;
  },

  async findAllByRun(testRunId: string): Promise<TestResultWithDetails[]> {
    const { data, error } = await supabase
      .from('test_results')
      .select(
        '*, test_case:test_cases(*, module:modules(*), target_role:test_roles(*), test_case_tags(tag:tags(*))), tester:users!test_results_tester_id_fkey(profile:profiles(*)), test_result_steps(*, test_case_step:test_case_steps(*))',
      )
      .eq('test_run_id', testRunId)
      .order('order', { ascending: true });

    if (error) throw error;
    return (data ?? []).map((row: any) => ({
      ...mapTestResultRow(row),
      testCase: row.test_case
        ? {
            ...mapTestCaseRow(row.test_case),
            module: row.test_case.module ? mapModuleRow(row.test_case.module) : null,
            targetRole: row.test_case.target_role ? mapTestRoleRow(row.test_case.target_role) : null,
            tags: (row.test_case.test_case_tags ?? []).map((t: any) => mapTagRow(t.tag)),
          }
        : null,
      tester: row.tester?.profile ? mapProfileRow(row.tester.profile) : null,
      stepResults: (row.test_result_steps ?? [])
        .filter((sr: any) => sr.test_case_step)
        .map((sr: any) => ({
          ...mapTestResultStepRow(sr),
          step: mapTestCaseStepRow(sr.test_case_step),
        }))
        .sort((a: any, b: any) => a.step.stepNumber - b.step.stepNumber),
    }));
  },

  async syncWithTestCase(id: string): Promise<TestResult> {
    const { data: result, error: fetchError } = await supabase
      .from('test_results')
      .select('test_case_id')
      .eq('id', id)
      .single();
    if (fetchError) throw fetchError;

    const { data: testCase, error: testCaseError } = await supabase
      .from('test_cases')
      .select('*')
      .eq('id', result.test_case_id)
      .single();
    if (testCaseError) throw testCaseError;

    const { data, error } = await supabase
      .from('test_results')
      .update({
        test_case_code: testCase.code,
        test_case_title: testCase.title,
        test_case_objective: testCase.objective,
        test_case_preconditions: testCase.preconditions,
        test_case_steps: testCase.steps,
        test_case_expected_result: testCase.expected_result,
        test_case_priority: testCase.priority,
        test_case_notes: testCase.notes,
      })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return mapTestResultRow(data);
  },

  async getSummaryByRunIds(runIds: string[]): Promise<Record<string, { total: number; pass: number; fail: number }>> {
    if (runIds.length === 0) return {};
    const { data, error } = await supabase
      .from('test_results')
      .select('test_run_id, status')
      .in('test_run_id', runIds);

    if (error) throw error;
    const map: Record<string, { total: number; pass: number; fail: number }> = {};
    for (const runId of runIds) map[runId] = { total: 0, pass: 0, fail: 0 };
    for (const row of data ?? []) {
      const entry = map[row.test_run_id];
      if (!entry) continue;
      entry.total++;
      if (row.status === 'pass') entry.pass++;
      if (row.status === 'fail') entry.fail++;
    }
    return map;
  },

  async getDistinctTestersByRunIds(runIds: string[]): Promise<Record<string, { id: string; fullName: string | null }[]>> {
    if (runIds.length === 0) return {};
    const { data, error } = await supabase
      .from('test_results')
      .select('test_run_id, tester_id')
      .in('test_run_id', runIds)
      .not('tester_id', 'is', null);

    if (error) throw error;
    const profileIds = [...new Set((data ?? []).map((r: any) => r.tester_id).filter(Boolean))];
    const map: Record<string, { id: string; fullName: string | null }[]> = {};
    if (profileIds.length === 0) return map;

    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, display_name')
      .in('id', profileIds);
    if (profileError) throw profileError;
    const profileMap = Object.fromEntries((profiles ?? []).map((p: any) => [p.id, { id: p.id, fullName: p.display_name }]));

    const seen = new Set<string>();
    for (const row of data ?? []) {
      const key = `${row.test_run_id}:${row.tester_id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const t = profileMap[row.tester_id];
      if (!t) continue;
      if (!map[row.test_run_id]) map[row.test_run_id] = [];
      map[row.test_run_id].push(t);
    }
    for (const runId of runIds) if (!map[runId]) map[runId] = [];
    return map;
  },

  async recordResult(
    id: string,
    input: { status: TestResultStatus; testerId: string; notes: string | null },
  ): Promise<TestResult> {
    const { data, error } = await supabase
      .from('test_results')
      .update({
        status: input.status,
        tester_id: input.testerId,
        notes: input.notes,
        executed_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    return mapTestResultRow(data);
  },

  async recordStepResult(
    testResultStepId: string,
    input: { status: 'pass' | 'fail'; actualResult: string | null },
  ): Promise<TestResultStep> {
    const { data, error } = await supabase
      .from('test_result_steps')
      .update({ status: input.status, actual_result: input.actualResult })
      .eq('id', testResultStepId)
      .select('*')
      .single();
    if (error) throw error;
    return mapTestResultStepRow(data);
  },
};
