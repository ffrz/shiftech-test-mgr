import { testCaseStepRepository } from '../repositories/testCaseStepRepository';

export const testCaseStepService = {
  listByTestCase(testCaseId: string) {
    return testCaseStepRepository.findAllByTestCase(testCaseId);
  },

  // Called only when the test case's stepType is 'detailed' — simple test cases keep
  // using the free-text `steps` column and never touch this table.
  replaceForTestCase(testCaseId: string, steps: { action: string; expectedResult?: string }[]) {
    const cleaned = steps.map((s) => ({ action: s.action.trim(), expectedResult: s.expectedResult?.trim() || null })).filter((s) => s.action);
    return testCaseStepRepository.replaceForTestCase(testCaseId, cleaned);
  },
};
