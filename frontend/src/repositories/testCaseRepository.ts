import { testCaseRepositoryAdapter } from './adapters/testCaseResolver';
import type { TestCase, TestCaseWithDetails, TestPlanCase, TestPlanCaseWithDetails } from '../types/domain';

export const testCaseRepository = {
  searchByProject(projectId: string, query: string, limit = 5): Promise<Pick<TestCase, 'id' | 'code' | 'title'>[]> {
    return testCaseRepositoryAdapter.searchByProject(projectId, query, limit);
  },

  findByCode(projectId: string, code: string): Promise<TestCase | null> {
    return testCaseRepositoryAdapter.findByCode(projectId, code);
  },

  findAllByProject(projectId: string): Promise<TestCase[]> {
    return testCaseRepositoryAdapter.findAllByProject(projectId);
  },

  findAllByProjectWithDetails(
    projectId: string,
    options?: {
      search?: string;
      statuses?: TestCase['status'][];
      priorities?: TestCase['priority'][];
      moduleIds?: string[];
      tagIds?: string[];
      testRoleIds?: string[];
    },
  ): Promise<TestCaseWithDetails[]> {
    return testCaseRepositoryAdapter.findAllByProjectWithDetails(projectId, options);
  },

  findByIdsWithDetails(ids: string[]): Promise<TestCaseWithDetails[]> {
    return testCaseRepositoryAdapter.findByIdsWithDetails(ids);
  },

  findById(id: string): Promise<TestCase | null> {
    return testCaseRepositoryAdapter.findById(id);
  },

  findByIdWithDetails(id: string): Promise<(TestCaseWithDetails & { project: { id: string; name: string } }) | null> {
    return testCaseRepositoryAdapter.findByIdWithDetails(id);
  },

  create(
    input: Omit<TestCase, 'id' | 'createdAt' | 'updatedAt' | 'code' | 'createdBy'> & { code?: string | null; createdBy?: string | null },
  ): Promise<TestCase> {
    return testCaseRepositoryAdapter.create(input);
  },

  update(id: string, changes: Partial<Omit<TestCase, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>>): Promise<TestCase> {
    return testCaseRepositoryAdapter.update(id, changes);
  },

  createMany(
    inputs: (Omit<TestCase, 'id' | 'createdAt' | 'updatedAt' | 'code' | 'createdBy'> & { code?: string | null; createdBy?: string | null })[],
  ): Promise<TestCase[]> {
    return testCaseRepositoryAdapter.createMany(inputs);
  },

  remove(id: string): Promise<void> {
    return testCaseRepositoryAdapter.remove(id);
  },

  findCasesForPlan(testPlanId: string): Promise<TestPlanCaseWithDetails[]> {
    return testCaseRepositoryAdapter.findCasesForPlan(testPlanId);
  },

  findCasesForPlanPaginated(
    testPlanId: string,
    options: { search?: string; priorities?: string[]; moduleIds?: string[]; tagIds?: string[]; testRoleIds?: string[]; page: number; rowsPerPage: number },
  ): Promise<{ data: TestPlanCaseWithDetails[]; total: number }> {
    return testCaseRepositoryAdapter.findCasesForPlanPaginated(testPlanId, options);
  },

  attachToPlanMany(
    inputs: { testPlanId: string; testCaseId: string; order: number }[],
  ): Promise<TestPlanCase[]> {
    return testCaseRepositoryAdapter.attachToPlanMany(inputs);
  },

  attachToPlan(testPlanId: string, testCaseId: string, order: number): Promise<TestPlanCase> {
    return testCaseRepositoryAdapter.attachToPlan(testPlanId, testCaseId, order);
  },

  findAdjacentPlanCase(testPlanId: string, order: number, direction: 'before' | 'after'): Promise<TestPlanCase | null> {
    return testCaseRepositoryAdapter.findAdjacentPlanCase(testPlanId, order, direction);
  },

  swapCaseOrder(testPlanCaseIdA: string, orderA: number, testPlanCaseIdB: string, orderB: number): Promise<void> {
    return testCaseRepositoryAdapter.swapCaseOrder(testPlanCaseIdA, orderA, testPlanCaseIdB, orderB);
  },

  detachFromPlan(testPlanCaseId: string): Promise<void> {
    return testCaseRepositoryAdapter.detachFromPlan(testPlanCaseId);
  },
};
