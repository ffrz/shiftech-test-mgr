import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('../repositories/projectRepository', () => ({
  projectRepository: {
    findAll: vi.fn(),
    findAllPaginated: vi.fn(),
    findByOwner: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateStatus: vi.fn(),
    deletePermanently: vi.fn(),
    getSummaryCounts: vi.fn(),
  },
}));
vi.mock('../repositories/profileRepository', () => ({
  profileRepository: { findByIds: vi.fn() },
}));
vi.mock('./activityService', () => ({
  activityService: { logEvent: vi.fn() },
}));

const { projectRepository } = await import('../repositories/projectRepository');
const { profileRepository } = await import('../repositories/profileRepository');
const { activityService } = await import('./activityService');
const { projectService } = await import('./projectService');

function makeProject(overrides: Record<string, unknown> = {}) {
  return {
    id: 'proj-1',
    ownerId: 'u1',
    ownerType: 'user',
    name: 'Project',
    description: null,
    status: 'active',
    visibility: 'private',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('projectService passthrough reads', () => {
  it('delegates listByOwner', async () => {
    vi.mocked(projectRepository.findByOwner).mockResolvedValue([makeProject()] as never);
    const result = await projectService.listByOwner('u1', ['private']);
    expect(projectRepository.findByOwner).toHaveBeenCalledWith('u1', ['private']);
    expect(result).toHaveLength(1);
  });

  it('delegates getById', async () => {
    vi.mocked(projectRepository.findById).mockResolvedValue(makeProject() as never);
    const result = await projectService.getById('proj-1');
    expect(projectRepository.findById).toHaveBeenCalledWith('proj-1');
    expect(result?.id).toBe('proj-1');
  });

  it('delegates deletePermanently', async () => {
    vi.mocked(projectRepository.deletePermanently).mockResolvedValue(undefined);
    await projectService.deletePermanently('proj-1');
    expect(projectRepository.deletePermanently).toHaveBeenCalledWith('proj-1');
  });

  it('delegates getSummaryCounts', async () => {
    vi.mocked(projectRepository.getSummaryCounts).mockResolvedValue({
      modules: 1,
      testCases: 2,
      testPlans: 3,
    } as never);
    const result = await projectService.getSummaryCounts('proj-1');
    expect(projectRepository.getSummaryCounts).toHaveBeenCalledWith('proj-1');
    expect(result).toMatchObject({ modules: 1, testCases: 2, testPlans: 3 });
  });
});

describe('projectService.create', () => {
  it('rejects an empty name', async () => {
    await expect(projectService.create({ name: '   ' })).rejects.toThrow('Project name cannot be empty');
    expect(projectRepository.create).not.toHaveBeenCalled();
  });

  it('trims name/description and defaults visibility to private', async () => {
    vi.mocked(projectRepository.create).mockResolvedValue(makeProject() as never);

    await projectService.create({ name: '  New Project  ', description: '  desc  ' });

    expect(projectRepository.create).toHaveBeenCalledWith({
      name: 'New Project',
      description: 'desc',
      visibility: 'private',
    });
  });

  it('passes visibility through when provided', async () => {
    vi.mocked(projectRepository.create).mockResolvedValue(makeProject() as never);

    await projectService.create({ name: 'P', visibility: 'public' });

    expect(projectRepository.create).toHaveBeenCalledWith({
      name: 'P',
      description: null,
      visibility: 'public',
    });
  });
});

describe('projectService.update', () => {
  it('rejects an empty name', async () => {
    await expect(projectService.update('proj-1', { name: '  ' })).rejects.toThrow(
      'Project name cannot be empty',
    );
  });

  it('trims name/description and only includes visibility when provided', async () => {
    vi.mocked(projectRepository.update).mockResolvedValue(makeProject() as never);

    await projectService.update('proj-1', { name: '  Renamed  ', description: '  d  ' });

    expect(projectRepository.update).toHaveBeenCalledWith('proj-1', {
      name: 'Renamed',
      description: 'd',
    });
  });

  it('includes visibility when provided', async () => {
    vi.mocked(projectRepository.update).mockResolvedValue(makeProject() as never);

    await projectService.update('proj-1', { name: 'R', visibility: 'unlisted' });

    expect(projectRepository.update).toHaveBeenCalledWith('proj-1', {
      name: 'R',
      description: null,
      visibility: 'unlisted',
    });
  });
});

describe('projectService.list', () => {
  it('deduplicates owner ids before fetching profiles and falls back to null', async () => {
    vi.mocked(projectRepository.findAll).mockResolvedValue([
      makeProject({ id: 'p1', ownerId: 'u1' }),
      makeProject({ id: 'p2', ownerId: 'u1' }),
      makeProject({ id: 'p3', ownerId: null }),
    ] as never);
    vi.mocked(profileRepository.findByIds).mockResolvedValue([
      { id: 'u1', username: 'alice', displayName: 'Alice' },
    ] as never);

    const projects = await projectService.list({});

    expect(profileRepository.findByIds).toHaveBeenCalledWith(['u1']);
    expect(projects[0]).toMatchObject({ _ownerUsername: 'alice', _ownerDisplayName: 'Alice' });
    expect(projects[1]).toMatchObject({ _ownerUsername: 'alice', _ownerDisplayName: 'Alice' });
    expect(projects[2]).toMatchObject({ _ownerUsername: null, _ownerDisplayName: null });
  });

  it('skips the profile fetch entirely when no project has an owner', async () => {
    vi.mocked(projectRepository.findAll).mockResolvedValue([
      makeProject({ id: 'p1', ownerId: null }),
    ] as never);

    await projectService.list({});

    expect(profileRepository.findByIds).not.toHaveBeenCalled();
  });
});

describe('projectService.listPaginated', () => {
  it('uses the em dash fallback, distinct from list() null fallback', async () => {
    vi.mocked(projectRepository.findAllPaginated).mockResolvedValue({
      data: [
        makeProject({ id: 'p1', ownerId: 'u1' }),
        makeProject({ id: 'p2', ownerId: 'u-ghost' }),
      ],
      total: 2,
    } as never);
    vi.mocked(profileRepository.findByIds).mockResolvedValue([
      { id: 'u1', username: 'alice', displayName: null },
    ] as never);

    const result = await projectService.listPaginated({ page: 1, pageSize: 10 });

    expect(profileRepository.findByIds).toHaveBeenCalledWith(['u1', 'u-ghost']);
    expect(result.data[0]).toMatchObject({ _ownerUsername: 'alice', _ownerDisplayName: '—' });
    expect(result.data[1]).toMatchObject({ _ownerUsername: '—', _ownerDisplayName: '—' });
    expect(result.total).toBe(2);
  });

  it('skips the profile fetch entirely when there are no owners', async () => {
    vi.mocked(projectRepository.findAllPaginated).mockResolvedValue({
      data: [{ id: 'p1', ownerId: null }],
      total: 1,
    } as never);

    const result = await projectService.listPaginated({ page: 1, pageSize: 10 });

    expect(profileRepository.findByIds).not.toHaveBeenCalled();
    expect(result.data[0]).toMatchObject({ _ownerUsername: '—', _ownerDisplayName: '—' });
  });
});

describe('projectService.changeStatus', () => {
  it('logs activity only when the status changes AND an actor is given', async () => {
    vi.mocked(projectRepository.findById).mockResolvedValue(makeProject({ status: 'active' }) as never);
    vi.mocked(projectRepository.updateStatus).mockResolvedValue(makeProject({ status: 'archived' }) as never);

    await projectService.changeStatus('proj-1', 'archived', { actorId: 'user-a' });

    expect(activityService.logEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: 'proj-1',
        entityType: 'project',
        entityId: 'proj-1',
        eventType: 'status_change',
        payload: { from: 'active', to: 'archived' },
      }),
    );
  });

  it('does not log activity when no actor is given', async () => {
    vi.mocked(projectRepository.findById).mockResolvedValue(makeProject({ status: 'active' }) as never);
    vi.mocked(projectRepository.updateStatus).mockResolvedValue(makeProject({ status: 'archived' }) as never);

    await projectService.changeStatus('proj-1', 'archived');

    expect(activityService.logEvent).not.toHaveBeenCalled();
  });

  it('does not log activity when the status is unchanged', async () => {
    vi.mocked(projectRepository.findById).mockResolvedValue(makeProject({ status: 'active' }) as never);
    vi.mocked(projectRepository.updateStatus).mockResolvedValue(makeProject({ status: 'active' }) as never);

    await projectService.changeStatus('proj-1', 'active', { actorId: 'user-a' });

    expect(activityService.logEvent).not.toHaveBeenCalled();
  });

  it('does not log activity when the previous project is missing', async () => {
    vi.mocked(projectRepository.findById).mockResolvedValue(null);
    vi.mocked(projectRepository.updateStatus).mockResolvedValue(makeProject({ status: 'active' }) as never);

    await projectService.changeStatus('proj-1', 'active', { actorId: 'user-a' });

    expect(activityService.logEvent).not.toHaveBeenCalled();
  });
});
