import { moduleRepository } from '../repositories/moduleRepository';

export const moduleService = {
  listByProject(projectId: string) {
    return moduleRepository.findAllByProject(projectId);
  },

  async create(input: { projectId: string; name: string; code?: string }) {
    if (!input.name.trim()) throw new Error('Module name cannot be empty');
    return moduleRepository.create({ projectId: input.projectId, name: input.name.trim(), code: input.code?.trim() || null });
  },

  async update(id: string, input: { name: string; code: string }) {
    if (!input.name.trim()) throw new Error('Module name cannot be empty');
    if (!input.code.trim()) throw new Error('Module code cannot be empty');
    return moduleRepository.update(id, { name: input.name.trim(), code: input.code.trim() });
  },

  remove(id: string) {
    return moduleRepository.remove(id);
  },
};
