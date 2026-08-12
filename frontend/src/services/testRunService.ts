import { testRunRepository } from '../repositories/testRunRepository';
import { testResultRepository } from '../repositories/testResultRepository';
import { testCaseRepository } from '../repositories/testCaseRepository';
import { testPlanRepository } from '../repositories/testPlanRepository';
import { activityService } from './activityService';
import type { TestResultStatus, TestRun, TestRunStatus } from '../types/domain';

export const testRunService = {
  listByPlan(testPlanId: string) {
    return testRunRepository.findAllByPlan(testPlanId);
  },

  listByProject(projectId: string, options?: { search?: string; statuses?: TestRun['status'][] }) {
    return testRunRepository.findAllByProject(projectId, options);
  },

  async listByProjectWithSummary(projectId: string, options?: { search?: string; statuses?: TestRun['status'][] }) {
    const runs = await testRunRepository.findAllByProject(projectId, options);
    const runIds = runs.map((r) => r.id);
    const [summary, testers] = await Promise.all([
      testResultRepository.getSummaryByRunIds(runIds),
      testResultRepository.getDistinctTestersByRunIds(runIds),
    ]);
    return runs.map((r) => ({ ...r, ...summary[r.id] ?? { total: 0, pass: 0, fail: 0 }, testers: testers[r.id] ?? [] }));
  },

  async listByPlanWithSummary(testPlanId: string) {
    const runs = await testRunRepository.findAllByPlan(testPlanId);
    const runIds = runs.map((r) => r.id);
    const [summary, testers] = await Promise.all([
      testResultRepository.getSummaryByRunIds(runIds),
      testResultRepository.getDistinctTestersByRunIds(runIds),
    ]);
    return runs.map((r) => ({ ...r, ...summary[r.id] ?? { total: 0, pass: 0, fail: 0 }, testers: testers[r.id] ?? [] }));
  },

  async listByPlanWithSummaryPaginated(
    testPlanId: string,
    options: { search?: string; statuses?: TestRunStatus[]; page: number; rowsPerPage: number },
  ) {
    const { data, total } = await testRunRepository.findAllByPlanPaginated(testPlanId, options);
    const runIds = data.map((r) => r.id);
    const [summary, testers] = await Promise.all([
      testResultRepository.getSummaryByRunIds(runIds),
      testResultRepository.getDistinctTestersByRunIds(runIds),
    ]);
    return {
      data: data.map((r) => ({ ...r, ...summary[r.id] ?? { total: 0, pass: 0, fail: 0 }, testers: testers[r.id] ?? [] })),
      total,
    };
  },

  getById(id: string) {
    return testRunRepository.findById(id);
  },

  // Starting a run snapshots every test case currently in the plan's scope into
  // test_results as 'not_run' — later edits to the plan's case list don't retroactively
  // change what this run covers, matching how a real regression cycle has a fixed scope.
  async start(testPlanId: string, name: string, code?: string, startedBy?: string | null) {
    if (!name.trim()) throw new Error('Test run name cannot be empty');

    const plan = await testPlanRepository.findById(testPlanId);
    if (!plan) throw new Error('Test plan not found');

    const planCases = await testCaseRepository.findCasesForPlan(testPlanId);
    if (planCases.length === 0) {
      throw new Error('This test plan has no test cases yet — add test cases before starting a run');
    }

    const run = await testRunRepository.create({
      projectId: plan.projectId,
      testPlanId,
      name: name.trim(),
      code: code?.trim() || null,
      startedBy: startedBy ?? null,
    });
    await testResultRepository.seedForRun(
      run.id,
      planCases.map((pc) => pc.testCaseId),
    );
    if (startedBy) {
      await activityService.logEvent({
        projectId: plan.projectId,
        entityType: 'test_run',
        entityId: run.id,
        actorId: startedBy,
        eventType: 'created',
        payload: { code: run.code, name: run.name },
      });
    }
    return run;
  },

  // Custom/unplanned run — no Test Plan involved, test cases are picked directly.
  async startCustom(projectId: string, name: string, testCaseIds: string[], code?: string, startedBy?: string | null) {
    if (!name.trim()) throw new Error('Test run name cannot be empty');
    if (testCaseIds.length === 0) throw new Error('Select at least one test case for this test run');

    const run = await testRunRepository.create({
      projectId,
      testPlanId: null,
      name: name.trim(),
      code: code?.trim() || null,
      startedBy: startedBy ?? null,
    });
    await testResultRepository.seedForRun(run.id, testCaseIds);
    if (startedBy) {
      await activityService.logEvent({
        projectId,
        entityType: 'test_run',
        entityId: run.id,
        actorId: startedBy,
        eventType: 'created',
        payload: { code: run.code, name: run.name },
      });
    }
    return run;
  },

  async rename(id: string, input: { name: string; code: string }, context?: { projectId: string; actorId?: string }) {
    if (!input.name.trim()) throw new Error('Test run name cannot be empty');
    if (!input.code.trim()) throw new Error('Test run code cannot be empty');
    const run = await testRunRepository.update(id, { name: input.name.trim(), code: input.code.trim() });
    if (context?.actorId) {
      await activityService.logEvent({
        projectId: context.projectId,
        entityType: 'test_run',
        entityId: id,
        actorId: context.actorId,
        eventType: 'updated',
        payload: { code: run.code, name: run.name },
      });
    }
    return run;
  },

  // "Completed" is always a manual action (per product decision) — never inferred
  // automatically from every result being filled in.
  async complete(id: string, actor: { projectId: string; actorId: string }, notes?: string | null) {
    const run = await testRunRepository.updateStatus(id, 'completed', notes);
    await activityService.logEvent({
      projectId: actor.projectId,
      entityType: 'test_run',
      entityId: id,
      actorId: actor.actorId,
      eventType: 'status_change',
      payload: { from: 'in_progress', to: 'completed' },
    });
    return run;
  },

  async reopen(id: string, actor: { projectId: string; actorId: string }) {
    const run = await testRunRepository.updateStatus(id, 'in_progress');
    await activityService.logEvent({
      projectId: actor.projectId,
      entityType: 'test_run',
      entityId: id,
      actorId: actor.actorId,
      eventType: 'status_change',
      payload: { from: 'completed', to: 'in_progress' },
    });
    return run;
  },

  async remove(id: string, context?: { actorId?: string }) {
    if (context?.actorId) {
      const run = await testRunRepository.findById(id);
      await testRunRepository.remove(id);
      if (run) {
        await activityService.logEvent({
          projectId: run.projectId,
          entityType: 'test_run',
          entityId: id,
          actorId: context.actorId,
          eventType: 'deleted',
          payload: { code: run.code, name: run.name },
        });
      }
      return;
    }
    return testRunRepository.remove(id);
  },

  async getWithResults(testRunId: string) {
    const results = await testResultRepository.findAllByRun(testRunId);

    // Overall status is always derived, never stored — this is the "automatic" half
    // of the product decision (manual completion, automatic summary).
    const total = results.length;
    const counts = {
      pass: results.filter((r) => r.status === 'pass').length,
      fail: results.filter((r) => r.status === 'fail').length,
      skip: results.filter((r) => r.status === 'skip').length,
      blocked: results.filter((r) => r.status === 'blocked').length,
      notRun: results.filter((r) => r.status === 'not_run').length,
    };
    const executed = total - counts.notRun;
    const progressPercent = total === 0 ? 0 : Math.round((executed / total) * 100);

    return { results, summary: { total, executed, progressPercent, ...counts } };
  },

  async recordResult(id: string, testerId: string, status: TestResultStatus, notes: string | null, context?: { projectId?: string; actorId?: string }) {
    const result = await testResultRepository.recordResult(id, { status, testerId, notes });
    if (context?.actorId && context.projectId) {
      await activityService.logEvent({
        projectId: context.projectId,
        entityType: 'test_run',
        entityId: result.testRunId,
        actorId: context.actorId,
        eventType: 'result_update',
        payload: { status: result.status, testCaseCode: result.testCaseCode, testCaseTitle: result.testCaseTitle },
      });
    }
    return result;
  },

  // Mirrors recordResult but for a single step of a 'detailed' test case — a simpler
  // pass/fail than the overall Test Result status.
  async recordStepResult(testResultStepId: string, status: 'pass' | 'fail', actualResult: string | null, context?: { projectId?: string; actorId?: string; testRunId?: string; testCaseCode?: string | null; stepNumber?: number }) {
    const result = await testResultRepository.recordStepResult(testResultStepId, { status, actualResult });
    if (context?.actorId && context.projectId && context.testRunId) {
      await activityService.logEvent({
        projectId: context.projectId,
        entityType: 'test_run',
        entityId: context.testRunId,
        actorId: context.actorId,
        eventType: 'result_update',
        payload: { status, testCaseCode: context.testCaseCode, step: context.stepNumber },
      });
    }
    return result;
  },

  // Manual, per-case sync back to the current test case template — only while the run
  // is still in progress, so a completed run's history can never be retroactively changed.
  async syncResultWithTestCase(testRunId: string, resultId: string) {
    const run = await testRunRepository.findById(testRunId);
    if (run?.status === 'completed') {
      throw new Error('This test run is already completed — reopen it to sync');
    }
    return testResultRepository.syncWithTestCase(resultId);
  },
};
