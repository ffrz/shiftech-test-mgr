import type { TestCaseStep } from '../../../types/domain';
import type { TestCaseStepRepository } from '../../interfaces/testCaseStepRepository';

let seq = 0;
function nextId(): string {
  seq += 1;
  return `mock-tcstep-${seq}`;
}

export function createMockTestCaseStepRepository(seed: TestCaseStep[] = []): TestCaseStepRepository {
  const store = new Map<string, TestCaseStep>(seed.map((s) => [s.id, s]));

  return {
    async findAllByTestCase(testCaseId: string): Promise<TestCaseStep[]> {
      return [...store.values()]
        .filter((s) => s.testCaseId === testCaseId)
        .sort((a, b) => a.stepNumber - b.stepNumber);
    },
    async findAllByTestCases(testCaseIds: string[]): Promise<TestCaseStep[]> {
      return [...store.values()]
        .filter((s) => testCaseIds.includes(s.testCaseId))
        .sort((a, b) => a.stepNumber - b.stepNumber);
    },
    async createMany(
      steps: { testCaseId: string; action: string; expectedResult: string | null; stepNumber: number }[],
    ): Promise<TestCaseStep[]> {
      const now = new Date().toISOString();
      const created: TestCaseStep[] = [];
      for (const s of steps) {
        const step: TestCaseStep = {
          id: nextId(),
          testCaseId: s.testCaseId,
          stepNumber: s.stepNumber,
          action: s.action,
          expectedResult: s.expectedResult,
          createdAt: now,
          updatedAt: now,
        };
        store.set(step.id, step);
        created.push(step);
      }
      return created;
    },
    async replaceForTestCase(
      testCaseId: string,
      steps: { action: string; expectedResult: string | null }[],
    ): Promise<TestCaseStep[]> {
      for (const [id, s] of store) {
        if (s.testCaseId === testCaseId) store.delete(id);
      }
      if (steps.length === 0) return [];
      const now = new Date().toISOString();
      return steps.map((s, index) => {
        const step: TestCaseStep = {
          id: nextId(),
          testCaseId,
          stepNumber: index + 1,
          action: s.action,
          expectedResult: s.expectedResult,
          createdAt: now,
          updatedAt: now,
        };
        store.set(step.id, step);
        return step;
      });
    },
  };
}
