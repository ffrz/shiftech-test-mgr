import type { TestResult, TestResultStatus, TestResultStep, TestResultWithDetails } from '../../types/domain';

export interface TestResultRepository {
  seedForRun(testRunId: string, testCaseIds: string[]): Promise<void>;
  findAllByRun(testRunId: string): Promise<TestResultWithDetails[]>;
  syncWithTestCase(id: string): Promise<TestResult>;
  getSummaryByRunIds(runIds: string[]): Promise<Record<string, { total: number; pass: number; fail: number }>>;
  getDistinctTestersByRunIds(runIds: string[]): Promise<Record<string, { id: string; fullName: string | null }[]>>;
  recordResult(id: string, input: { status: TestResultStatus; testerId: string; notes: string | null }): Promise<TestResult>;
  recordStepResult(testResultStepId: string, input: { status: 'pass' | 'fail'; actualResult: string | null }): Promise<TestResultStep>;
}
