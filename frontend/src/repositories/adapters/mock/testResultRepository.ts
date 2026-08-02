import type { TestResult, TestResultStatus, TestResultStep, TestResultStepWithDetails, TestResultWithDetails } from '../../../types/domain';
import type { TestResultRepository } from '../../interfaces/testResultRepository';

let seq = 0;
function nextId(): string {
  seq += 1;
  return `mock-testresult-${seq}`;
}
export function createMockTestResultRepository(seed: TestResultWithDetails[] = []): TestResultRepository {
  const store = new Map<string, TestResultWithDetails>(seed.map((r) => [r.id, r]));

  return {
    async seedForRun(testRunId: string, testCaseIds: string[]): Promise<void> {
      for (let i = 0; i < testCaseIds.length; i++) {
        const id = nextId();
        const now = new Date().toISOString();
        const result: TestResultWithDetails = {
          id,
          testRunId,
          testCaseId: testCaseIds[i],
          testerId: null,
          status: 'not_run',
          executedAt: null,
          notes: null,
          testCaseCode: null,
          testCaseTitle: `Mock Test Case ${testCaseIds[i]}`,
          testCaseObjective: null,
          testCasePreconditions: null,
          testCaseSteps: '',
          testCaseExpectedResult: '',
          testCasePriority: 'medium',
          testCaseNotes: null,
          order: i,
          createdAt: now,
          updatedAt: now,
          testCase: null,
          tester: null,
          stepResults: [],
        };
        store.set(id, result);
      }
    },

    async findAllByRun(testRunId: string): Promise<TestResultWithDetails[]> {
      return [...store.values()]
        .filter((r) => r.testRunId === testRunId)
        .sort((a, b) => a.order - b.order);
    },

    async syncWithTestCase(id: string): Promise<TestResult> {
      const existing = store.get(id);
      if (!existing) throw new Error(`mock test result not found: ${id}`);
      const updated: TestResultWithDetails = { ...existing, updatedAt: new Date().toISOString() };
      store.set(id, updated);
      return updated;
    },

    async getSummaryByRunIds(runIds: string[]): Promise<Record<string, { total: number; pass: number; fail: number }>> {
      const map: Record<string, { total: number; pass: number; fail: number }> = {};
      for (const runId of runIds) map[runId] = { total: 0, pass: 0, fail: 0 };
      for (const result of store.values()) {
        const entry = map[result.testRunId];
        if (!entry) continue;
        entry.total++;
        if (result.status === 'pass') entry.pass++;
        if (result.status === 'fail') entry.fail++;
      }
      return map;
    },

    async getDistinctTestersByRunIds(runIds: string[]): Promise<Record<string, { id: string; fullName: string | null }[]>> {
      const map: Record<string, { id: string; fullName: string | null }[]> = {};
      for (const runId of runIds) map[runId] = [];
      const seen = new Set<string>();
      for (const result of store.values()) {
        if (!result.testerId) continue;
        const key = `${result.testRunId}:${result.testerId}`;
        if (seen.has(key)) continue;
        seen.add(key);
        if (!map[result.testRunId]) continue;
        map[result.testRunId].push({
          id: result.testerId,
          fullName: result.tester?.displayName ?? null,
        });
      }
      return map;
    },

    async recordResult(
      id: string,
      input: { status: TestResultStatus; testerId: string; notes: string | null },
    ): Promise<TestResult> {
      const existing = store.get(id);
      if (!existing) throw new Error(`mock test result not found: ${id}`);
      const updated: TestResultWithDetails = {
        ...existing,
        status: input.status,
        testerId: input.testerId,
        notes: input.notes,
        executedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      store.set(id, updated);
      return updated;
    },

    async recordStepResult(
      testResultStepId: string,
      input: { status: 'pass' | 'fail'; actualResult: string | null },
    ): Promise<TestResultStep> {
      for (const result of store.values()) {
        const idx = result.stepResults.findIndex((s) => s.id === testResultStepId);
        if (idx === -1) continue;
        const step = result.stepResults[idx];
        const updated: TestResultStepWithDetails = {
          ...step,
          status: input.status,
          actualResult: input.actualResult,
          updatedAt: new Date().toISOString(),
        };
        result.stepResults[idx] = updated;
        return updated;
      }
      throw new Error(`mock test result step not found: ${testResultStepId}`);
    },
  };
}
