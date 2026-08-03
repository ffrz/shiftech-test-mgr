import { projectRepository, type ProjectPaginatedQuery, type ProjectQuery } from '../repositories/projectRepository';
import { profileRepository } from '../repositories/profileRepository';
import { activityService } from './activityService';
import type { ProjectStatus, ProjectVisibility } from '../types/domain';

export const projectService = {
  async list(query?: ProjectQuery) {
    const projects = await projectRepository.findAll(query);
    const ownerIds = [...new Set(projects.map((p) => p.ownerId).filter(Boolean))] as string[];
    const profiles = ownerIds.length ? await profileRepository.findByIds(ownerIds) : [];
    const profileMap = new Map(profiles.map((p) => [p.id, p]));
    return projects.map((project) => ({
      ...project,
      _ownerUsername: profileMap.get(project.ownerId)?.username ?? null,
      _ownerDisplayName: profileMap.get(project.ownerId)?.displayName ?? null,
    }));
  },

  async listPaginated(query: ProjectPaginatedQuery) {
    const result = await projectRepository.findAllPaginated(query);
    const ownerIds = [...new Set(result.data.map((p) => p.ownerId).filter(Boolean))] as string[];
    const profiles = ownerIds.length ? await profileRepository.findByIds(ownerIds) : [];
    const profileMap = new Map(profiles.map((p) => [p.id, p]));
    return {
      data: result.data.map((project) => ({
        ...project,
        _ownerUsername: profileMap.get(project.ownerId)?.username ?? '—',
        _ownerDisplayName: profileMap.get(project.ownerId)?.displayName ?? '—',
      })),
      total: result.total,
    };
  },

  listByOwner(ownerId: string, visibilityFilter?: string[]) {
    return projectRepository.findByOwner(ownerId, visibilityFilter);
  },

  getById(id: string) {
    return projectRepository.findById(id);
  },

  async create(input: { name: string; description?: string; visibility?: ProjectVisibility }, actorId?: string) {
    if (!input.name.trim()) throw new Error('Project name cannot be empty');
    const project = await projectRepository.create({
      name: input.name.trim(),
      description: input.description?.trim() || null,
      visibility: input.visibility ?? 'private',
    });
    if (actorId) {
      await activityService.logEvent({
        projectId: project.id,
        entityType: 'project',
        entityId: project.id,
        actorId,
        eventType: 'created',
        payload: { name: project.name },
      });
    }
    return project;
  },

  async update(id: string, input: { name: string; description?: string; visibility?: ProjectVisibility }, actorId?: string) {
    if (!input.name.trim()) throw new Error('Project name cannot be empty');
    const project = await projectRepository.update(id, {
      name: input.name.trim(),
      description: input.description?.trim() || null,
      ...(input.visibility ? { visibility: input.visibility } : {}),
    });
    if (actorId) {
      await activityService.logEvent({
        projectId: id,
        entityType: 'project',
        entityId: id,
        actorId,
        eventType: 'updated',
        payload: { name: project.name },
      });
    }
    return project;
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
