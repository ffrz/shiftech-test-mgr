import { testSuiteRepository } from '../repositories/testSuiteRepository';
import { testCaseRepository } from '../repositories/testCaseRepository';
import { profileRepository } from '../repositories/profileRepository';
import { moduleService } from './moduleService';
import { testRoleService } from './testRoleService';
import { tagService } from './tagService';
import { mapTestSuiteRow } from '../helpers/mappers';
import type { TestSuite, TestSuiteItem, TestSuiteItemStep, TestSuiteItemWithSteps, TestSuiteVisibility } from '../types/domain';

export const testSuiteService = {
  listSuites() {
    return testSuiteRepository.findAll();
  },

  async listPaginated(params: {
    search?: string;
    ownership?: 'mine' | 'all';
    visibilityFilter?: string[];
    userId?: string;
    page: number;
    pageSize: number;
    sortField?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const result = await testSuiteRepository.findAllPaginated(params);
    const ownerIds = [...new Set(result.data.map((r: any) => r.owner_id).filter(Boolean))] as string[];
    const profiles = ownerIds.length ? await profileRepository.findByIds(ownerIds) : [];
    const profileMap = new Map(profiles.map((p) => [p.id, p]));
    return {
      data: result.data.map((row: any) => ({
        ...mapTestSuiteRow(row),
        _authorUsername: profileMap.get(row.owner_id)?.username ?? '—',
        _authorDisplayName: profileMap.get(row.owner_id)?.displayName ?? '—',
      })),
      total: result.total,
    };
  },

  listByOwner(ownerId: string, visibilityFilter?: string[]) {
    return testSuiteRepository.findByOwner(ownerId, visibilityFilter);
  },

  async getSuite(id: string) {
    const suite = await testSuiteRepository.findById(id);
    if (!suite) return null;
    const profile = suite.ownerId ? await profileRepository.findById(suite.ownerId) : null;
    return {
      ...suite,
      _authorUsername: profile?.username ?? '—',
      _authorDisplayName: profile?.displayName ?? '—',
    };
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
    const sourceItemIds = sourceItems.filter((i) => i.stepType === 'detailed').map((i) => i.id);
    const stepsByItem = new Map<string, TestSuiteItemStep[]>();
    if (sourceItemIds.length > 0) {
      const allSteps = await testSuiteRepository.findStepsByItems(sourceItemIds);
      for (const step of allSteps) {
        const arr = stepsByItem.get(step.suiteItemId);
        if (arr) arr.push(step);
        else stepsByItem.set(step.suiteItemId, [step]);
      }
    }

    await this.addItemsMany(
      sourceItems.map((item) => ({
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
        detailedSteps:
          item.stepType === 'detailed'
            ? (stepsByItem.get(item.id) ?? []).map((s) => ({
                action: s.action,
                expectedResult: s.expectedResult ?? undefined,
              }))
            : undefined,
        orderIndex: item.orderIndex,
      })),
    );

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

  async addItemsMany(
    inputs: {
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
    }[],
  ): Promise<TestSuiteItem[]> {
    if (inputs.length === 0) return [];

    const items = await testSuiteRepository.createItemsMany(
      inputs.map((input) => {
        const stepType = input.stepType ?? 'simple';
        return {
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
        };
      }),
    );

    const stepRows: { suiteItemId: string; action: string; expectedResult: string | null; stepNumber: number }[] = [];
    for (let i = 0; i < inputs.length; i++) {
      const input = inputs[i];
      const item = items[i];
      if ((input.stepType ?? 'simple') === 'detailed' && input.detailedSteps?.length) {
        for (let j = 0; j < input.detailedSteps.length; j++) {
          stepRows.push({
            suiteItemId: item.id,
            stepNumber: j + 1,
            action: input.detailedSteps[j].action,
            expectedResult: input.detailedSteps[j].expectedResult?.trim() || null,
          });
        }
      }
    }
    if (stepRows.length > 0) {
      await testSuiteRepository.createStepsMany(stepRows);
    }

    return items;
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

  removeItemsMany(ids: string[]) {
    return testSuiteRepository.removeItemsMany(ids);
  },

  async cloneItemsToSuite(suiteId: string, itemIds: string[]): Promise<void> {
    if (itemIds.length === 0) return;
    const existingItems = await testSuiteRepository.findItemsBySuite(suiteId);
    const sourceItems = await testSuiteRepository.findItemsByIds(itemIds);

    const detailedIds = sourceItems.filter((i) => i.stepType === 'detailed').map((i) => i.id);
    const stepsByItem = new Map<string, TestSuiteItemStep[]>();
    if (detailedIds.length > 0) {
      const allSteps = await testSuiteRepository.findStepsByItems(detailedIds);
      for (const step of allSteps) {
        const arr = stepsByItem.get(step.suiteItemId);
        if (arr) arr.push(step);
        else stepsByItem.set(step.suiteItemId, [step]);
      }
    }

    await this.addItemsMany(
      sourceItems.map((item, i) => ({
        suiteId,
        moduleName: item.moduleName ?? undefined,
        title: item.title,
        objective: item.objective ?? undefined,
        preconditions: item.preconditions ?? undefined,
        steps: item.steps,
        expectedResult: item.expectedResult,
        priority: item.priority,
        targetRole: item.targetRole ?? undefined,
        tagNames: item.tagNames ?? [],
        stepType: item.stepType,
        detailedSteps:
          item.stepType === 'detailed'
            ? (stepsByItem.get(item.id) ?? []).map((s) => ({
                action: s.action,
                expectedResult: s.expectedResult ?? undefined,
              }))
            : undefined,
        orderIndex: existingItems.length + i,
      })),
    );
  },

  async cloneItemsToProject(projectId: string, itemIds: string[]): Promise<void> {
    if (itemIds.length === 0) return;
    const items = await testSuiteRepository.findItemsByIds(itemIds);

    const existingModules = await moduleService.listByProject(projectId);
    const moduleIdByName = new Map(existingModules.map((m) => [m.name.toLowerCase(), m.id]));
    const newModuleNames = [
      ...new Set(
        items
          .map((i) => i.moduleName?.trim())
          .filter((n): n is string => !!n && !moduleIdByName.has(n.toLowerCase())),
      ),
    ];
    if (newModuleNames.length > 0) {
      const created = await moduleService.createMany(newModuleNames.map((n) => ({ projectId, name: n })));
      for (const m of created) moduleIdByName.set(m.name.toLowerCase(), m.id);
    }

    const existingRoles = await testRoleService.listByProject(projectId);
    const roleIdByName = new Map(existingRoles.map((r) => [r.name.toLowerCase(), r.id]));
    const newRoleNames = [
      ...new Set(
        items
          .map((i) => i.targetRole?.trim())
          .filter((n): n is string => !!n && !roleIdByName.has(n.toLowerCase())),
      ),
    ];
    if (newRoleNames.length > 0) {
      const created = await testRoleService.createMany(newRoleNames.map((n) => ({ projectId, name: n })));
      for (const r of created) roleIdByName.set(r.name.toLowerCase(), r.id);
    }

    const testCases = await testCaseRepository.createMany(
      items.map((item) => ({
        projectId,
        moduleId: item.moduleName ? moduleIdByName.get(item.moduleName.toLowerCase()) ?? null : null,
        title: item.title,
        objective: item.objective ?? null,
        preconditions: item.preconditions ?? null,
        steps: item.steps,
        expectedResult: item.expectedResult,
        priority: item.priority,
        status: 'active' as const,
        notes: null,
        stepType: item.stepType,
        targetRoleId: item.targetRole ? roleIdByName.get(item.targetRole.toLowerCase()) ?? null : null,
      })),
    );

    await tagService.saveTagsForTestCaseMany(
      projectId,
      testCases.map((tc, i) => ({
        testCaseId: tc.id,
        tagNames: items[i]?.tagNames ?? [],
      })),
    );

    // Handle detailed steps: batch copy from test_suite_item_steps → test_case_steps
    const testCaseStepRepository = await import('../repositories/testCaseStepRepository').then((m) => m.testCaseStepRepository);
    const detailedIndices = items
      .map((item, i) => (item.stepType === 'detailed' ? i : -1))
      .filter((i) => i >= 0);
    if (detailedIndices.length > 0) {
      const allSteps = await testSuiteRepository.findStepsByItems(
        detailedIndices.map((i) => items[i].id),
      );
      const stepsBySourceId = new Map<string, TestSuiteItemStep[]>();
      for (const step of allSteps) {
        const arr = stepsBySourceId.get(step.suiteItemId);
        if (arr) arr.push(step);
        else stepsBySourceId.set(step.suiteItemId, [step]);
      }
      const stepRows: { testCaseId: string; action: string; expectedResult: string | null; stepNumber: number }[] = [];
      for (const idx of detailedIndices) {
        const sourceSteps = stepsBySourceId.get(items[idx].id) ?? [];
        const tcId = testCases[idx].id;
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
