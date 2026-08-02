import type { TestCase, TestCaseWithDetails, TestPlanCase, TestPlanCaseWithDetails } from '../../types/domain';

export interface TestCaseRepository {
  searchByProject(projectId: string, query: string, limit?: number): Promise<Pick<TestCase, 'id' | 'code' | 'title'>[]>;
  findByCode(projectId: string, code: string): Promise<TestCase | null>;
  findAllByProject(projectId: string): Promise<TestCase[]>;
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
  ): Promise<TestCaseWithDetails[]>;
  findByIdsWithDetails(ids: string[]): Promise<TestCaseWithDetails[]>;
  findById(id: string): Promise<TestCase | null>;
  findByIdWithDetails(id: string): Promise<(TestCaseWithDetails & { project: { id: string; name: string } }) | null>;
  create(
    input: Omit<TestCase, 'id' | 'createdAt' | 'updatedAt' | 'code' | 'createdBy'> & { code?: string | null; createdBy?: string | null },
  ): Promise<TestCase>;
  update(id: string, changes: Partial<Omit<TestCase, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>>): Promise<TestCase>;
  createMany(
    inputs: (Omit<TestCase, 'id' | 'createdAt' | 'updatedAt' | 'code' | 'createdBy'> & { code?: string | null; createdBy?: string | null })[],
  ): Promise<TestCase[]>;
  remove(id: string): Promise<void>;
  findCasesForPlan(testPlanId: string): Promise<TestPlanCaseWithDetails[]>;
  findCasesForPlanPaginated(
    testPlanId: string,
    options: { search?: string; priorities?: string[]; moduleIds?: string[]; tagIds?: string[]; testRoleIds?: string[]; page: number; rowsPerPage: number },
  ): Promise<{ data: TestPlanCaseWithDetails[]; total: number }>;
  attachToPlanMany(inputs: { testPlanId: string; testCaseId: string; order: number }[]): Promise<TestPlanCase[]>;
  attachToPlan(testPlanId: string, testCaseId: string, order: number): Promise<TestPlanCase>;
  findAdjacentPlanCase(testPlanId: string, order: number, direction: 'before' | 'after'): Promise<TestPlanCase | null>;
  swapCaseOrder(testPlanCaseIdA: string, orderA: number, testPlanCaseIdB: string, orderB: number): Promise<void>;
  detachFromPlan(testPlanCaseId: string): Promise<void>;
}
