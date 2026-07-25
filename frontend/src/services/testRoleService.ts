import { testRoleRepository } from '../repositories/testRoleRepository';

export const testRoleService = {
  listByProject(projectId: string) {
    return testRoleRepository.findAllByProject(projectId);
  },

  async create(input: { projectId: string; name: string }) {
    if (!input.name.trim()) throw new Error('Role name cannot be empty');
    return testRoleRepository.create({ projectId: input.projectId, name: input.name.trim() });
  },

  async update(id: string, input: { name: string }) {
    if (!input.name.trim()) throw new Error('Role name cannot be empty');
    return testRoleRepository.update(id, { name: input.name.trim() });
  },

  remove(id: string) {
    return testRoleRepository.remove(id);
  },
};
