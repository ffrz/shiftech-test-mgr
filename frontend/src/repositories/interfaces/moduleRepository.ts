import type { Module } from '../../types/domain';

export interface ModuleRepository {
  findAllByProject(projectId: string): Promise<Module[]>;
  create(input: { projectId: string; name: string; code?: string | null }): Promise<Module>;
  update(id: string, changes: { name?: string; code?: string }): Promise<Module>;
  createMany(inputs: { projectId: string; name: string; code?: string | null }[]): Promise<Module[]>;
  remove(id: string): Promise<void>;
}
