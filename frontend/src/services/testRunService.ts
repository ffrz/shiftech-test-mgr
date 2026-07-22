import { testRunRepository } from '../repositories/testRunRepository';
import { testResultRepository } from '../repositories/testResultRepository';
import { testCaseRepository } from '../repositories/testCaseRepository';
import type { TestResultStatus } from '../types/domain';

export const testRunService = {
  listByPlan(testPlanId: string) {
    return testRunRepository.findAllByPlan(testPlanId);
  },

  listByProject(projectId: string) {
    return testRunRepository.findAllByProject(projectId);
  },

  async listByProjectWithSummary(projectId: string) {
    const runs = await testRunRepository.findAllByProject(projectId);
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

  getById(id: string) {
    return testRunRepository.findById(id);
  },

  // Starting a run snapshots every test case currently in the plan's scope into
  // test_results as 'not_run' — later edits to the plan's case list don't retroactively
  // change what this run covers, matching how a real regression cycle has a fixed scope.
  async start(testPlanId: string, name: string, code?: string) {
    if (!name.trim()) throw new Error('Nama test run tidak boleh kosong');

    const planCases = await testCaseRepository.findCasesForPlan(testPlanId);
    if (planCases.length === 0) {
      throw new Error('Test plan ini belum punya test case — tambahkan test case dulu sebelum memulai run');
    }

    const run = await testRunRepository.create({ testPlanId, name: name.trim(), code: code?.trim() || null });
    await testResultRepository.seedForRun(
      run.id,
      planCases.map((pc) => pc.testCaseId),
    );
    return run;
  },

  rename(id: string, input: { name: string; code: string }) {
    if (!input.name.trim()) throw new Error('Nama test run tidak boleh kosong');
    if (!input.code.trim()) throw new Error('Kode test run tidak boleh kosong');
    return testRunRepository.update(id, { name: input.name.trim(), code: input.code.trim() });
  },

  // "Completed" is always a manual action (per product decision) — never inferred
  // automatically from every result being filled in.
  complete(id: string, notes?: string | null) {
    return testRunRepository.updateStatus(id, 'completed', notes);
  },

  reopen(id: string) {
    return testRunRepository.updateStatus(id, 'in_progress');
  },

  remove(id: string) {
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

  recordResult(id: string, testerId: string, status: TestResultStatus, notes: string | null) {
    return testResultRepository.recordResult(id, { status, testerId, notes });
  },

  // Mirrors recordResult but for a single step of a 'detailed' test case — a simpler
  // pass/fail than the overall Test Result status.
  recordStepResult(testResultStepId: string, status: 'pass' | 'fail', actualResult: string | null) {
    return testResultRepository.recordStepResult(testResultStepId, { status, actualResult });
  },

  // Manual, per-case sync back to the current test case template — only while the run
  // is still in progress, so a completed run's history can never be retroactively changed.
  async syncResultWithTestCase(testRunId: string, resultId: string) {
    const run = await testRunRepository.findById(testRunId);
    if (run?.status === 'completed') {
      throw new Error('Test run sudah selesai — buka kembali run ini untuk melakukan sync');
    }
    return testResultRepository.syncWithTestCase(resultId);
  },
};
