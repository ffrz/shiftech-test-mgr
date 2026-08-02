import type { Project, ProjectStatus, ProjectVisibility } from '../../../types/domain';
import type {
  ProjectPaginatedQuery,
  ProjectQuery,
  ProjectRepository,
  ProjectSummaryCounts,
} from '../../interfaces/projectRepository';

let seq = 0;
function nextId(): string {
  seq += 1;
  return `mock-project-${seq}`;
}

/**
 * In-memory ProjectRepository implementation for tests — a real, stateful
 * implementation of the contract (not per-call vi.fn() stubs), useful when
 * a test needs create → list → update round-trips to behave like a real
 * backend without touching Supabase or backend/rest-api/.
 *
 * This is a *factory*, not a singleton: call createMockProjectRepository()
 * once per test (e.g. in beforeEach) so state never leaks between tests.
 * For simple "was this called with X" assertions on a single method,
 * vi.mock() + vi.fn() (see services/*.test.ts) is still the right tool —
 * this is for scenarios that need actual round-trip behavior.
 */
export function createMockProjectRepository(seed: Project[] = []): ProjectRepository {
  const store = new Map<string, Project>(seed.map((p) => [p.id, p]));

  return {
    async findAll(query: ProjectQuery = {}): Promise<Project[]> {
      let projects = [...store.values()];
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

    async findAllPaginated(query: ProjectPaginatedQuery): Promise<{ data: Project[]; total: number }> {
      let projects = [...store.values()];
      if (query.search?.trim()) {
        const needle = query.search.trim().toLowerCase();
        projects = projects.filter((p) => p.name.toLowerCase().includes(needle));
      }
      if (query.statuses?.length) {
        projects = projects.filter((p) => query.statuses!.includes(p.status));
      }
      if (query.visibilities?.length) {
        projects = projects.filter((p) => query.visibilities!.includes(p.visibility));
      }
      if (query.ownerFilter === 'mine' && query.currentUserId) {
        projects = projects.filter((p) => p.ownerId === query.currentUserId);
      } else if (query.ownerFilter === 'shared' && query.currentUserId) {
        projects = projects.filter((p) => p.ownerId !== query.currentUserId);
      }
      const total = projects.length;
      const from = (query.page - 1) * query.pageSize;
      return { data: projects.slice(from, from + query.pageSize), total };
    },

    async findByOwner(ownerId: string, visibilityFilter?: string[]): Promise<Project[]> {
      let projects = [...store.values()].filter((p) => p.ownerId === ownerId);
      if (visibilityFilter?.length) {
        projects = projects.filter((p) => visibilityFilter.includes(p.visibility));
      }
      return projects.sort((a, b) => a.name.localeCompare(b.name));
    },

    async findById(id: string): Promise<Project | null> {
      return store.get(id) ?? null;
    },

    async create(input: { name: string; description: string | null; visibility?: ProjectVisibility }): Promise<Project> {
      const now = new Date().toISOString();
      const project: Project = {
        id: nextId(),
        ownerId: 'mock-user',
        ownerType: 'user',
        name: input.name,
        description: input.description,
        status: 'active',
        visibility: input.visibility ?? 'private',
        createdAt: now,
        updatedAt: now,
      };
      store.set(project.id, project);
      return project;
    },

    async update(
      id: string,
      changes: Partial<Pick<Project, 'name' | 'description' | 'visibility'>>,
    ): Promise<Project> {
      const existing = store.get(id);
      if (!existing) throw new Error(`mock project not found: ${id}`);
      const updated: Project = { ...existing, ...changes, updatedAt: new Date().toISOString() };
      store.set(id, updated);
      return updated;
    },

    async updateStatus(id: string, status: ProjectStatus): Promise<Project> {
      const existing = store.get(id);
      if (!existing) throw new Error(`mock project not found: ${id}`);
      const updated: Project = { ...existing, status, updatedAt: new Date().toISOString() };
      store.set(id, updated);
      return updated;
    },

    async deletePermanently(id: string): Promise<void> {
      store.delete(id);
    },

    async getSummaryCounts(_projectId: string): Promise<ProjectSummaryCounts> {
      return { testPlanCount: 0, testCaseCount: 0, testRunCount: 0, issueCount: 0, memberCount: 0 };
    },
  };
}
