import { projectRepositoryAdapter } from './adapters/projectResolver';
import type { ProjectPaginatedQuery, ProjectQuery } from './interfaces/projectRepository';
import type { Project, ProjectStatus, ProjectVisibility } from '../types/domain';

export type { ProjectQuery, ProjectPaginatedQuery };
export type { ProjectOwnerFilter } from './interfaces/projectRepository';

// Pure delegation to whichever adapter is active for this domain (see
// adapters/projectResolver.ts) — no Supabase/REST-specific code lives here.
// Swapping backends means swapping the adapter, not this file.
export const projectRepository = {
  findAll(query: ProjectQuery = {}): Promise<Project[]> {
    return projectRepositoryAdapter.findAll(query);
  },

  findAllPaginated(query: ProjectPaginatedQuery): Promise<{ data: Project[]; total: number }> {
    return projectRepositoryAdapter.findAllPaginated(query);
  },

  findByOwner(ownerId: string, visibilityFilter?: string[]): Promise<Project[]> {
    return projectRepositoryAdapter.findByOwner(ownerId, visibilityFilter);
  },

  findById(id: string): Promise<Project | null> {
    return projectRepositoryAdapter.findById(id);
  },

  create(input: { name: string; description: string | null; visibility?: ProjectVisibility }): Promise<Project> {
    return projectRepositoryAdapter.create(input);
  },

  update(id: string, changes: Partial<Pick<Project, 'name' | 'description' | 'visibility'>>): Promise<Project> {
    return projectRepositoryAdapter.update(id, changes);
  },

  updateStatus(id: string, status: ProjectStatus): Promise<Project> {
    return projectRepositoryAdapter.updateStatus(id, status);
  },

  deletePermanently(id: string): Promise<void> {
    return projectRepositoryAdapter.deletePermanently(id);
  },

  getSummaryCounts(projectId: string) {
    return projectRepositoryAdapter.getSummaryCounts(projectId);
  },
};
