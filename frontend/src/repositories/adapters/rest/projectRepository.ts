import type { Project } from '../../../types/domain';
import type {
  ProjectPaginatedQuery,
  ProjectQuery,
  ProjectRepository,
  ProjectSummaryCounts,
} from '../../interfaces/projectRepository';

const REST_API_URL = import.meta.env.VITE_REST_API_URL as string | undefined;

// Shape returned by backend/rest-api/ — matches core.Project's json tags,
// which is camelCase already (no snake_case mapping needed like Supabase
// rows), but core.Project has no ownerType — Go backend doesn't model
// organization ownership yet, only 'user' exists in the frontend today.
interface RestProjectDTO {
  id: string;
  name: string;
  description: string;
  status: Project['status'];
  visibility: Project['visibility'];
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

function mapRestProject(dto: RestProjectDTO): Project {
  return {
    id: dto.id,
    ownerId: dto.ownerId,
    ownerType: 'user',
    name: dto.name,
    description: dto.description || null,
    status: dto.status,
    visibility: dto.visibility,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

async function fetchJson<T>(path: string): Promise<T> {
  if (!REST_API_URL) {
    throw new Error('VITE_REST_API_URL is not set — required to use the REST project data source.');
  }
  const res = await fetch(`${REST_API_URL}${path}`);
  if (!res.ok) {
    throw new Error(`REST API request failed: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

function notImplemented(method: string): never {
  throw new Error(
    `repositories/adapters/rest/projectRepository.${method}() is not implemented — backend/rest-api/ only exposes GET /projects and GET /projects/:id so far (see backend/BACKLOG.md Epic 9).`,
  );
}

// Experiment adapter for backend/rest-api/ (validation spike — see
// backend/rest-api/README.md). Only findAll/findById are backed by real
// endpoints (core.ProjectRepository: List/Get) — everything else throws
// rather than silently falling back to Supabase, so a caller immediately
// knows this data source doesn't cover that operation yet.
export const projectRepositoryAdapter: ProjectRepository = {
  async findAll(query: ProjectQuery = {}): Promise<Project[]> {
    const dtos = await fetchJson<RestProjectDTO[]>('/projects');
    let projects = dtos.map(mapRestProject);

    if (query.search?.trim()) {
      const needle = query.search.trim().toLowerCase();
      projects = projects.filter((p) => p.name.toLowerCase().includes(needle));
    }
    if (query.status && query.status !== 'all') {
      projects = projects.filter((p) => p.status === query.status);
    }

    const sortField = query.sortField ?? 'name';
    const direction = query.sortDirection ?? 'asc';
    projects.sort((a, b) => {
      const cmp = a[sortField] < b[sortField] ? -1 : a[sortField] > b[sortField] ? 1 : 0;
      return direction === 'asc' ? cmp : -cmp;
    });

    return projects;
  },

  async findById(id: string): Promise<Project | null> {
    try {
      const dto = await fetchJson<RestProjectDTO>(`/projects/${id}`);
      return mapRestProject(dto);
    } catch (err) {
      if (err instanceof Error && err.message.includes('404')) return null;
      throw err;
    }
  },

  findAllPaginated(_query: ProjectPaginatedQuery): Promise<{ data: Project[]; total: number }> {
    notImplemented('findAllPaginated');
  },

  findByOwner(_ownerId: string, _visibilityFilter?: string[]): Promise<Project[]> {
    notImplemented('findByOwner');
  },

  create(_input: unknown): Promise<Project> {
    notImplemented('create');
  },

  update(_id: string, _changes: unknown): Promise<Project> {
    notImplemented('update');
  },

  updateStatus(_id: string, _status: unknown): Promise<Project> {
    notImplemented('updateStatus');
  },

  deletePermanently(_id: string): Promise<void> {
    notImplemented('deletePermanently');
  },

  getSummaryCounts(_projectId: string): Promise<ProjectSummaryCounts> {
    notImplemented('getSummaryCounts');
  },
};
