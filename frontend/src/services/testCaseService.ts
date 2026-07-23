import { testCaseRepository } from '../repositories/testCaseRepository';
import { tagService } from './tagService';
import { testCaseStepService } from './testCaseStepService';
import type { TestCase } from '../types/domain';

export const testCaseService = {
  listByProject(projectId: string) {
    return testCaseRepository.findAllByProject(projectId);
  },

  listByProjectWithDetails(projectId: string) {
    return testCaseRepository.findAllByProjectWithDetails(projectId);
  },

  getById(id: string) {
    return testCaseRepository.findById(id);
  },

  getByIdWithDetails(id: string) {
    return testCaseRepository.findByIdWithDetails(id);
  },

  listSteps(testCaseId: string) {
    return testCaseStepService.listByTestCase(testCaseId);
  },

  async create(input: {
    projectId: string;
    moduleId: string | null;
    code?: string;
    title: string;
    objective?: string;
    steps: string;
    expectedResult: string;
    preconditions?: string;
    priority?: TestCase['priority'];
    notes?: string;
    targetRole?: string;
    tagNames?: string[];
    stepType?: TestCase['stepType'];
    detailedSteps?: { action: string; expectedResult?: string }[];
  }): Promise<TestCase> {
    if (!input.title.trim()) throw new Error('Judul test case tidak boleh kosong');
    const stepType = input.stepType ?? 'simple';
    if (stepType === 'simple') {
      if (!input.steps.trim()) throw new Error('Langkah pengujian tidak boleh kosong');
      if (!input.expectedResult.trim()) throw new Error('Hasil yang diharapkan tidak boleh kosong');
    } else if (!input.detailedSteps?.length) {
      throw new Error('Test case detailed harus punya minimal satu langkah');
    }

    const testCase = await testCaseRepository.create({
      projectId: input.projectId,
      moduleId: input.moduleId,
      code: input.code?.trim() || null,
      title: input.title.trim(),
      objective: input.objective?.trim() || null,
      preconditions: input.preconditions?.trim() || null,
      steps: input.steps.trim(),
      expectedResult: input.expectedResult.trim(),
      priority: input.priority ?? 'medium',
      status: 'active',
      notes: input.notes?.trim() || null,
      stepType,
      targetRole: input.targetRole?.trim() || null,
    });

    if (input.tagNames?.length) {
      await tagService.saveTagsForTestCase(input.projectId, testCase.id, input.tagNames);
    }

    if (stepType === 'detailed' && input.detailedSteps) {
      await testCaseStepService.replaceForTestCase(testCase.id, input.detailedSteps);
    }

    return testCase;
  },

  async update(
    id: string,
    projectId: string,
    changes: Partial<Omit<TestCase, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>>,
    tagNames?: string[],
    detailedSteps?: { action: string; expectedResult?: string }[],
  ) {
    const testCase = await testCaseRepository.update(id, changes);
    if (tagNames !== undefined) {
      await tagService.saveTagsForTestCase(projectId, id, tagNames);
    }
    if (testCase.stepType === 'detailed' && detailedSteps !== undefined) {
      await testCaseStepService.replaceForTestCase(id, detailedSteps);
    }
    return testCase;
  },

  archive(id: string) {
    return testCaseRepository.update(id, { status: 'archived' });
  },

  reactivate(id: string) {
    return testCaseRepository.update(id, { status: 'active' });
  },

  remove(id: string) {
    return testCaseRepository.remove(id);
  },
};
