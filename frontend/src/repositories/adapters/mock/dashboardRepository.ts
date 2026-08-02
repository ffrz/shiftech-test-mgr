import type { Project, TestPlan, TestCase, Issue, TestSuite, TestRun, ActivityEntry } from '../../../types/domain';
import type { DashboardRepository, ContinueWorkingItem, MyWorkIssue } from '../../interfaces/dashboardRepository';

export interface MockDashboardSeed {
  projects?: Project[];
  testPlans?: TestPlan[];
  testCases?: TestCase[];
  issues?: Issue[];
  testSuites?: TestSuite[];
  testRuns?: TestRun[];
  activity?: ActivityEntry[];
}

export function createMockDashboardRepository(seed: MockDashboardSeed = {}): DashboardRepository {
  const projects = seed.projects ?? [];
  const testPlans = seed.testPlans ?? [];
  const testCases = seed.testCases ?? [];
  const issues = seed.issues ?? [];
  const testSuites = seed.testSuites ?? [];
  const testRuns = seed.testRuns ?? [];
  const activity = seed.activity ?? [];

  const projectMap = new Map(projects.map((p) => [p.id, p]));
  const testPlanMap = new Map(testPlans.map((p) => [p.id, p]));

  return {
    async getCounts(userId: string) {
      return {
        projectCount: projects.length,
        testPlanCount: testPlans.length,
        testCaseCount: testCases.length,
        issueCount: issues.length,
        openIssueCount: issues.filter((i) => !['closed', 'rejected', 'duplicate'].includes(i.status)).length,
        testSuiteOwnedCount: testSuites.filter((s) => s.ownerId === userId).length,
        runningTestRunCount: testRuns.filter((r) => r.status === 'in_progress').length,
      };
    },

    async findRecentProjects(limit: number) {
      const sorted = [...projects].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      return sorted.slice(0, limit);
    },

    async findContinueWorking(limit: number): Promise<ContinueWorkingItem[]> {
      const inProgress = testRuns
        .filter((r) => r.status === 'in_progress')
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .slice(0, limit);

      return inProgress
        .filter((r) => projectMap.has(r.projectId))
        .map((r) => ({
          project: projectMap.get(r.projectId)!,
          testPlan: r.testPlanId ? (testPlanMap.get(r.testPlanId) ?? null) : null,
          testRunName: r.name,
          updatedAt: r.updatedAt,
        }));
    },

    async findMyWorkIssues(userId: string, limit: number): Promise<MyWorkIssue[]> {
      const matched = issues
        .filter((i) => i.assignedTo === userId && !['closed', 'rejected', 'duplicate'].includes(i.status))
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .slice(0, limit);

      return matched.map((i) => {
        const project = projectMap.get(i.projectId);
        return {
          ...i,
          projectName: project?.name ?? '',
          projectOwnerId: project?.ownerId ?? null,
        };
      });
    },

    async findRecentActivity(limit: number) {
      const active = activity
        .filter((a) => a.deletedAt === null)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, limit);
      return active;
    },
  };
}
