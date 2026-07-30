import { dashboardRepository } from '../repositories/dashboardRepository';

export const dashboardService = {
  getCounts(userId: string) {
    return dashboardRepository.getCounts(userId);
  },

  getRecentProjects(limit = 5) {
    return dashboardRepository.findRecentProjects(limit);
  },

  getContinueWorking(limit = 3) {
    return dashboardRepository.findContinueWorking(limit);
  },

  getMyWorkIssues(userId: string, limit = 5) {
    return dashboardRepository.findMyWorkIssues(userId, limit);
  },

  getRecentActivity(limit = 10) {
    return dashboardRepository.findRecentActivity(limit);
  },
};
