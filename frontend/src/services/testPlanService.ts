import { testPlanRepository } from '../repositories/testPlanRepository';
import { testCaseRepository } from '../repositories/testCaseRepository';
import type { TestPlan, TestPlanStatus } from '../types/domain';

// Service layer: business rules, validation, orchestration across repositories.
// Pages/components call services — never repositories directly.

export const testPlanService = {
  listByProject(projectId: string, options?: { search?: string; statuses?: TestPlan['status'][] }) {
    return testPlanRepository.findAllByProject(projectId, options);
  },

  getById(id: string) {
    return testPlanRepository.findById(id);
  },

  async create(input: { projectId: string; name: string; description?: string; code?: string }): Promise<TestPlan> {
    if (!input.name.trim()) {
      throw new Error('Test plan name cannot be empty');
    }
    return testPlanRepository.create({
      projectId: input.projectId,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      code: input.code?.trim() || null,
    });
  },

  rename(id: string, name: string) {
    if (!name.trim()) throw new Error('Test plan name cannot be empty');
    return testPlanRepository.update(id, { name: name.trim() });
  },

  update(id: string, input: { name: string; description?: string; code?: string; status?: TestPlanStatus }) {
    if (!input.name.trim()) throw new Error('Test plan name cannot be empty');
    return testPlanRepository.update(id, {
      name: input.name.trim(),
      description: input.description?.trim() || null,
      ...(input.code !== undefined ? { code: input.code.trim() } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
    });
  },

  changeStatus(id: string, status: TestPlan['status']) {
    return testPlanRepository.update(id, { status });
  },

  remove(id: string) {
    return testPlanRepository.remove(id);
  },

  // Clones a Test Plan's scope (which test cases it covers, in order) into a brand-new plan
  // in the same project — the test cases themselves are NOT duplicated, they're re-attached
  // by the same testCaseId, since Test Case is meant to stay reusable/shared across plans.
  async duplicate(sourceTestPlanId: string, newName: string): Promise<TestPlan> {
    const source = await testPlanRepository.findById(sourceTestPlanId);
    if (!source) throw new Error('Source test plan not found');

    const newPlan = await testPlanService.create({ projectId: source.projectId, name: newName });

    const sourceCases = await testPlanService.listCases(sourceTestPlanId);
    for (let i = 0; i < sourceCases.length; i++) {
      await testPlanService.addCase(newPlan.id, sourceCases[i].testCaseId, i);
    }

    return newPlan;
  },

  // Test cases in scope for this plan — no result/progress here anymore.
  // Progress belongs to a specific Test Run (see testRunService.getSummary).
  listCases(testPlanId: string) {
    return testCaseRepository.findCasesForPlan(testPlanId);
  },

  listCasesPaginated(
    testPlanId: string,
    options: { search?: string; priorities?: string[]; moduleIds?: string[]; tagIds?: string[]; page: number; rowsPerPage: number },
  ) {
    return testCaseRepository.findCasesForPlanPaginated(testPlanId, options);
  },

  addCasesMany(inputs: { testPlanId: string; testCaseId: string; order: number }[]) {
    return testCaseRepository.attachToPlanMany(inputs);
  },

  addCase(testPlanId: string, testCaseId: string, order: number) {
    return testCaseRepository.attachToPlan(testPlanId, testCaseId, order);
  },

  removeCase(testPlanCaseId: string) {
    return testCaseRepository.detachFromPlan(testPlanCaseId);
  },

  swapCaseOrder(caseA: { id: string; order: number }, caseB: { id: string; order: number }) {
    return testCaseRepository.swapCaseOrder(caseA.id, caseA.order, caseB.id, caseB.order);
  },

  findAdjacentCase(testPlanId: string, order: number, direction: 'before' | 'after') {
    return testCaseRepository.findAdjacentPlanCase(testPlanId, order, direction);
  },
};
