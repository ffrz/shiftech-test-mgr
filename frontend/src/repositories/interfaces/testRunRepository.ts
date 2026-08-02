import type { TestRun, TestRunStatus } from '../../types/domain';

export type TestRunWithPlan = TestRun & { testPlanName: string | null; testPlanCode: string | null };

export interface TestRunRepository {
  findAllByPlan(testPlanId: string): Promise<TestRun[]>;
  findAllByPlanPaginated(
    testPlanId: string,
    options: { search?: string; statuses?: TestRunStatus[]; page: number; rowsPerPage: number },
  ): Promise<{ data: TestRun[]; total: number }>;
  findAllByProject(
    projectId: string,
    options?: { search?: string; statuses?: TestRunStatus[] },
  ): Promise<TestRunWithPlan[]>;
  findById(id: string): Promise<TestRun | null>;
  create(input: { projectId: string; testPlanId?: string | null; name: string; code?: string | null; startedBy?: string | null }): Promise<TestRun>;
  update(id: string, changes: { name?: string; code?: string }): Promise<TestRun>;
  updateStatus(id: string, status: TestRunStatus, notes?: string | null): Promise<TestRun>;
  remove(id: string): Promise<void>;
}
