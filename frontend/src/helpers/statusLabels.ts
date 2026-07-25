import type {
  IssuePriority,
  IssueStatus,
  IssueType,
  ProjectMemberRole,
  ProjectStatus,
  TestCasePriority,
  TestCaseStatus,
  TestPlanStatus,
  TestResultStatus,
  TestRunStatus,
  UserRole,
} from '../types/domain';

export type TagSeverity = 'success' | 'info' | 'warning' | 'danger' | 'secondary';

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
  archived: 'Archived',
};

export const PROJECT_STATUS_SEVERITY: Record<ProjectStatus, TagSeverity> = {
  active: 'success',
  inactive: 'warning',
  archived: 'secondary',
};

export const TEST_PLAN_STATUS_LABEL: Record<TestPlanStatus, string> = {
  draft: 'Draft',
  active: 'Active',
  completed: 'Completed',
  archived: 'Archived',
};

export const TEST_PLAN_STATUS_SEVERITY: Record<TestPlanStatus, TagSeverity> = {
  draft: 'info',
  active: 'success',
  completed: 'secondary',
  archived: 'warning',
};

export const TEST_CASE_STATUS_LABEL: Record<TestCaseStatus, string> = {
  active: 'Active',
  archived: 'Archived',
};

export const TEST_CASE_STATUS_SEVERITY: Record<TestCaseStatus, TagSeverity> = {
  active: 'success',
  archived: 'secondary',
};

export const TEST_CASE_PRIORITY_LABEL: Record<TestCasePriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};

export const TEST_CASE_PRIORITY_SEVERITY: Record<TestCasePriority, TagSeverity> = {
  low: 'secondary',
  medium: 'info',
  high: 'warning',
  critical: 'danger',
};

export const TEST_RUN_STATUS_LABEL: Record<TestRunStatus, string> = {
  in_progress: 'In Progress',
  completed: 'Completed',
};

export const TEST_RUN_STATUS_SEVERITY: Record<TestRunStatus, TagSeverity> = {
  in_progress: 'info',
  completed: 'success',
};

export const TEST_RESULT_STATUS_LABEL: Record<TestResultStatus, string> = {
  pass: 'Pass',
  fail: 'Fail',
  skip: 'Skipped',
  blocked: 'Blocked',
  not_run: 'Not Run',
};

export const TEST_RESULT_STATUS_SEVERITY: Record<TestResultStatus, TagSeverity> = {
  pass: 'success',
  fail: 'danger',
  skip: 'secondary',
  blocked: 'warning',
  not_run: 'info',
};

export const ISSUE_PRIORITY_LABEL: Record<IssuePriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};

export const ISSUE_PRIORITY_SEVERITY: Record<IssuePriority, TagSeverity> = {
  low: 'secondary',
  medium: 'info',
  high: 'warning',
  critical: 'danger',
};

export const ISSUE_STATUS_LABEL: Record<IssueStatus, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  verified: 'Verified',
  closed: 'Closed',
};

export const ISSUE_STATUS_SEVERITY: Record<IssueStatus, TagSeverity> = {
  open: 'danger',
  in_progress: 'warning',
  resolved: 'info',
  verified: 'success',
  closed: 'secondary',
};

export const ISSUE_TYPE_LABEL: Record<IssueType, string> = {
  bug: 'Bug',
  feature: 'Feature',
  improvement: 'Improvement',
  task: 'Task',
};

export const ISSUE_TYPE_SEVERITY: Record<IssueType, TagSeverity> = {
  bug: 'danger',
  feature: 'info',
  improvement: 'success',
  task: 'secondary',
};

export const USER_ROLE_LABEL: Record<UserRole, string> = {
  user: 'User',
  admin: 'Admin',
};

export const USER_ROLE_SEVERITY: Record<UserRole, TagSeverity> = {
  user: 'info',
  admin: 'success',
};

export const PROJECT_MEMBER_ROLE_LABEL: Record<ProjectMemberRole, string> = {
  manager: 'Manager',
  supervisor: 'Supervisor',
  tester: 'Tester',
  member: 'Member',
};

export const PROJECT_MEMBER_ROLE_SEVERITY: Record<ProjectMemberRole, TagSeverity> = {
  manager: 'success',
  supervisor: 'warning',
  tester: 'info',
  member: 'secondary',
};
