import type {
  TestPlan,
  TestCase,
  TestCaseStep,
  TestPlanCase,
  Project,
  Profile,
  Module,
  Tag,
  TestRun,
  TestResult,
  TestResultStep,
  Issue,
  GithubLink,
  Attachment,
  ProjectMember,
  ProjectMemberWithProfile,
} from '../types/domain';

// Supabase columns are snake_case; domain types are camelCase.
// Repositories map raw rows through these functions before returning to services.

export function mapProjectRow(row: any): Project {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapProjectMemberRow(row: any): ProjectMember {
  return {
    id: row.id,
    projectId: row.project_id,
    userId: row.user_id,
    role: row.role,
    createdAt: row.created_at,
  };
}

export function mapProjectMemberWithProfileRow(row: any): ProjectMemberWithProfile {
  return {
    ...mapProjectMemberRow(row),
    profile: mapProfileRow(row.profile),
  };
}

export function mapModuleRow(row: any): Module {
  return {
    id: row.id,
    projectId: row.project_id,
    code: row.code,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapTagRow(row: any): Tag {
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    createdAt: row.created_at,
  };
}

export function mapTestPlanRow(row: any): TestPlan {
  return {
    id: row.id,
    projectId: row.project_id,
    code: row.code,
    name: row.name,
    description: row.description,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapTestCaseRow(row: any): TestCase {
  return {
    id: row.id,
    projectId: row.project_id,
    moduleId: row.module_id,
    code: row.code,
    title: row.title,
    objective: row.objective,
    preconditions: row.preconditions,
    steps: row.steps,
    expectedResult: row.expected_result,
    priority: row.priority,
    status: row.status,
    notes: row.notes,
    stepType: row.step_type,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapTestCaseStepRow(row: any): TestCaseStep {
  return {
    id: row.id,
    testCaseId: row.test_case_id,
    stepNumber: row.step_number,
    action: row.action,
    expectedResult: row.expected_result,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapTestPlanCaseRow(row: any): TestPlanCase {
  return {
    id: row.id,
    testPlanId: row.test_plan_id,
    testCaseId: row.test_case_id,
    order: row.order,
  };
}

export function mapTestRunRow(row: any): TestRun {
  return {
    id: row.id,
    projectId: row.project_id,
    testPlanId: row.test_plan_id,
    code: row.code,
    name: row.name,
    status: row.status,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapTestResultRow(row: any): TestResult {
  return {
    id: row.id,
    testRunId: row.test_run_id,
    testCaseId: row.test_case_id,
    testerId: row.tester_id,
    status: row.status,
    executedAt: row.executed_at,
    notes: row.notes,
    testCaseCode: row.test_case_code,
    testCaseTitle: row.test_case_title,
    testCaseObjective: row.test_case_objective,
    testCasePreconditions: row.test_case_preconditions,
    testCaseSteps: row.test_case_steps,
    testCaseExpectedResult: row.test_case_expected_result,
    testCasePriority: row.test_case_priority,
    order: row.order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapTestResultStepRow(row: any): TestResultStep {
  return {
    id: row.id,
    testResultId: row.test_result_id,
    testCaseStepId: row.test_case_step_id,
    status: row.status,
    actualResult: row.actual_result,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapGithubLinks(value: unknown): GithubLink[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is { url: string; label?: string } => typeof v === 'object' && v !== null && typeof (v as any).url === 'string')
    .map((v) => ({ url: v.url, label: v.label }));
}

export function mapIssueRow(row: any): Issue {
  return {
    id: row.id,
    code: row.code,
    projectId: row.project_id,
    moduleId: row.module_id,
    type: row.type,
    title: row.title,
    description: row.description,
    actualResult: row.actual_result,
    expectedResult: row.expected_result,
    priority: row.priority,
    status: row.status,
    assignedTo: row.assigned_to,
    githubLinks: mapGithubLinks(row.github_links),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapAttachmentRow(row: any): Attachment {
  return {
    id: row.id,
    issueId: row.issue_id,
    storageProvider: row.storage_provider,
    url: row.url,
    fileName: row.file_name,
    fileSize: row.file_size,
    contentType: row.content_type,
    createdAt: row.created_at,
  };
}

export function mapProfileRow(row: any): Profile {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    avatarUrl: row.avatar_url,
    role: row.role,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}
