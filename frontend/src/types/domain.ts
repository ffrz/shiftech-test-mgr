export type UserRole = 'pending' | 'user' | 'admin';

export interface Profile {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export type ProjectStatus = 'active' | 'inactive' | 'archived';
export type ProjectSortField = 'name' | 'createdAt' | 'updatedAt';
export type SortDirection = 'asc' | 'desc';

export interface Project {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
}

export type ProjectMemberRole = 'manager' | 'supervisor' | 'tester' | 'member';

export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  role: ProjectMemberRole;
  createdAt: string;
}

export interface ProjectMemberWithProfile extends ProjectMember {
  profile: Profile;
}

export interface Module {
  id: string;
  projectId: string;
  code: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface Tag {
  id: string;
  projectId: string;
  name: string;
  createdAt: string;
}

// Role WITHIN the application under test (e.g. Admin/Manager/Member) — not a TestManager user
// role (see UserRole / ProjectMemberRole). Named TestRole to avoid confusion between the two.
export interface TestRole {
  id: string;
  projectId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export type TestPlanStatus = 'draft' | 'active' | 'completed' | 'archived';

export interface TestPlan {
  id: string;
  projectId: string;
  code: string;
  name: string;
  description: string | null;
  status: TestPlanStatus;
  createdAt: string;
  updatedAt: string;
}

// Test Case is a reusable template — it never stores a pass/fail result itself.
// Results live on TestResult, one row per (TestRun x TestCase).
export type TestCasePriority = 'low' | 'medium' | 'high' | 'critical';
export type TestCaseStatus = 'active' | 'archived';

export type TestCaseStepType = 'simple' | 'detailed';

export interface TestCase {
  id: string;
  projectId: string;
  moduleId: string | null;
  code: string;
  title: string;
  objective: string | null;
  preconditions: string | null;
  steps: string;
  expectedResult: string;
  priority: TestCasePriority;
  status: TestCaseStatus;
  notes: string | null;
  stepType: TestCaseStepType;
  // App role this test case targets (e.g. "Admin", "Manager") — the same logical test case
  // often needs a separate row per app role, this is purely for labeling/filtering, not a
  // variant system. Duplication across roles is manual.
  targetRoleId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TestCaseWithDetails extends TestCase {
  module: Module | null;
  tags: Tag[];
  targetRole: TestRole | null;
}

// Template step — only meaningful when the parent TestCase.stepType === 'detailed'.
export interface TestCaseStep {
  id: string;
  testCaseId: string;
  stepNumber: number;
  action: string;
  expectedResult: string | null;
  createdAt: string;
  updatedAt: string;
}

// Global, admin-managed library of reusable test case sets — not project-scoped. A project
// clones items from a suite into its own test_cases via testSuiteService.cloneItemsToProject.
export interface TestSuite {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TestSuiteItem {
  id: string;
  suiteId: string;
  // Text, not a FK — modules are project-scoped, resolved (find-or-create) at clone time.
  moduleName: string | null;
  title: string;
  objective: string | null;
  preconditions: string | null;
  steps: string;
  expectedResult: string;
  priority: TestCasePriority;
  stepType: TestCaseStepType;
  targetRole: string | null;
  tagNames: string[];
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
}

export interface TestSuiteItemStep {
  id: string;
  suiteItemId: string;
  stepNumber: number;
  action: string;
  expectedResult: string | null;
}

export interface TestSuiteItemWithSteps extends TestSuiteItem {
  detailedSteps: TestSuiteItemStep[];
}

// Junction: which test cases are in scope for a plan. No result columns here —
// see TestRun/TestResult for execution history.
export interface TestPlanCase {
  id: string;
  testPlanId: string;
  testCaseId: string;
  order: number;
}

export interface TestPlanCaseWithDetails extends TestPlanCase {
  testCase: TestCaseWithDetails;
}

export type TestRunStatus = 'in_progress' | 'completed';

export interface TestRun {
  id: string;
  projectId: string;
  // Null for a custom/unplanned run created directly from Test Cases, without a Test Plan.
  testPlanId: string | null;
  code: string;
  name: string;
  status: TestRunStatus;
  startedAt: string;
  completedAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export type TestResultStatus = 'pass' | 'fail' | 'skip' | 'blocked' | 'not_run';

// Snapshot of the test case content as it was when the run started — this is what the
// run screen displays, never a live join, so a completed run's history stays accurate
// even if the source test case is edited or archived afterwards.
export interface TestResult {
  id: string;
  testRunId: string;
  testCaseId: string;
  testerId: string | null;
  status: TestResultStatus;
  executedAt: string | null;
  notes: string | null;
  testCaseCode: string | null;
  testCaseTitle: string;
  testCaseObjective: string | null;
  testCasePreconditions: string | null;
  testCaseSteps: string;
  testCaseExpectedResult: string;
  testCasePriority: TestCasePriority;
  // Snapshot of test_plan_cases.order at the moment the run started — so a run's item
  // order always matches the plan's order at that time, even if the plan is reordered later.
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface TestResultWithDetails extends TestResult {
  // The live test case template, for comparing against the snapshot and driving the
  // "sync" action — includes module/tags so the run's result list can filter by them.
  // Null if the source test case has since been deleted.
  testCase: TestCaseWithDetails | null;
  tester: Profile | null;
  // Populated only when the source test case is `detailed` — one row per TestCaseStep.
  stepResults: TestResultStepWithDetails[];
}

// Per-step result — only exists for TestResults whose TestCase.stepType === 'detailed'.
// A simpler pass/fail than the overall TestResult.status, one row per TestCaseStep.
export type TestResultStepStatus = 'pass' | 'fail' | 'not_run';

export interface TestResultStep {
  id: string;
  testResultId: string;
  testCaseStepId: string;
  status: TestResultStepStatus;
  actualResult: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TestResultStepWithDetails extends TestResultStep {
  step: TestCaseStep;
}

export type IssuePriority = 'low' | 'medium' | 'high' | 'critical';
export type IssueStatus = 'open' | 'in_progress' | 'resolved' | 'verified' | 'closed';
// bug/feature/improvement/task — lets this module double as lightweight feature tracking,
// not just bugs surfaced from failed test results.
export type IssueType = 'bug' | 'feature' | 'improvement' | 'task';

export interface GithubLink {
  url: string;
  label?: string;
}

// Issue is project-level (not a child of exactly one TestResult) — it can stand alone
// (a feature request, a general finding) or be linked to any number of TestResults via
// the issue_test_results junction. See IssueWithDetails.linkedTestResults.
export interface Issue {
  id: string;
  code: string;
  projectId: string;
  moduleId: string | null;
  type: IssueType;
  title: string;
  description: string | null;
  actualResult: string | null;
  expectedResult: string | null;
  priority: IssuePriority;
  status: IssueStatus;
  assignedTo: string | null;
  githubLinks: GithubLink[];
  createdAt: string;
  updatedAt: string;
}

export interface IssueWithDetails extends Issue {
  assignee: Profile | null;
  module: Module | null;
  tags: Tag[];
  linkedTestResults: {
    id: string;
    testRunId: string;
    testCaseCode: string | null;
    testCaseTitle: string;
    testRun: { id: string; code: string; name: string } | null;
  }[];
}

export interface Attachment {
  id: string;
  issueId: string;
  storageProvider: string;
  url: string;
  fileName: string;
  fileSize: number | null;
  contentType: string | null;
  createdAt: string;
}
