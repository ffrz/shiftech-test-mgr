import { testPlanRepository } from '../repositories/testPlanRepository';
import { testCaseRepository } from '../repositories/testCaseRepository';
import type { TestPlan } from '../types/domain';

// Service layer: business rules, validation, orchestration across repositories.
// Pages/components call services — never repositories directly.

export const testPlanService = {
  listByProject(projectId: string) {
    return testPlanRepository.findAllByProject(projectId);
  },

  getById(id: string) {
    return testPlanRepository.findById(id);
  },

  async create(input: { projectId: string; name: string; description?: string; code?: string }): Promise<TestPlan> {
    if (!input.name.trim()) {
      throw new Error('Nama test plan tidak boleh kosong');
    }
    return testPlanRepository.create({
      projectId: input.projectId,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      code: input.code?.trim() || null,
    });
  },

  rename(id: string, name: string) {
    if (!name.trim()) throw new Error('Nama test plan tidak boleh kosong');
    return testPlanRepository.update(id, { name: name.trim() });
  },

  update(id: string, input: { name: string; description?: string; code?: string }) {
    if (!input.name.trim()) throw new Error('Nama test plan tidak boleh kosong');
    return testPlanRepository.update(id, {
      name: input.name.trim(),
      description: input.description?.trim() || null,
      ...(input.code !== undefined ? { code: input.code.trim() } : {}),
    });
  },

  changeStatus(id: string, status: TestPlan['status']) {
    return testPlanRepository.update(id, { status });
  },

  remove(id: string) {
    return testPlanRepository.remove(id);
  },

  // Test cases in scope for this plan — no result/progress here anymore.
  // Progress belongs to a specific Test Run (see testRunService.getSummary).
  listCases(testPlanId: string) {
    return testCaseRepository.findCasesForPlan(testPlanId);
  },

  addCase(testPlanId: string, testCaseId: string, order: number) {
    return testCaseRepository.attachToPlan(testPlanId, testCaseId, order);
  },

  removeCase(testPlanCaseId: string) {
    return testCaseRepository.detachFromPlan(testPlanCaseId);
  },

  reorderCases(orderedTestPlanCaseIds: string[]) {
    return testCaseRepository.reorderCases(orderedTestPlanCaseIds);
  },
};
