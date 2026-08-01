import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('../repositories/dashboardRepository', () => ({
  dashboardRepository: {
    getCounts: vi.fn(),
    findRecentProjects: vi.fn(),
    findContinueWorking: vi.fn(),
    findMyWorkIssues: vi.fn(),
    findRecentActivity: vi.fn(),
  },
}));
vi.mock('../repositories/profileRepository', () => ({
  profileRepository: { findByIds: vi.fn() },
}));

const { dashboardRepository } = await import('../repositories/dashboardRepository');
const { profileRepository } = await import('../repositories/profileRepository');
const { dashboardService } = await import('./dashboardService');

beforeEach(() => {
  vi.clearAllMocks();
});

describe('dashboardService.getCounts', () => {
  it('delegates to dashboardRepository.getCounts', async () => {
    vi.mocked(dashboardRepository.getCounts).mockResolvedValue({ projects: 2, runs: 3 } as never);
    const result = await dashboardService.getCounts('u1');
    expect(dashboardRepository.getCounts).toHaveBeenCalledWith('u1');
    expect(result).toMatchObject({ projects: 2, runs: 3 });
  });
});

describe('dashboardService.getRecentActivity', () => {
  it('delegates to dashboardRepository.findRecentActivity', async () => {
    vi.mocked(dashboardRepository.findRecentActivity).mockResolvedValue([{ id: 'a1' } as never]);
    const result = await dashboardService.getRecentActivity();
    expect(dashboardRepository.findRecentActivity).toHaveBeenCalledWith(10);
    expect(result).toHaveLength(1);
  });
});

describe('dashboardService.getRecentProjects', () => {
  it('dedups owners via p.ownerId and falls back to null', async () => {
    vi.mocked(dashboardRepository.findRecentProjects).mockResolvedValue([
      { id: 'p1', ownerId: 'u1' },
      { id: 'p2', ownerId: 'u1' },
      { id: 'p3', ownerId: null },
    ] as never);
    vi.mocked(profileRepository.findByIds).mockResolvedValue([
      { id: 'u1', username: 'alice', displayName: 'Alice' },
    ] as never);

    const projects = await dashboardService.getRecentProjects();

    expect(profileRepository.findByIds).toHaveBeenCalledWith(['u1']);
    expect(projects[0]).toMatchObject({ _ownerUsername: 'alice', _ownerDisplayName: 'Alice' });
    expect(projects[1]).toMatchObject({ _ownerUsername: 'alice' });
    expect(projects[2]).toMatchObject({ _ownerUsername: null, _ownerDisplayName: null });
  });

  it('skips the profile lookup when there are no owners', async () => {
    vi.mocked(dashboardRepository.findRecentProjects).mockResolvedValue([] as never);

    const projects = await dashboardService.getRecentProjects();

    expect(profileRepository.findByIds).not.toHaveBeenCalled();
    expect(projects).toEqual([]);
  });
});

describe('dashboardService.getContinueWorking', () => {
  it('reads the owner from item.project.ownerId', async () => {
    vi.mocked(dashboardRepository.findContinueWorking).mockResolvedValue([
      { id: 'run-1', project: { id: 'p1', ownerId: 'u1' } },
      { id: 'run-2', project: { id: 'p2', ownerId: null } },
    ] as never);
    vi.mocked(profileRepository.findByIds).mockResolvedValue([
      { id: 'u1', username: 'alice', displayName: null },
    ] as never);

    const items = await dashboardService.getContinueWorking();

    expect(profileRepository.findByIds).toHaveBeenCalledWith(['u1']);
    expect(items[0]).toMatchObject({ _ownerUsername: 'alice', _ownerDisplayName: null });
    expect(items[1]).toMatchObject({ _ownerUsername: null, _ownerDisplayName: null });
  });

  it('skips the profile lookup when there are no owners', async () => {
    vi.mocked(dashboardRepository.findContinueWorking).mockResolvedValue([] as never);

    const items = await dashboardService.getContinueWorking();

    expect(profileRepository.findByIds).not.toHaveBeenCalled();
    expect(items).toEqual([]);
  });
});

describe('dashboardService.getMyWorkIssues', () => {
  it('reads the owner from issue.projectOwnerId', async () => {
    vi.mocked(dashboardRepository.findMyWorkIssues).mockResolvedValue([
      { id: 'iss-1', projectOwnerId: 'u1' },
      { id: 'iss-2', projectOwnerId: 'u-ghost' },
      { id: 'iss-3', projectOwnerId: null },
    ] as never);
    vi.mocked(profileRepository.findByIds).mockResolvedValue([
      { id: 'u1', username: 'alice', displayName: 'Alice' },
    ] as never);

    const issues = await dashboardService.getMyWorkIssues('user-a');

    expect(profileRepository.findByIds).toHaveBeenCalledWith(['u1', 'u-ghost']);
    expect(issues[0]).toMatchObject({ _ownerUsername: 'alice', _ownerDisplayName: 'Alice' });
    expect(issues[1]).toMatchObject({ _ownerUsername: null, _ownerDisplayName: null });
    expect(issues[2]).toMatchObject({ _ownerUsername: null, _ownerDisplayName: null });
  });

  it('skips the profile lookup when there are no owners', async () => {
    vi.mocked(dashboardRepository.findMyWorkIssues).mockResolvedValue([] as never);

    const issues = await dashboardService.getMyWorkIssues('user-a');

    expect(profileRepository.findByIds).not.toHaveBeenCalled();
    expect(issues).toEqual([]);
  });
});
