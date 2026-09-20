import { testPlanRepository } from '../repositories/testPlanRepository';
import { testCaseRepository } from '../repositories/testCaseRepository';
import { testRunRepository } from '../repositories/testRunRepository';
import { testResultRepository } from '../repositories/testResultRepository';
import { activityService } from './activityService';
import type { TestPlan, TestPlanStatus } from '../types/domain';

// Service layer: business rules, validation, orchestration across repositories.
// Pages/components call services — never repositories directly.

export const testPlanService = {
  listByProject(projectId: string, options?: { search?: string; statuses?: TestPlan['status'][] }) {
    return testPlanRepository.findAllByProject(projectId, options);
  },

  // Test plan list needs "when was this last run, and how did it go" — the most recent
  // Test Run under each plan (findAllByProject already orders runs newest-first, so the
  // first run seen per plan while walking the list is its latest one).
  async listByProjectWithRunStats(projectId: string, options?: { search?: string; statuses?: TestPlan['status'][] }) {
    const [plans, runs] = await Promise.all([
      testPlanRepository.findAllByProject(projectId, options),
      testRunRepository.findAllByProject(projectId),
    ]);

    const runIds = runs.map((r) => r.id);
    const summary = await testResultRepository.getSummaryByRunIds(runIds);

    const lastRunByPlanId = new Map<string, { runAt: string; total: number; pass: number; fail: number }>();
    for (const run of runs) {
      if (!run.testPlanId || lastRunByPlanId.has(run.testPlanId)) continue;
      const runSummary = summary[run.id] ?? { total: 0, pass: 0, fail: 0 };
      lastRunByPlanId.set(run.testPlanId, {
        runAt: run.completedAt ?? run.startedAt,
        total: runSummary.total,
        pass: runSummary.pass,
        fail: runSummary.fail,
      });
    }

    return plans.map((plan) => ({
      ...plan,
      lastRun: lastRunByPlanId.get(plan.id) ?? null,
    }));
  },

  getById(id: string) {
    return testPlanRepository.findById(id);
  },

  async create(input: { projectId: string; name: string; description?: string; code?: string; createdBy?: string | null }): Promise<TestPlan> {
    if (!input.name.trim()) {
      throw new Error('Test plan name cannot be empty');
    }
    const plan = await testPlanRepository.create({
      projectId: input.projectId,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      code: input.code?.trim() || null,
      createdBy: input.createdBy ?? null,
    });
    if (input.createdBy) {
      await activityService.logEvent({
        projectId: input.projectId,
        entityType: 'test_plan',
        entityId: plan.id,
        actorId: input.createdBy,
        eventType: 'created',
        payload: { code: plan.code, name: plan.name },
      });
    }
    return plan;
  },

  async rename(id: string, name: string, context?: { projectId: string; actorId?: string }) {
    if (!name.trim()) throw new Error('Test plan name cannot be empty');
    const plan = await testPlanRepository.update(id, { name: name.trim() });
    if (context?.actorId) {
      await activityService.logEvent({
        projectId: context.projectId,
        entityType: 'test_plan',
        entityId: id,
        actorId: context.actorId,
        eventType: 'updated',
        payload: { code: plan.code, name: plan.name },
      });
    }
    return plan;
  },

  async update(id: string, input: { name: string; description?: string; code?: string; status?: TestPlanStatus }, context?: { projectId: string; actorId?: string }) {
    if (!input.name.trim()) throw new Error('Test plan name cannot be empty');
    const plan = await testPlanRepository.update(id, {
      name: input.name.trim(),
      description: input.description?.trim() || null,
      ...(input.code !== undefined ? { code: input.code.trim() } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
    });
    if (context?.actorId) {
      await activityService.logEvent({
        projectId: context.projectId,
        entityType: 'test_plan',
        entityId: id,
        actorId: context.actorId,
        eventType: 'updated',
        payload: { code: plan.code, name: plan.name },
      });
    }
    return plan;
  },

  async changeStatus(id: string, status: TestPlan['status'], actor: { projectId: string; actorId: string }) {
    const previous = await testPlanRepository.findById(id);
    const plan = await testPlanRepository.update(id, { status });
    if (previous && previous.status !== status) {
      await activityService.logEvent({
        projectId: actor.projectId,
        entityType: 'test_plan',
        entityId: id,
        actorId: actor.actorId,
        eventType: 'status_change',
        payload: { from: previous.status, to: status },
      });
    }
    return plan;
  },

  async bulkChangeStatus(ids: string[], status: TestPlan['status'], actor: { projectId: string; actorId: string }) {
    for (const id of ids) {
      await testPlanService.changeStatus(id, status, actor);
    }
  },

  async remove(id: string, context?: { actorId?: string }) {
    if (context?.actorId) {
      const plan = await testPlanRepository.findById(id);
      await testPlanRepository.remove(id);
      if (plan) {
        await activityService.logEvent({
          projectId: plan.projectId,
          entityType: 'test_plan',
          entityId: id,
          actorId: context.actorId,
          eventType: 'deleted',
          payload: { code: plan.code, name: plan.name },
        });
      }
      return;
    }
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
    options: { search?: string; priorities?: string[]; moduleIds?: string[]; tagIds?: string[]; testRoleIds?: string[]; page: number; rowsPerPage: number },
  ) {
    return testCaseRepository.findCasesForPlanPaginated(testPlanId, options);
  },

  async addCasesMany(inputs: { testPlanId: string; testCaseId: string; order: number }[], context?: { projectId?: string; actorId?: string; planCode?: string | null; planName?: string }) {
    const result = await testCaseRepository.attachToPlanMany(inputs);
    if (context?.actorId && context.projectId && inputs.length > 0) {
      await activityService.logEvent({
        projectId: context.projectId,
        entityType: 'test_plan',
        entityId: inputs[0].testPlanId,
        actorId: context.actorId,
        eventType: 'updated',
        payload: { code: context.planCode, name: context.planName },
      });
    }
    return result;
  },

  async addCase(testPlanId: string, testCaseId: string, order: number, context?: { projectId?: string; actorId?: string; planCode?: string | null; planName?: string }) {
    const result = await testCaseRepository.attachToPlan(testPlanId, testCaseId, order);
    if (context?.actorId && context.projectId) {
      await activityService.logEvent({
        projectId: context.projectId,
        entityType: 'test_plan',
        entityId: testPlanId,
        actorId: context.actorId,
        eventType: 'updated',
        payload: { code: context.planCode, name: context.planName },
      });
    }
    return result;
  },

  async removeCase(testPlanCaseId: string, context?: { testPlanId?: string; projectId?: string; actorId?: string; planCode?: string | null; planName?: string }) {
    await testCaseRepository.detachFromPlan(testPlanCaseId);
    if (context?.actorId && context.projectId && context.testPlanId) {
      await activityService.logEvent({
        projectId: context.projectId,
        entityType: 'test_plan',
        entityId: context.testPlanId,
        actorId: context.actorId,
        eventType: 'updated',
        payload: { code: context.planCode, name: context.planName },
      });
    }
  },

  async swapCaseOrder(caseA: { id: string; order: number }, caseB: { id: string; order: number }, context?: { testPlanId?: string; projectId?: string; actorId?: string; planCode?: string | null; planName?: string }) {
    await testCaseRepository.swapCaseOrder(caseA.id, caseA.order, caseB.id, caseB.order);
    if (context?.actorId && context.projectId && context.testPlanId) {
      await activityService.logEvent({
        projectId: context.projectId,
        entityType: 'test_plan',
        entityId: context.testPlanId,
        actorId: context.actorId,
        eventType: 'updated',
        payload: { code: context.planCode, name: context.planName },
      });
    }
  },

  findAdjacentCase(testPlanId: string, order: number, direction: 'before' | 'after') {
    return testCaseRepository.findAdjacentPlanCase(testPlanId, order, direction);
  },
};
