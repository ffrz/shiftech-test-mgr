import type { TestPlan } from '../../../types/domain';
import type { TestPlanRepository } from '../../interfaces/testPlanRepository';

let seq = 0;
function nextId(): string {
  seq += 1;
  return `mock-tp-${seq}`;
}

export function createMockTestPlanRepository(seed: TestPlan[] = []): TestPlanRepository {
  const store = new Map<string, TestPlan>(seed.map((p) => [p.id, p]));

  return {
    async findAllByProject(projectId, options) {
      let results = [...store.values()].filter((tp) => tp.projectId === projectId);
      if (options?.search?.trim()) {
        const q = options.search.trim().toLowerCase();
        results = results.filter((tp) => tp.name.toLowerCase().includes(q) || tp.code.toLowerCase().includes(q));
      }
      if (options?.statuses?.length) {
        results = results.filter((tp) => options.statuses!.includes(tp.status));
      }
      results.sort((a, b) => a.code.localeCompare(b.code));
      return results;
    },

    async findById(id) {
      return store.get(id) ?? null;
    },

    async create(input) {
      const now = new Date().toISOString();
      const tp: TestPlan = {
        id: nextId(),
        projectId: input.projectId,
        code: input.code || `TP-${seq}`,
        name: input.name,
        description: input.description,
        status: 'draft',
        createdBy: input.createdBy ?? null,
        createdAt: now,
        updatedAt: now,
      };
      store.set(tp.id, tp);
      return tp;
    },

    async update(id, changes) {
      const existing = store.get(id);
      if (!existing) throw new Error(`mock test plan not found: ${id}`);
      const updated: TestPlan = { ...existing, ...changes, updatedAt: new Date().toISOString() };
      store.set(id, updated);
      return updated;
    },

    async remove(id) {
      store.delete(id);
    },
  };
}
