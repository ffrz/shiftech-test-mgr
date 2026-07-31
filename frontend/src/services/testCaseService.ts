import { testCaseRepository } from '../repositories/testCaseRepository';
import { testCaseStepRepository } from '../repositories/testCaseStepRepository';
import { tagService } from './tagService';
import { testCaseStepService } from './testCaseStepService';
import { moduleService } from './moduleService';
import { testRoleService } from './testRoleService';
import type { ExternalLink, TestCase } from '../types/domain';

export const testCaseService = {
  listByProject(projectId: string) {
    return testCaseRepository.findAllByProject(projectId);
  },

  listByProjectWithDetails(
    projectId: string,
    options?: {
      search?: string;
      statuses?: TestCase['status'][];
      priorities?: TestCase['priority'][];
      moduleIds?: string[];
      tagIds?: string[];
      testRoleIds?: string[];
    },
  ) {
    return testCaseRepository.findAllByProjectWithDetails(projectId, options);
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
    targetRoleId?: string | null;
    tagNames?: string[];
    stepType?: TestCase['stepType'];
    detailedSteps?: { action: string; expectedResult?: string }[];
    externalLinks?: ExternalLink[];
    createdBy?: string | null;
  }): Promise<TestCase> {
    if (!input.title.trim()) throw new Error('Test case title cannot be empty');
    const stepType = input.stepType ?? 'simple';
    if (stepType === 'simple') {
      if (!input.steps.trim()) throw new Error('Test steps cannot be empty');
      if (!input.expectedResult.trim()) throw new Error('Expected result cannot be empty');
    } else if (!input.detailedSteps?.length) {
      throw new Error('A detailed test case must have at least one step');
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
      targetRoleId: input.targetRoleId ?? null,
      externalLinks: input.externalLinks ?? [],
      createdBy: input.createdBy ?? null,
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

  // Bulk-edit dialog only ever sends the fields the user actually touched (undefined =
  // leave unchanged) — same partial-update semantics as `update` above, just applied to
  // many rows sequentially so Supabase isn't hit with a burst of concurrent writes.
  async bulkUpdate(ids: string[], changes: Partial<Pick<TestCase, 'moduleId' | 'priority' | 'status' | 'targetRoleId'>>) {
    for (const id of ids) {
      await testCaseRepository.update(id, changes);
    }
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

  // Clones test cases (+ tags + detailed steps) from another project into `targetProjectId`,
  // resolving/creating modules & test roles by name — same remapping approach as
  // testSuiteService.cloneItemsToProject, just sourced from live test cases instead of a suite.
  async cloneToProject(testCaseIds: string[], targetProjectId: string): Promise<void> {
    if (testCaseIds.length === 0) return;
    const items = await testCaseRepository.findByIdsWithDetails(testCaseIds);

    const existingModules = await moduleService.listByProject(targetProjectId);
    const moduleIdByName = new Map(existingModules.map((m) => [m.name.toLowerCase(), m.id]));
    const newModuleNames = [
      ...new Set(
        items
          .map((i) => i.module?.name?.trim())
          .filter((n): n is string => !!n && !moduleIdByName.has(n.toLowerCase())),
      ),
    ];
    if (newModuleNames.length > 0) {
      const created = await moduleService.createMany(newModuleNames.map((n) => ({ projectId: targetProjectId, name: n })));
      for (const m of created) moduleIdByName.set(m.name.toLowerCase(), m.id);
    }

    const existingRoles = await testRoleService.listByProject(targetProjectId);
    const roleIdByName = new Map(existingRoles.map((r) => [r.name.toLowerCase(), r.id]));
    const newRoleNames = [
      ...new Set(
        items
          .map((i) => i.targetRole?.name?.trim())
          .filter((n): n is string => !!n && !roleIdByName.has(n.toLowerCase())),
      ),
    ];
    if (newRoleNames.length > 0) {
      const created = await testRoleService.createMany(newRoleNames.map((n) => ({ projectId: targetProjectId, name: n })));
      for (const r of created) roleIdByName.set(r.name.toLowerCase(), r.id);
    }

    const newCases = await testCaseRepository.createMany(
      items.map((item) => ({
        projectId: targetProjectId,
        moduleId: item.module ? moduleIdByName.get(item.module.name.toLowerCase()) ?? null : null,
        title: item.title,
        objective: item.objective,
        preconditions: item.preconditions,
        steps: item.steps,
        expectedResult: item.expectedResult,
        priority: item.priority,
        status: 'active' as const,
        notes: null,
        stepType: item.stepType,
        targetRoleId: item.targetRole ? roleIdByName.get(item.targetRole.name.toLowerCase()) ?? null : null,
        externalLinks: item.externalLinks,
      })),
    );

    await tagService.saveTagsForTestCaseMany(
      targetProjectId,
      newCases.map((tc, i) => ({
        testCaseId: tc.id,
        tagNames: items[i]?.tags.map((t) => t.name) ?? [],
      })),
    );

    const detailedIndices = items
      .map((item, i) => (item.stepType === 'detailed' ? i : -1))
      .filter((i) => i >= 0);
    if (detailedIndices.length > 0) {
      const allSteps = await testCaseStepRepository.findAllByTestCases(detailedIndices.map((i) => items[i].id));
      const stepsBySourceId = new Map<string, typeof allSteps>();
      for (const step of allSteps) {
        const arr = stepsBySourceId.get(step.testCaseId);
        if (arr) arr.push(step);
        else stepsBySourceId.set(step.testCaseId, [step]);
      }
      const stepRows: { testCaseId: string; action: string; expectedResult: string | null; stepNumber: number }[] = [];
      for (const idx of detailedIndices) {
        const sourceSteps = stepsBySourceId.get(items[idx].id) ?? [];
        const tcId = newCases[idx].id;
        for (let j = 0; j < sourceSteps.length; j++) {
          stepRows.push({
            testCaseId: tcId,
            stepNumber: j + 1,
            action: sourceSteps[j].action,
            expectedResult: sourceSteps[j].expectedResult,
          });
        }
      }
      await testCaseStepRepository.createMany(stepRows);
    }
  },
};
