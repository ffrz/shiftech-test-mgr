import type { Project, ProjectSortField, ProjectStatus, ProjectVisibility, SortDirection } from '../../types/domain';

/**
 * Experiment: switchable data source contract for Project reads/writes, so
 * the backend can move from Supabase direct-access to the Go REST API
 * (backend/rest-api/) one module at a time without frontend consumers
 * (services/hooks/pages) changing at all — repositories/projectRepository.ts
 * just delegates to whichever adapter implements this contract.
 *
 * backend/rest-api/ + core.ProjectRepository currently only implement
 * List/Get — repositories/adapters/rest/projectRepository.ts throws
 * for the rest (see backend/BACKLOG.md Epic 9).
 * repositories/adapters/supabase/projectRepository.ts implements the
 * full contract since it's the long-standing, complete data source.
 */
export interface ProjectQuery {
  search?: string;
  status?: ProjectStatus | 'all';
  sortField?: ProjectSortField;
  sortDirection?: SortDirection;
}

export type ProjectOwnerFilter = 'all' | 'mine' | 'shared';

export interface ProjectPaginatedQuery {
  search?: string;
  statuses?: string[];
  visibilities?: string[];
  ownerFilter?: ProjectOwnerFilter;
  currentUserId?: string;
  page: number;
  pageSize: number;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ProjectSummaryCounts {
  testPlanCount: number;
  testCaseCount: number;
  testRunCount: number;
  issueCount: number;
  memberCount: number;
}

export interface ProjectRepository {
  findAll(query?: ProjectQuery): Promise<Project[]>;
  findAllPaginated(query: ProjectPaginatedQuery): Promise<{ data: Project[]; total: number }>;
  findByOwner(ownerId: string, visibilityFilter?: string[]): Promise<Project[]>;
  findById(id: string): Promise<Project | null>;
  create(input: { name: string; description: string | null; visibility?: ProjectVisibility }): Promise<Project>;
  update(id: string, changes: Partial<Pick<Project, 'name' | 'description' | 'visibility'>>): Promise<Project>;
  updateStatus(id: string, status: ProjectStatus): Promise<Project>;
  deletePermanently(id: string): Promise<void>;
  getSummaryCounts(projectId: string): Promise<ProjectSummaryCounts>;
}
