import { testCaseStepRepositoryAdapter } from './adapters/testCaseStepResolver';
import type { TestCaseStep } from '../types/domain';

export type { TestCaseStepRepository } from './interfaces/testCaseStepRepository';

export const testCaseStepRepository = {
  findAllByTestCase(testCaseId: string): Promise<TestCaseStep[]> {
    return testCaseStepRepositoryAdapter.findAllByTestCase(testCaseId);
  },
  findAllByTestCases(testCaseIds: string[]): Promise<TestCaseStep[]> {
    return testCaseStepRepositoryAdapter.findAllByTestCases(testCaseIds);
  },
  createMany(
    steps: { testCaseId: string; action: string; expectedResult: string | null; stepNumber: number }[],
  ): Promise<TestCaseStep[]> {
    return testCaseStepRepositoryAdapter.createMany(steps);
  },
  replaceForTestCase(
    testCaseId: string,
    steps: { action: string; expectedResult: string | null }[],
  ): Promise<TestCaseStep[]> {
    return testCaseStepRepositoryAdapter.replaceForTestCase(testCaseId, steps);
  },
};
