import { describe, expect, it } from 'vitest';
import { createMockTestResultRepository } from './testResultRepository';

const sampleResult = {
  id: 'result-1',
  testRunId: 'run-1',
  testCaseId: 'tc-1',
  testerId: null,
  status: 'not_run' as const,
  executedAt: null,
  notes: null,
  testCaseCode: 'TC-001',
  testCaseTitle: 'Sample Test Case',
  testCaseObjective: null,
  testCasePreconditions: null,
  testCaseSteps: '',
  testCaseExpectedResult: '',
  testCasePriority: 'medium' as const,
  testCaseNotes: null,
  order: 0,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  testCase: null,
  tester: null,
  stepResults: [],
};

const sampleResultWithSteps = {
  id: 'result-2',
  testRunId: 'run-1',
  testCaseId: 'tc-2',
  testerId: null,
  status: 'not_run' as const,
  executedAt: null,
  notes: null,
  testCaseCode: 'TC-002',
  testCaseTitle: 'Detailed Test Case',
  testCaseObjective: null,
  testCasePreconditions: null,
  testCaseSteps: '',
  testCaseExpectedResult: '',
  testCasePriority: 'medium' as const,
  testCaseNotes: null,
  order: 1,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  testCase: null,
  tester: null,
  stepResults: [
    {
      id: 'step-1',
      testResultId: 'result-2',
      testCaseStepId: 'tcs-1',
      status: 'not_run' as const,
      actualResult: null,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      step: { id: 'tcs-1', testCaseId: 'tc-2', stepNumber: 1, action: 'Step 1', expectedResult: 'Expected 1', createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z' },
    },
  ],
};

describe('createMockTestResultRepository', () => {
  it('starts empty when no seed is given', async () => {
    const repo = createMockTestResultRepository();
    await expect(repo.findAllByRun('run-1')).resolves.toEqual([]);
  });

  it('seed is visible in findAllByRun', async () => {
    const repo = createMockTestResultRepository([sampleResult]);
    await expect(repo.findAllByRun('run-1')).resolves.toEqual([sampleResult]);
  });

  it('seedForRun creates entries visible in findAllByRun', async () => {
    const repo = createMockTestResultRepository();
    await repo.seedForRun('run-1', ['tc-a', 'tc-b']);
    const results = await repo.findAllByRun('run-1');
    expect(results).toHaveLength(2);
    expect(results[0].testRunId).toBe('run-1');
    expect(results[0].status).toBe('not_run');
    expect(results[0].testCaseTitle).toContain('tc-a');
  });

  it('recordResult updates the result', async () => {
    const repo = createMockTestResultRepository([sampleResult]);
    const updated = await repo.recordResult('result-1', { status: 'pass', testerId: 'user-1', notes: 'all good' });
    expect(updated.status).toBe('pass');
    expect(updated.testerId).toBe('user-1');
    expect(updated.notes).toBe('all good');
    expect(updated.executedAt).not.toBeNull();

    const stored = await repo.findAllByRun('run-1');
    expect(stored[0].status).toBe('pass');
  });

  it('recordStepResult updates the step result', async () => {
    const repo = createMockTestResultRepository([sampleResultWithSteps]);
    const updated = await repo.recordStepResult('step-1', { status: 'fail', actualResult: 'did not work' });
    expect(updated.status).toBe('fail');
    expect(updated.actualResult).toBe('did not work');

    const stored = await repo.findAllByRun('run-1');
    expect(stored[0].stepResults[0].status).toBe('fail');
  });

  it('recordStepResult throws for unknown step id', async () => {
    const repo = createMockTestResultRepository();
    await expect(repo.recordStepResult('nonexistent', { status: 'pass', actualResult: null }))
      .rejects.toThrow('mock test result step not found');
  });

  it('getSummaryByRunIds computes pass/fail/total correctly', async () => {
    const repo = createMockTestResultRepository([
      { ...sampleResult, id: 'r1', testRunId: 'run-a', status: 'pass' },
      { ...sampleResult, id: 'r2', testRunId: 'run-a', status: 'fail' },
      { ...sampleResult, id: 'r3', testRunId: 'run-a', status: 'pass' },
      { ...sampleResult, id: 'r4', testRunId: 'run-b', status: 'fail' },
    ]);
    const summary = await repo.getSummaryByRunIds(['run-a', 'run-b']);
    expect(summary['run-a']).toEqual({ total: 3, pass: 2, fail: 1 });
    expect(summary['run-b']).toEqual({ total: 1, pass: 0, fail: 1 });
  });

  it('getSummaryByRunIds returns zeros for unknown run ids', async () => {
    const repo = createMockTestResultRepository();
    const summary = await repo.getSummaryByRunIds(['unknown']);
    expect(summary['unknown']).toEqual({ total: 0, pass: 0, fail: 0 });
  });

  it('getSummaryByRunIds returns empty object for empty input', async () => {
    const repo = createMockTestResultRepository();
    await expect(repo.getSummaryByRunIds([])).resolves.toEqual({});
  });

  it('getDistinctTestersByRunIds returns unique testers per run', async () => {
    const repo = createMockTestResultRepository([
      { ...sampleResult, id: 'r1', testRunId: 'run-a', testerId: 'user-1', tester: { id: 'user-1', displayName: 'Alice', username: 'alice', avatarUrl: null, bio: null, usernameChanged: false, createdAt: '', updatedAt: '' } },
      { ...sampleResult, id: 'r2', testRunId: 'run-a', testerId: 'user-1', tester: { id: 'user-1', displayName: 'Alice', username: 'alice', avatarUrl: null, bio: null, usernameChanged: false, createdAt: '', updatedAt: '' } },
      { ...sampleResult, id: 'r3', testRunId: 'run-b', testerId: 'user-2', tester: { id: 'user-2', displayName: 'Bob', username: 'bob', avatarUrl: null, bio: null, usernameChanged: false, createdAt: '', updatedAt: '' } },
    ]);
    const testers = await repo.getDistinctTestersByRunIds(['run-a', 'run-b']);
    expect(testers['run-a']).toHaveLength(1);
    expect(testers['run-a'][0].id).toBe('user-1');
    expect(testers['run-b']).toHaveLength(1);
    expect(testers['run-b'][0].id).toBe('user-2');
  });

  it('syncWithTestCase returns the result', async () => {
    const repo = createMockTestResultRepository([sampleResult]);
    const synced = await repo.syncWithTestCase('result-1');
    expect(synced.id).toBe('result-1');
    expect(synced.testCaseTitle).toBe('Sample Test Case');
  });

  it('syncWithTestCase throws for unknown id', async () => {
    const repo = createMockTestResultRepository();
    await expect(repo.syncWithTestCase('nonexistent')).rejects.toThrow('mock test result not found');
  });

  it('two instances do not share state', async () => {
    const repoA = createMockTestResultRepository();
    const repoB = createMockTestResultRepository();

    await repoA.seedForRun('run-1', ['tc-1']);
    await expect(repoB.findAllByRun('run-1')).resolves.toEqual([]);
  });
});
