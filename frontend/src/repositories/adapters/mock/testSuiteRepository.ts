import type { TestSuite, TestSuiteItem, TestSuiteItemStep, TestSuiteVisibility } from '../../../types/domain';
import type { TestSuiteRepository } from '../../interfaces/testSuiteRepository';

let suiteSeq = 0;
function nextSuiteId(): string {
  suiteSeq += 1;
  return `mock-suite-${suiteSeq}`;
}

let itemSeq = 0;
function nextItemId(): string {
  itemSeq += 1;
  return `mock-item-${itemSeq}`;
}

let stepSeq = 0;
function nextStepId(): string {
  stepSeq += 1;
  return `mock-step-${stepSeq}`;
}

export function createMockTestSuiteRepository(seed?: {
  suites?: TestSuite[];
  items?: TestSuiteItem[];
  steps?: TestSuiteItemStep[];
}): TestSuiteRepository {
  const suiteStore = new Map<string, TestSuite>(seed?.suites?.map((s) => [s.id, s]) ?? []);
  const itemStore = new Map<string, TestSuiteItem>(seed?.items?.map((i) => [i.id, i]) ?? []);
  const stepStore = new Map<string, TestSuiteItemStep>(seed?.steps?.map((s) => [s.id, s]) ?? []);

  return {
    async findAllPaginated(params) {
      let suites = [...suiteStore.values()];

      if (params.ownership === 'mine' && params.userId) {
        suites = suites.filter((s) => s.ownerId === params.userId);
      } else if (params.ownership === 'all' && params.userId) {
        suites = suites.filter((s) => s.ownerId !== params.userId);
      }

      if (params.search) {
        const q = params.search.replace(/%/g, '').toLowerCase();
        suites = suites.filter((s) => s.name.toLowerCase().includes(q));
      }

      if (params.visibilityFilter?.length) {
        suites = suites.filter((s) => params.visibilityFilter!.includes(s.visibility));
      }

      const sortFieldMap: Record<string, string> = {
        name: 'name',
        updatedAt: 'updatedAt',
        createdAt: 'createdAt',
      };
      const col = sortFieldMap[params.sortField ?? 'name'] ?? 'name';
      suites.sort((a, b) => {
        const va = a[col as keyof TestSuite] ?? '';
        const vb = b[col as keyof TestSuite] ?? '';
        return params.sortOrder === 'desc'
          ? String(vb).localeCompare(String(va))
          : String(va).localeCompare(String(vb));
      });

      const total = suites.length;
      const from = (params.page - 1) * params.pageSize;
      return { data: suites.slice(from, from + params.pageSize), total };
    },

    async findAll() {
      return [...suiteStore.values()].sort((a, b) => a.name.localeCompare(b.name));
    },

    async findByOwner(ownerId, visibilityFilter?) {
      let suites = [...suiteStore.values()].filter((s) => s.ownerId === ownerId);
      if (visibilityFilter?.length) {
        suites = suites.filter((s) => visibilityFilter.includes(s.visibility));
      }
      return suites.sort((a, b) => a.name.localeCompare(b.name));
    },

    async findById(id) {
      return suiteStore.get(id) ?? null;
    },

    async create(input) {
      const now = new Date().toISOString();
      const suite: TestSuite = {
        id: nextSuiteId(),
        ownerId: 'mock-user',
        name: input.name,
        description: input.description,
        visibility: input.visibility as TestSuiteVisibility ?? 'private',
        createdAt: now,
        updatedAt: now,
      };
      suiteStore.set(suite.id, suite);
      return suite;
    },

    async update(id, changes) {
      const existing = suiteStore.get(id);
      if (!existing) throw new Error(`mock suite not found: ${id}`);
      const updated: TestSuite = { ...existing, ...changes, updatedAt: new Date().toISOString() };
      suiteStore.set(id, updated);
      return updated;
    },

    async remove(id) {
      suiteStore.delete(id);
    },

    async findItemsBySuite(suiteId) {
      return [...itemStore.values()]
        .filter((i) => i.suiteId === suiteId)
        .sort((a, b) => a.orderIndex - b.orderIndex);
    },

    async findItemsByIds(itemIds) {
      if (itemIds.length === 0) return [];
      return itemIds.map((id) => itemStore.get(id)).filter(Boolean) as TestSuiteItem[];
    },

    async findItemById(itemId) {
      return itemStore.get(itemId) ?? null;
    },

    async createItem(input) {
      const now = new Date().toISOString();
      const item: TestSuiteItem = {
        id: nextItemId(),
        suiteId: input.suiteId,
        moduleName: input.moduleName,
        title: input.title,
        objective: input.objective,
        preconditions: input.preconditions,
        steps: input.steps,
        expectedResult: input.expectedResult,
        priority: input.priority,
        stepType: input.stepType,
        targetRole: input.targetRole,
        tagNames: input.tagNames,
        notes: input.notes,
        orderIndex: input.orderIndex,
        createdAt: now,
        updatedAt: now,
      };
      itemStore.set(item.id, item);
      return item;
    },

    async updateItem(id, changes) {
      const existing = itemStore.get(id);
      if (!existing) throw new Error(`mock item not found: ${id}`);
      const updated: TestSuiteItem = { ...existing, ...changes, updatedAt: new Date().toISOString() };
      itemStore.set(id, updated);
      return updated;
    },

    async removeItem(id) {
      itemStore.delete(id);
    },

    async removeItemsMany(ids) {
      if (ids.length === 0) return;
      for (const id of ids) {
        itemStore.delete(id);
      }
    },

    async createItemsMany(inputs) {
      if (inputs.length === 0) return [];
      const results: TestSuiteItem[] = [];
      for (const input of inputs) {
        results.push(await this.createItem(input));
      }
      return results;
    },

    async findStepsByItems(suiteItemIds) {
      if (suiteItemIds.length === 0) return [];
      return [...stepStore.values()]
        .filter((s) => suiteItemIds.includes(s.suiteItemId))
        .sort((a, b) => a.stepNumber - b.stepNumber);
    },

    async createStepsMany(steps) {
      if (steps.length === 0) return [];
      const results: TestSuiteItemStep[] = [];
      for (const s of steps) {
        const step: TestSuiteItemStep = {
          id: nextStepId(),
          suiteItemId: s.suiteItemId,
          stepNumber: s.stepNumber,
          action: s.action,
          expectedResult: s.expectedResult,
        };
        stepStore.set(step.id, step);
        results.push(step);
      }
      return results;
    },

    async findStepsByItem(suiteItemId) {
      return [...stepStore.values()]
        .filter((s) => s.suiteItemId === suiteItemId)
        .sort((a, b) => a.stepNumber - b.stepNumber);
    },

    async replaceStepsForItem(suiteItemId, steps) {
      for (const [id, s] of stepStore) {
        if (s.suiteItemId === suiteItemId) {
          stepStore.delete(id);
        }
      }

      if (steps.length === 0) return [];

      const results: TestSuiteItemStep[] = [];
      for (let i = 0; i < steps.length; i++) {
        const step: TestSuiteItemStep = {
          id: nextStepId(),
          suiteItemId,
          stepNumber: i + 1,
          action: steps[i].action,
          expectedResult: steps[i].expectedResult,
        };
        stepStore.set(step.id, step);
        results.push(step);
      }
      return results;
    },
  };
}
