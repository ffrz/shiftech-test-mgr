import { dashboardRepository } from '../repositories/dashboardRepository';

export const dashboardService = {
  getCounts() {
    return dashboardRepository.getCounts();
  },

  getRecentProjects(limit = 5) {
    return dashboardRepository.findRecentProjects(limit);
  },

  getContinueWorking(limit = 3) {
    return dashboardRepository.findContinueWorking(limit);
  },
};
