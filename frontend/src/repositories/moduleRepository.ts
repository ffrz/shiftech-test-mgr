import { moduleRepositoryAdapter } from './adapters/moduleResolver';
import type { Module } from '../types/domain';

export type { ModuleRepository } from './interfaces/moduleRepository';

export const moduleRepository = {
  findAllByProject(projectId: string): Promise<Module[]> {
    return moduleRepositoryAdapter.findAllByProject(projectId);
  },
  create(input: { projectId: string; name: string; code?: string | null }): Promise<Module> {
    return moduleRepositoryAdapter.create(input);
  },
  update(id: string, changes: { name?: string; code?: string }): Promise<Module> {
    return moduleRepositoryAdapter.update(id, changes);
  },
  createMany(inputs: { projectId: string; name: string; code?: string | null }[]): Promise<Module[]> {
    return moduleRepositoryAdapter.createMany(inputs);
  },
  remove(id: string): Promise<void> {
    return moduleRepositoryAdapter.remove(id);
  },
};
