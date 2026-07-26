import { testSuiteRepository } from '../repositories/testSuiteRepository';
import { testCaseService } from './testCaseService';
import { moduleService } from './moduleService';
import { testRoleService } from './testRoleService';
import type { TestSuite, TestSuiteItem, TestSuiteItemWithSteps, TestSuiteVisibility } from '../types/domain';

export const testSuiteService = {
  listSuites() {
    return testSuiteRepository.findAll();
  },

  listPaginated(params: {
    search?: string;
    ownership?: 'mine' | 'all';
    visibilityFilter?: string[];
    userId?: string;
    page: number;
    pageSize: number;
    sortField?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    return testSuiteRepository.findAllPaginated(params);
  },

  getSuite(id: string) {
    return testSuiteRepository.findById(id);
  },

  async createSuite(input: { name: string; description?: string; visibility?: TestSuiteVisibility }): Promise<TestSuite> {
    if (!input.name.trim()) throw new Error('Suite name cannot be empty');
    return testSuiteRepository.create({
      name: input.name.trim(),
      description: input.description?.trim() || null,
      visibility: input.visibility ?? 'private',
    });
  },

  async updateSuite(id: string, input: { name: string; description?: string; visibility?: TestSuiteVisibility }): Promise<TestSuite> {
    if (!input.name.trim()) throw new Error('Suite name cannot be empty');
    return testSuiteRepository.update(id, {
      name: input.name.trim(),
      description: input.description?.trim() || null,
      ...(input.visibility ? { visibility: input.visibility } : {}),
    });
  },

  removeSuite(id: string) {
    return testSuiteRepository.remove(id);
  },

  async duplicateSuite(
    sourceSuiteId: string,
    input: { name: string; description?: string },
  ): Promise<TestSuite> {
    if (!input.name.trim()) throw new Error('Suite name cannot be empty');
    const newSuite = await testSuiteRepository.create({
      name: input.name.trim(),
      description: input.description?.trim() || null,
    });

    const sourceItems = await testSuiteRepository.findItemsBySuite(sourceSuiteId);
    for (const item of sourceItems) {
      const detailedSteps =
        item.stepType === 'detailed' ? await testSuiteRepository.findStepsByItem(item.id) : [];

      await this.addItem({
        suiteId: newSuite.id,
        moduleName: item.moduleName ?? undefined,
        title: item.title,
        objective: item.objective ?? undefined,
        preconditions: item.preconditions ?? undefined,
        steps: item.steps,
        expectedResult: item.expectedResult,
        priority: item.priority,
        targetRole: item.targetRole ?? undefined,
        tagNames: item.tagNames,
        stepType: item.stepType,
        detailedSteps: detailedSteps.map((s) => ({
          action: s.action,
          expectedResult: s.expectedResult ?? undefined,
        })),
        orderIndex: item.orderIndex,
      });
    }

    return newSuite;
  },

  listItems(suiteId: string) {
    return testSuiteRepository.findItemsBySuite(suiteId);
  },

  async getItemWithSteps(item: TestSuiteItem): Promise<TestSuiteItemWithSteps> {
    const detailedSteps = item.stepType === 'detailed' ? await testSuiteRepository.findStepsByItem(item.id) : [];
    return { ...item, detailedSteps };
  },

  async addItem(input: {
    suiteId: string;
    moduleName?: string;
    title: string;
    objective?: string;
    preconditions?: string;
    steps: string;
    expectedResult: string;
    priority?: TestSuiteItem['priority'];
    targetRole?: string;
    tagNames?: string[];
    stepType?: TestSuiteItem['stepType'];
    detailedSteps?: { action: string; expectedResult?: string }[];
    orderIndex: number;
  }): Promise<TestSuiteItem> {
    if (!input.title.trim()) throw new Error('Test case title cannot be empty');
    const stepType = input.stepType ?? 'simple';
    if (stepType === 'simple') {
      if (!input.steps.trim()) throw new Error('Test steps cannot be empty');
      if (!input.expectedResult.trim()) throw new Error('Expected result cannot be empty');
    } else if (!input.detailedSteps?.length) {
      throw new Error('A detailed test case must have at least one step');
    }

    const item = await testSuiteRepository.createItem({
      suiteId: input.suiteId,
      moduleName: input.moduleName?.trim() || null,
      title: input.title.trim(),
      objective: input.objective?.trim() || null,
      preconditions: input.preconditions?.trim() || null,
      steps: input.steps.trim(),
      expectedResult: input.expectedResult.trim(),
      priority: input.priority ?? 'medium',
      stepType,
      targetRole: input.targetRole?.trim() || null,
      tagNames: input.tagNames ?? [],
      orderIndex: input.orderIndex,
    });

    if (stepType === 'detailed' && input.detailedSteps) {
      await testSuiteRepository.replaceStepsForItem(
        item.id,
        input.detailedSteps.map((s) => ({ action: s.action, expectedResult: s.expectedResult?.trim() || null })),
      );
    }

    return item;
  },

  async updateItem(
    id: string,
    changes: Partial<Omit<TestSuiteItem, 'id' | 'suiteId' | 'createdAt' | 'updatedAt'>>,
    detailedSteps?: { action: string; expectedResult?: string }[],
  ): Promise<TestSuiteItem> {
    const item = await testSuiteRepository.updateItem(id, changes);
    if (item.stepType === 'detailed' && detailedSteps !== undefined) {
      await testSuiteRepository.replaceStepsForItem(
        id,
        detailedSteps.map((s) => ({ action: s.action, expectedResult: s.expectedResult?.trim() || null })),
      );
    }
    return item;
  },

  removeItem(id: string) {
    return testSuiteRepository.removeItem(id);
  },

  // Clones the given suite items into a project's own test_cases. module_name/tag_names
  // are text on the suite item (suites aren't project-scoped) — resolved here into
  // real per-project Module/Tag rows, find-or-create, cached per call so a batch of items
  // sharing a module name only creates it once.
  async cloneItemsToProject(projectId: string, itemIds: string[]): Promise<void> {
    if (itemIds.length === 0) return;
    const items = await testSuiteRepository.findItemsByIds(itemIds);

    const existingModules = await moduleService.listByProject(projectId);
    const moduleIdByName = new Map(existingModules.map((m) => [m.name.toLowerCase(), m.id]));

    async function resolveModuleId(moduleName: string | null): Promise<string | null> {
      if (!moduleName) return null;
      const key = moduleName.toLowerCase();
      const existing = moduleIdByName.get(key);
      if (existing) return existing;
      const created = await moduleService.create({ projectId, name: moduleName });
      moduleIdByName.set(key, created.id);
      return created.id;
    }

    const existingTestRoles = await testRoleService.listByProject(projectId);
    const testRoleIdByName = new Map(existingTestRoles.map((r) => [r.name.toLowerCase(), r.id]));

    async function resolveTestRoleId(roleName: string | null): Promise<string | null> {
      if (!roleName) return null;
      const key = roleName.toLowerCase();
      const existing = testRoleIdByName.get(key);
      if (existing) return existing;
      const created = await testRoleService.create({ projectId, name: roleName });
      testRoleIdByName.set(key, created.id);
      return created.id;
    }

    for (const item of items) {
      const moduleId = await resolveModuleId(item.moduleName);
      const targetRoleId = await resolveTestRoleId(item.targetRole);
      const detailedSteps =
        item.stepType === 'detailed' ? await testSuiteRepository.findStepsByItem(item.id) : [];

      await testCaseService.create({
        projectId,
        moduleId,
        title: item.title,
        objective: item.objective ?? undefined,
        preconditions: item.preconditions ?? undefined,
        steps: item.steps,
        expectedResult: item.expectedResult,
        priority: item.priority,
        targetRoleId,
        tagNames: item.tagNames,
        stepType: item.stepType,
        detailedSteps: item.stepType === 'detailed'
          ? detailedSteps.map((s) => ({ action: s.action, expectedResult: s.expectedResult ?? undefined }))
          : undefined,
      });
    }
  },
};
