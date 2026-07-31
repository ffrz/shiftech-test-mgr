import { projectRepository, type ProjectPaginatedQuery, type ProjectQuery } from '../repositories/projectRepository';
import { activityService } from './activityService';
import type { ProjectStatus, ProjectVisibility } from '../types/domain';

export const projectService = {
  list(query?: ProjectQuery) {
    return projectRepository.findAll(query);
  },

  listPaginated(query: ProjectPaginatedQuery) {
    return projectRepository.findAllPaginated(query);
  },

  listByOwner(ownerId: string, visibilityFilter?: string[]) {
    return projectRepository.findByOwner(ownerId, visibilityFilter);
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

  async changeStatus(id: string, status: ProjectStatus, actor?: { actorId: string }) {
    const previous = await projectRepository.findById(id);
    const project = await projectRepository.updateStatus(id, status);
    if (actor && previous && previous.status !== status) {
      await activityService.logEvent({
        projectId: id,
        entityType: 'project',
        entityId: id,
        actorId: actor.actorId,
        eventType: 'status_change',
        payload: { from: previous.status, to: status },
      });
    }
    return project;
  },

  deletePermanently(id: string) {
    return projectRepository.deletePermanently(id);
  },

  getSummaryCounts(id: string) {
    return projectRepository.getSummaryCounts(id);
  },
};
