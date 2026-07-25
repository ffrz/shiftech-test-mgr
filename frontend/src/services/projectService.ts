import { projectRepository, type ProjectQuery } from '../repositories/projectRepository';
import type { ProjectStatus } from '../types/domain';

export const projectService = {
  list(query?: ProjectQuery) {
    return projectRepository.findAll(query);
  },

  getById(id: string) {
    return projectRepository.findById(id);
  },

  async create(input: { name: string; description?: string }) {
    if (!input.name.trim()) throw new Error('Project name cannot be empty');
    return projectRepository.create({ name: input.name.trim(), description: input.description?.trim() || null });
  },

  async update(id: string, input: { name: string; description?: string }) {
    if (!input.name.trim()) throw new Error('Project name cannot be empty');
    return projectRepository.update(id, { name: input.name.trim(), description: input.description?.trim() || null });
  },

  changeStatus(id: string, status: ProjectStatus) {
    return projectRepository.updateStatus(id, status);
  },

  deletePermanently(id: string) {
    return projectRepository.deletePermanently(id);
  },
};
