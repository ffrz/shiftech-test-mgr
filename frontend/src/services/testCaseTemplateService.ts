import { testCaseTemplateRepository } from '../repositories/testCaseTemplateRepository';
import { testCaseService } from './testCaseService';
import { moduleService } from './moduleService';
import { testRoleService } from './testRoleService';
import type { TestCaseTemplate, TestCaseTemplateItem, TestCaseTemplateItemWithSteps } from '../types/domain';

export const testCaseTemplateService = {
  listTemplates() {
    return testCaseTemplateRepository.findAll();
  },

  getTemplate(id: string) {
    return testCaseTemplateRepository.findById(id);
  },

  async createTemplate(input: { name: string; description?: string }): Promise<TestCaseTemplate> {
    if (!input.name.trim()) throw new Error('Nama template tidak boleh kosong');
    return testCaseTemplateRepository.create({ name: input.name.trim(), description: input.description?.trim() || null });
  },

  async updateTemplate(id: string, input: { name: string; description?: string }): Promise<TestCaseTemplate> {
    if (!input.name.trim()) throw new Error('Nama template tidak boleh kosong');
    return testCaseTemplateRepository.update(id, { name: input.name.trim(), description: input.description?.trim() || null });
  },

  removeTemplate(id: string) {
    return testCaseTemplateRepository.remove(id);
  },

  async duplicateTemplate(
    sourceTemplateId: string,
    input: { name: string; description?: string },
  ): Promise<TestCaseTemplate> {
    if (!input.name.trim()) throw new Error('Nama template tidak boleh kosong');
    const newTemplate = await testCaseTemplateRepository.create({
      name: input.name.trim(),
      description: input.description?.trim() || null,
    });

    const sourceItems = await testCaseTemplateRepository.findItemsByTemplate(sourceTemplateId);
    for (const item of sourceItems) {
      const detailedSteps =
        item.stepType === 'detailed' ? await testCaseTemplateRepository.findStepsByItem(item.id) : [];

      await this.addItem({
        templateId: newTemplate.id,
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

    return newTemplate;
  },

  listItems(templateId: string) {
    return testCaseTemplateRepository.findItemsByTemplate(templateId);
  },

  async getItemWithSteps(item: TestCaseTemplateItem): Promise<TestCaseTemplateItemWithSteps> {
    const detailedSteps = item.stepType === 'detailed' ? await testCaseTemplateRepository.findStepsByItem(item.id) : [];
    return { ...item, detailedSteps };
  },

  async addItem(input: {
    templateId: string;
    moduleName?: string;
    title: string;
    objective?: string;
    preconditions?: string;
    steps: string;
    expectedResult: string;
    priority?: TestCaseTemplateItem['priority'];
    targetRole?: string;
    tagNames?: string[];
    stepType?: TestCaseTemplateItem['stepType'];
    detailedSteps?: { action: string; expectedResult?: string }[];
    orderIndex: number;
  }): Promise<TestCaseTemplateItem> {
    if (!input.title.trim()) throw new Error('Judul test case tidak boleh kosong');
    const stepType = input.stepType ?? 'simple';
    if (stepType === 'simple') {
      if (!input.steps.trim()) throw new Error('Langkah pengujian tidak boleh kosong');
      if (!input.expectedResult.trim()) throw new Error('Hasil yang diharapkan tidak boleh kosong');
    } else if (!input.detailedSteps?.length) {
      throw new Error('Test case detailed harus punya minimal satu langkah');
    }

    const item = await testCaseTemplateRepository.createItem({
      templateId: input.templateId,
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
      await testCaseTemplateRepository.replaceStepsForItem(
        item.id,
        input.detailedSteps.map((s) => ({ action: s.action, expectedResult: s.expectedResult?.trim() || null })),
      );
    }

    return item;
  },

  async updateItem(
    id: string,
    changes: Partial<Omit<TestCaseTemplateItem, 'id' | 'templateId' | 'createdAt' | 'updatedAt'>>,
    detailedSteps?: { action: string; expectedResult?: string }[],
  ): Promise<TestCaseTemplateItem> {
    const item = await testCaseTemplateRepository.updateItem(id, changes);
    if (item.stepType === 'detailed' && detailedSteps !== undefined) {
      await testCaseTemplateRepository.replaceStepsForItem(
        id,
        detailedSteps.map((s) => ({ action: s.action, expectedResult: s.expectedResult?.trim() || null })),
      );
    }
    return item;
  },

  removeItem(id: string) {
    return testCaseTemplateRepository.removeItem(id);
  },

  // Clones the given template items into a project's own test_cases. module_name/tag_names
  // are text on the template item (templates aren't project-scoped) — resolved here into
  // real per-project Module/Tag rows, find-or-create, cached per call so a batch of items
  // sharing a module name only creates it once.
  async cloneItemsToProject(projectId: string, itemIds: string[]): Promise<void> {
    if (itemIds.length === 0) return;
    const items = await testCaseTemplateRepository.findItemsByIds(itemIds);

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
        item.stepType === 'detailed' ? await testCaseTemplateRepository.findStepsByItem(item.id) : [];

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
