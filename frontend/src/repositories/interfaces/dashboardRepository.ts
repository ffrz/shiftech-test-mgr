import type { Project, TestPlan, Issue, ActivityEntry } from '../../types/domain';

export interface MyWorkIssue extends Issue {
  projectName: string;
  projectOwnerId: string | null;
}

export interface DashboardCounts {
  projectCount: number;
  testPlanCount: number;
  testCaseCount: number;
  issueCount: number;
  openIssueCount: number;
  testSuiteOwnedCount: number;
  runningTestRunCount: number;
}

export interface ContinueWorkingItem {
  project: Project;
  testPlan: TestPlan | null;
  testRunName: string;
  updatedAt: string;
}

export interface DashboardRepository {
  getCounts(userId: string): Promise<DashboardCounts>;
  findRecentProjects(limit: number): Promise<Project[]>;
  findContinueWorking(limit: number): Promise<ContinueWorkingItem[]>;
  findMyWorkIssues(userId: string, limit: number): Promise<MyWorkIssue[]>;
  findRecentActivity(limit: number): Promise<ActivityEntry[]>;
}
