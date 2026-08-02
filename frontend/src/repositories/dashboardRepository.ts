import { dashboardRepositoryAdapter } from './adapters/dashboardResolver';

export type { MyWorkIssue, DashboardCounts, ContinueWorkingItem } from './interfaces/dashboardRepository';

// Pure delegation to whichever adapter is active for this domain (see
// adapters/dashboardResolver.ts) — no Supabase/REST-specific code lives here.
export const dashboardRepository = {
  async getCounts(userId: string) {
    return dashboardRepositoryAdapter.getCounts(userId);
  },

  async findRecentProjects(limit: number) {
    return dashboardRepositoryAdapter.findRecentProjects(limit);
  },

  async findContinueWorking(limit: number) {
    return dashboardRepositoryAdapter.findContinueWorking(limit);
  },

  async findMyWorkIssues(userId: string, limit: number) {
    return dashboardRepositoryAdapter.findMyWorkIssues(userId, limit);
  },

  async findRecentActivity(limit: number) {
    return dashboardRepositoryAdapter.findRecentActivity(limit);
  },
};
