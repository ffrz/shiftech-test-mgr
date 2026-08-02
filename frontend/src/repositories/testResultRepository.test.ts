import { describe, expect, it, vi } from 'vitest';

vi.stubEnv('VITE_DATA_SOURCE', 'mock');

const { testResultRepository } = await import('./testResultRepository');

describe('testResultRepository (VITE_DATA_SOURCE=mock)', () => {
  it('seedForRun -> findAllByRun returns seeded results in order', async () => {
    await testResultRepository.seedForRun('tr-run-1', ['tr-tc-a', 'tr-tc-b', 'tr-tc-c']);
    const results = await testResultRepository.findAllByRun('tr-run-1');
    expect(results).toHaveLength(3);
    expect(results.map((r) => r.testCaseId)).toEqual(['tr-tc-a', 'tr-tc-b', 'tr-tc-c']);
    expect(results.every((r) => r.status === 'not_run')).toBe(true);
  });

  it('recordResult updates a seeded result', async () => {
    await testResultRepository.seedForRun('tr-run-2', ['tr-tc-a']);
    const [result] = await testResultRepository.findAllByRun('tr-run-2');
    const updated = await testResultRepository.recordResult(result.id, {
      status: 'pass',
      testerId: 'tr-tester-1',
      notes: 'All good',
    });
    expect(updated.status).toBe('pass');
    expect(updated.testerId).toBe('tr-tester-1');
    expect(updated.notes).toBe('All good');
    expect(updated.executedAt).not.toBeNull();
  });

  it('getSummaryByRunIds counts total/pass/fail from seeded results', async () => {
    await testResultRepository.seedForRun('tr-run-3', ['tr-tc-a', 'tr-tc-b']);
    const [first, second] = await testResultRepository.findAllByRun('tr-run-3');
    await testResultRepository.recordResult(first.id, { status: 'pass', testerId: 'tr-tester-1', notes: null });
    await testResultRepository.recordResult(second.id, { status: 'fail', testerId: 'tr-tester-1', notes: null });
    await expect(testResultRepository.getSummaryByRunIds(['tr-run-3', 'tr-run-unknown'])).resolves.toEqual({
      'tr-run-3': { total: 2, pass: 1, fail: 1 },
      'tr-run-unknown': { total: 0, pass: 0, fail: 0 },
    });
  });

  it('getDistinctTestersByRunIds returns unique testers', async () => {
    await testResultRepository.seedForRun('tr-run-4', ['tr-tc-a', 'tr-tc-b']);
    const [first] = await testResultRepository.findAllByRun('tr-run-4');
    await testResultRepository.recordResult(first.id, { status: 'skip', testerId: 'tr-tester-9', notes: null });
    await expect(testResultRepository.getDistinctTestersByRunIds(['tr-run-4'])).resolves.toEqual({
      'tr-run-4': [{ id: 'tr-tester-9', fullName: null }],
    });
  });

  it('syncWithTestCase round-trips a seeded result; recordStepResult rejects unknown steps', async () => {
    await testResultRepository.seedForRun('tr-run-5', ['tr-tc-a']);
    const [result] = await testResultRepository.findAllByRun('tr-run-5');
    await expect(testResultRepository.syncWithTestCase(result.id)).resolves.toMatchObject({ id: result.id });
    await expect(
      testResultRepository.recordStepResult('tr-no-such-step', { status: 'pass', actualResult: null }),
    ).rejects.toThrow();
  });
});
