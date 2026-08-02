import { testRoleRepositoryAdapter } from './adapters/testRoleResolver';
import type { TestRole } from '../types/domain';

export const testRoleRepository = {
  async findAllByProject(projectId: string): Promise<TestRole[]> {
    return testRoleRepositoryAdapter.findAllByProject(projectId);
  },
  async create(input: { projectId: string; name: string }): Promise<TestRole> {
    return testRoleRepositoryAdapter.create(input);
  },
  async update(id: string, changes: { name: string }): Promise<TestRole> {
    return testRoleRepositoryAdapter.update(id, changes);
  },
  async createMany(inputs: { projectId: string; name: string }[]): Promise<TestRole[]> {
    return testRoleRepositoryAdapter.createMany(inputs);
  },
  async remove(id: string): Promise<void> {
    return testRoleRepositoryAdapter.remove(id);
  },
};
