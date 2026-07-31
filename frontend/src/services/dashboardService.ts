import { dashboardRepository } from '../repositories/dashboardRepository';
import { profileRepository } from '../repositories/profileRepository';

export const dashboardService = {
  getCounts(userId: string) {
    return dashboardRepository.getCounts(userId);
  },

  async getRecentProjects(limit = 5) {
    const projects = await dashboardRepository.findRecentProjects(limit);
    const ownerIds = [...new Set(projects.map((p) => p.ownerId).filter(Boolean))] as string[];
    const profiles = ownerIds.length ? await profileRepository.findByIds(ownerIds) : [];
    const profileMap = new Map(profiles.map((p) => [p.id, p]));
    return projects.map((project) => ({
      ...project,
      _ownerUsername: profileMap.get(project.ownerId)?.username ?? null,
      _ownerDisplayName: profileMap.get(project.ownerId)?.displayName ?? null,
    }));
  },

  async getContinueWorking(limit = 3) {
    const items = await dashboardRepository.findContinueWorking(limit);
    const ownerIds = [...new Set(items.map((i) => i.project.ownerId).filter(Boolean))] as string[];
    const profiles = ownerIds.length ? await profileRepository.findByIds(ownerIds) : [];
    const profileMap = new Map(profiles.map((p) => [p.id, p]));
    return items.map((item) => ({
      ...item,
      _ownerUsername: profileMap.get(item.project.ownerId)?.username ?? null,
      _ownerDisplayName: profileMap.get(item.project.ownerId)?.displayName ?? null,
    }));
  },

  async getMyWorkIssues(userId: string, limit = 5) {
    const issues = await dashboardRepository.findMyWorkIssues(userId, limit);
    const ownerIds = [...new Set(issues.map((i) => i.projectOwnerId).filter(Boolean))] as string[];
    const profiles = ownerIds.length ? await profileRepository.findByIds(ownerIds) : [];
    const profileMap = new Map(profiles.map((p) => [p.id, p]));
    return issues.map((issue) => ({
      ...issue,
      _ownerUsername: profileMap.get(issue.projectOwnerId ?? '')?.username ?? null,
      _ownerDisplayName: profileMap.get(issue.projectOwnerId ?? '')?.displayName ?? null,
    }));
  },

  getRecentActivity(limit = 10) {
    return dashboardRepository.findRecentActivity(limit);
  },
};
