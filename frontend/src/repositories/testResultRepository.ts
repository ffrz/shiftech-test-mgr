import { testResultRepositoryAdapter } from './adapters/testResultResolver';
import type { TestResult, TestResultStatus, TestResultWithDetails } from '../types/domain';

export const testResultRepository = {
  seedForRun(testRunId: string, testCaseIds: string[]): Promise<void> {
    return testResultRepositoryAdapter.seedForRun(testRunId, testCaseIds);
  },

  findAllByRun(testRunId: string): Promise<TestResultWithDetails[]> {
    return testResultRepositoryAdapter.findAllByRun(testRunId);
  },

  syncWithTestCase(id: string): Promise<TestResult> {
    return testResultRepositoryAdapter.syncWithTestCase(id);
  },

  getSummaryByRunIds(runIds: string[]): Promise<Record<string, { total: number; pass: number; fail: number }>> {
    return testResultRepositoryAdapter.getSummaryByRunIds(runIds);
  },

  getDistinctTestersByRunIds(runIds: string[]): Promise<Record<string, { id: string; fullName: string | null }[]>> {
    return testResultRepositoryAdapter.getDistinctTestersByRunIds(runIds);
  },

  recordResult(id: string, input: { status: TestResultStatus; testerId: string; notes: string | null }): Promise<TestResult> {
    return testResultRepositoryAdapter.recordResult(id, input);
  },

  recordStepResult(testResultStepId: string, input: { status: 'pass' | 'fail'; actualResult: string | null }) {
    return testResultRepositoryAdapter.recordStepResult(testResultStepId, input);
  },
};
