import { testRunRepositoryAdapter } from './adapters/testRunResolver';
import type { TestRun, TestRunStatus } from '../types/domain';

export const testRunRepository = {
  findAllByPlan(testPlanId: string): Promise<TestRun[]> {
    return testRunRepositoryAdapter.findAllByPlan(testPlanId);
  },

  findAllByPlanPaginated(
    testPlanId: string,
    options: { search?: string; statuses?: TestRunStatus[]; page: number; rowsPerPage: number },
  ): Promise<{ data: TestRun[]; total: number }> {
    return testRunRepositoryAdapter.findAllByPlanPaginated(testPlanId, options);
  },

  findAllByProject(
    projectId: string,
    options?: { search?: string; statuses?: TestRunStatus[] },
  ): Promise<(TestRun & { testPlanName: string | null; testPlanCode: string | null })[]> {
    return testRunRepositoryAdapter.findAllByProject(projectId, options);
  },

  findById(id: string): Promise<TestRun | null> {
    return testRunRepositoryAdapter.findById(id);
  },

  create(input: { projectId: string; testPlanId?: string | null; name: string; code?: string | null; startedBy?: string | null }): Promise<TestRun> {
    return testRunRepositoryAdapter.create(input);
  },

  update(id: string, changes: { name?: string; code?: string }): Promise<TestRun> {
    return testRunRepositoryAdapter.update(id, changes);
  },

  updateStatus(id: string, status: TestRunStatus, notes?: string | null): Promise<TestRun> {
    return testRunRepositoryAdapter.updateStatus(id, status, notes);
  },

  remove(id: string): Promise<void> {
    return testRunRepositoryAdapter.remove(id);
  },
};
