import type { TestRole } from '../../../types/domain';
import type { TestRoleRepository } from '../../interfaces/testRoleRepository';

let seq = 0;
function nextId(): string {
  seq += 1;
  return `mock-trole-${seq}`;
}

export function createMockTestRoleRepository(seed: TestRole[] = []): TestRoleRepository {
  const store = new Map<string, TestRole>(seed.map((r) => [r.id, r]));

  return {
    async findAllByProject(projectId: string) {
      return [...store.values()]
        .filter((r) => r.projectId === projectId)
        .sort((a, b) => a.name.localeCompare(b.name));
    },

    async create(input: { projectId: string; name: string }) {
      const now = new Date().toISOString();
      const role: TestRole = {
        id: nextId(),
        projectId: input.projectId,
        name: input.name,
        createdAt: now,
        updatedAt: now,
      };
      store.set(role.id, role);
      return role;
    },

    async update(id: string, changes: { name: string }) {
      const existing = store.get(id);
      if (!existing) throw new Error(`mock test role not found: ${id}`);
      const updated: TestRole = { ...existing, ...changes, updatedAt: new Date().toISOString() };
      store.set(id, updated);
      return updated;
    },

    async createMany(inputs: { projectId: string; name: string }[]) {
      const results: TestRole[] = [];
      for (const input of inputs) {
        results.push(await this.create(input));
      }
      return results;
    },

    async remove(id: string) {
      store.delete(id);
    },
  };
}
