import type { TestRole } from '../../types/domain';

export interface TestRoleRepository {
  findAllByProject(projectId: string): Promise<TestRole[]>;
  create(input: { projectId: string; name: string }): Promise<TestRole>;
  update(id: string, changes: { name: string }): Promise<TestRole>;
  createMany(inputs: { projectId: string; name: string }[]): Promise<TestRole[]>;
  remove(id: string): Promise<void>;
}
