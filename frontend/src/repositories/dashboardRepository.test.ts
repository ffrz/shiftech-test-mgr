import { describe, expect, it, vi } from 'vitest';

vi.stubEnv('VITE_DATA_SOURCE', 'mock');

const { dashboardRepository } = await import('./dashboardRepository');

describe('dashboardRepository (VITE_DATA_SOURCE=mock)', () => {
  it('getCounts() returns all-zero counts on the empty mock seed', async () => {
    const counts = await dashboardRepository.getCounts('dash-user-1');
    expect(counts).toEqual({
      projectCount: 0,
      testPlanCount: 0,
      testCaseCount: 0,
      issueCount: 0,
      openIssueCount: 0,
      testSuiteOwnedCount: 0,
      runningTestRunCount: 0,
    });
  });

  it('findRecentProjects() returns an empty list', async () => {
    await expect(dashboardRepository.findRecentProjects(5)).resolves.toEqual([]);
  });

  it('findMyWorkIssues() returns an empty list', async () => {
    await expect(dashboardRepository.findMyWorkIssues('dash-user-1', 5)).resolves.toEqual([]);
  });

  it('findRecentActivity() returns an empty list', async () => {
    await expect(dashboardRepository.findRecentActivity(5)).resolves.toEqual([]);
  });

  it('findContinueWorking() returns an empty list', async () => {
    await expect(dashboardRepository.findContinueWorking(5)).resolves.toEqual([]);
  });
});
