import type { TestCaseStep } from '../../types/domain';

export interface TestCaseStepRepository {
  findAllByTestCase(testCaseId: string): Promise<TestCaseStep[]>;
  findAllByTestCases(testCaseIds: string[]): Promise<TestCaseStep[]>;
  createMany(
    steps: { testCaseId: string; action: string; expectedResult: string | null; stepNumber: number }[],
  ): Promise<TestCaseStep[]>;
  replaceForTestCase(
    testCaseId: string,
    steps: { action: string; expectedResult: string | null }[],
  ): Promise<TestCaseStep[]>;
}
