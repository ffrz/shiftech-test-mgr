import { projectRepository, type ProjectPaginatedQuery, type ProjectQuery } from '../repositories/projectRepository';
import type { ProjectStatus, ProjectVisibility } from '../types/domain';

export const projectService = {
  list(query?: ProjectQuery) {
    return projectRepository.findAll(query);
  },

  listPaginated(query: ProjectPaginatedQuery) {
    return projectRepository.findAllPaginated(query);
  },

  getById(id: string) {
    return projectRepository.findById(id);
  },

  async create(input: { name: string; description?: string; visibility?: ProjectVisibility }) {
    if (!input.name.trim()) throw new Error('Project name cannot be empty');
    return projectRepository.create({
      name: input.name.trim(),
      description: input.description?.trim() || null,
      visibility: input.visibility ?? 'private',
    });
  },

  async update(id: string, input: { name: string; description?: string; visibility?: ProjectVisibility }) {
    if (!input.name.trim()) throw new Error('Project name cannot be empty');
    return projectRepository.update(id, {
      name: input.name.trim(),
      description: input.description?.trim() || null,
      ...(input.visibility ? { visibility: input.visibility } : {}),
    });
  },

  changeStatus(id: string, status: ProjectStatus) {
    return projectRepository.updateStatus(id, status);
  },

  deletePermanently(id: string) {
    return projectRepository.deletePermanently(id);
  },
};
