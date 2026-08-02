import { describe, expect, it } from 'vitest';
import { createMockTestCaseStepRepository } from './testCaseStepRepository';

describe('createMockTestCaseStepRepository', () => {
  it('starts empty when no seed is given', async () => {
    const repo = createMockTestCaseStepRepository();
    await expect(repo.findAllByTestCase('tc-1')).resolves.toEqual([]);
  });

  it('createMany() is visible to findAllByTestCase()', async () => {
    const repo = createMockTestCaseStepRepository();
    const created = await repo.createMany([
      { testCaseId: 'tc-1', stepNumber: 1, action: 'Click button', expectedResult: null },
    ]);

    await expect(repo.findAllByTestCase('tc-1')).resolves.toEqual(created);
  });

  it('findAllByTestCases() returns steps for multiple test cases', async () => {
    const repo = createMockTestCaseStepRepository();
    await repo.createMany([
      { testCaseId: 'tc-a', stepNumber: 1, action: 'Step A1', expectedResult: null },
    ]);
    await repo.createMany([
      { testCaseId: 'tc-b', stepNumber: 1, action: 'Step B1', expectedResult: null },
    ]);

    const all = await repo.findAllByTestCases(['tc-a', 'tc-b']);

    expect(all).toHaveLength(2);
    expect(all.map((s) => s.action).sort()).toEqual(['Step A1', 'Step B1']);
  });

  it('replaceForTestCase() replaces all steps for a test case', async () => {
    const repo = createMockTestCaseStepRepository();
    await repo.createMany([
      { testCaseId: 'tc-1', stepNumber: 1, action: 'Old step', expectedResult: null },
    ]);

    const replaced = await repo.replaceForTestCase('tc-1', [
      { action: 'New step 1', expectedResult: 'expected 1' },
      { action: 'New step 2', expectedResult: null },
    ]);

    expect(replaced).toHaveLength(2);
    expect(replaced[0].stepNumber).toBe(1);
    expect(replaced[1].stepNumber).toBe(2);

    const fromRead = await repo.findAllByTestCase('tc-1');
    expect(fromRead).toHaveLength(2);
    expect(fromRead[0].action).toBe('New step 1');
    expect(fromRead[1].action).toBe('New step 2');
  });

  it('two instances never share state', async () => {
    const repoA = createMockTestCaseStepRepository();
    const repoB = createMockTestCaseStepRepository();

    await repoA.createMany([
      { testCaseId: 'tc-1', stepNumber: 1, action: 'Only in A', expectedResult: null },
    ]);

    await expect(repoB.findAllByTestCase('tc-1')).resolves.toEqual([]);
  });
});
