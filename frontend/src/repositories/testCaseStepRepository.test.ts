import { describe, expect, it, vi } from 'vitest';

vi.stubEnv('VITE_DATA_SOURCE', 'mock');

const { testCaseStepRepository } = await import('./testCaseStepRepository');

describe('testCaseStepRepository (VITE_DATA_SOURCE=mock)', () => {
  it('createMany -> findAllByTestCase returns steps ordered by stepNumber', async () => {
    await testCaseStepRepository.createMany([
      { testCaseId: 'tcstep-tc-1', action: 'Open app', expectedResult: 'App opens', stepNumber: 1 },
      { testCaseId: 'tcstep-tc-1', action: 'Login', expectedResult: null, stepNumber: 2 },
    ]);
    const steps = await testCaseStepRepository.findAllByTestCase('tcstep-tc-1');
    expect(steps).toHaveLength(2);
    expect(steps.map((s) => s.stepNumber)).toEqual([1, 2]);
    expect(steps[0].action).toBe('Open app');
    expect(steps[1].expectedResult).toBeNull();
  });

  it('replaceForTestCase removes old steps and renumbers new ones from 1', async () => {
    await testCaseStepRepository.createMany([
      { testCaseId: 'tcstep-tc-2', action: 'Old A', expectedResult: null, stepNumber: 1 },
      { testCaseId: 'tcstep-tc-2', action: 'Old B', expectedResult: null, stepNumber: 2 },
      { testCaseId: 'tcstep-tc-2', action: 'Old C', expectedResult: null, stepNumber: 3 },
    ]);
    const replaced = await testCaseStepRepository.replaceForTestCase('tcstep-tc-2', [
      { action: 'New A', expectedResult: 'Result A' },
      { action: 'New B', expectedResult: null },
    ]);
    expect(replaced.map((s) => s.stepNumber)).toEqual([1, 2]);
    expect(replaced.map((s) => s.action)).toEqual(['New A', 'New B']);

    const steps = await testCaseStepRepository.findAllByTestCase('tcstep-tc-2');
    expect(steps).toHaveLength(2);
    expect(steps.map((s) => s.action)).toEqual(['New A', 'New B']);
  });

  it('findAllByTestCases batch-queries steps across test cases', async () => {
    await testCaseStepRepository.createMany([
      { testCaseId: 'tcstep-tc-3', action: 'Step 3A', expectedResult: null, stepNumber: 1 },
      { testCaseId: 'tcstep-tc-4', action: 'Step 4A', expectedResult: null, stepNumber: 1 },
      { testCaseId: 'tcstep-tc-4', action: 'Step 4B', expectedResult: null, stepNumber: 2 },
    ]);
    const steps = await testCaseStepRepository.findAllByTestCases(['tcstep-tc-3', 'tcstep-tc-4']);
    expect(steps).toHaveLength(3);
    expect(steps.map((s) => s.action).sort()).toEqual(['Step 3A', 'Step 4A', 'Step 4B']);
  });
});
