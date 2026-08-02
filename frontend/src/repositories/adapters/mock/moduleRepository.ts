import type { Module } from '../../../types/domain';
import type { ModuleRepository } from '../../interfaces/moduleRepository';

let seq = 0;
function nextId(): string {
  seq += 1;
  return `mock-module-${seq}`;
}

export function createMockModuleRepository(seed: Module[] = []): ModuleRepository {
  const store = new Map<string, Module>(seed.map((m) => [m.id, m]));

  return {
    async findAllByProject(projectId: string): Promise<Module[]> {
      return [...store.values()]
        .filter((m) => m.projectId === projectId)
        .sort((a, b) => a.code.localeCompare(b.code));
    },
    async create(input: { projectId: string; name: string; code?: string | null }): Promise<Module> {
      const now = new Date().toISOString();
      const mod: Module = {
        id: nextId(),
        projectId: input.projectId,
        code: input.code || '',
        name: input.name,
        createdAt: now,
        updatedAt: now,
      };
      store.set(mod.id, mod);
      return mod;
    },
    async update(id: string, changes: { name?: string; code?: string }): Promise<Module> {
      const existing = store.get(id);
      if (!existing) throw new Error(`mock module not found: ${id}`);
      const updated: Module = { ...existing, ...changes, updatedAt: new Date().toISOString() };
      store.set(id, updated);
      return updated;
    },
    async createMany(inputs: { projectId: string; name: string; code?: string | null }[]): Promise<Module[]> {
      return Promise.all(inputs.map((i) => this.create(i)));
    },
    async remove(id: string): Promise<void> {
      store.delete(id);
    },
  };
}
