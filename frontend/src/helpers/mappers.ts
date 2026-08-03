import type {
  TestPlan,
  TestCase,
  TestCaseStep,
  TestSuite,
  TestSuiteItem,
  TestSuiteItemStep,
  TestPlanCase,
  Project,
  User,
  Profile,
  Module,
  Tag,
  TestRole,
  TestRun,
  TestResult,
  TestResultStep,
  Issue,
  ExternalLink,
  Attachment,
  ActivityEntry,
  Notification,
  ProjectMember,
  ProjectMemberWithProfile,
  ProjectMemberInvitation,
  ApiToken,
  AutomationRunner,
} from '../types/domain';

// Supabase columns are snake_case; domain types are camelCase.
// Repositories map raw rows through these functions before returning to services.

export function mapProjectRow(row: any): Project {
  return {
    id: row.id,
    ownerId: row.owner_id,
    ownerType: row.owner_type,
    name: row.name,
    description: row.description,
    status: row.status,
    visibility: row.visibility,
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
    status: row.status,
    invitedBy: row.invited_by,
    invitedAt: row.invited_at,
    respondedAt: row.responded_at,
    createdAt: row.created_at,
  };
}

export function mapProjectMemberWithProfileRow(row: any): ProjectMemberWithProfile {
  return {
    ...mapProjectMemberRow(row),
    profile: row.member_user?.profile ? mapProfileRow(row.member_user.profile) : null,
    email: row.member_user?.email ?? '',
  };
}

// Row shape comes from the list_own_pending_invitations() RPC (flat, pre-resolved), not a
// nested table select — see 20260728000006_invitation_rpc_security_definer.sql.
export function mapProjectMemberInvitationRow(row: any, userId: string): ProjectMemberInvitation {
  return {
    id: row.id,
    projectId: row.project_id,
    userId,
    role: row.role,
    status: row.status,
    invitedBy: row.invited_by,
    invitedAt: row.invited_at,
    respondedAt: row.responded_at,
    createdAt: row.created_at,
    project: row.project_name ? { id: row.project_id, name: row.project_name } : null,
    inviterUsername: row.inviter_username ?? null,
    inviterDisplayName: row.inviter_display_name ?? null,
  };
}

export function mapApiTokenRow(row: any): ApiToken {
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    tokenPrefix: row.token_prefix,
    scopes: row.scopes ?? [],
    createdBy: row.created_by,
    createdAt: row.created_at,
    revokedAt: row.revoked_at,
    lastUsedAt: row.last_used_at ?? null,
  };
}

export function mapAutomationRunnerRow(row: any): AutomationRunner {
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    labels: row.labels ?? [],
    tokenPrefix: row.token_prefix,
    active: row.active,
    lastSeenAt: row.last_seen_at,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
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

export function mapTestRoleRow(row: any): TestRole {
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
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
    createdBy: row.created_by,
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
    targetRoleId: row.target_role_id,
    externalLinks: mapExternalLinks(row.external_links),
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapTestSuiteRow(row: any): TestSuite {
  return {
    id: row.id,
    ownerId: row.owner_id,
    visibility: row.visibility,
    name: row.name,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapTestSuiteItemRow(row: any): TestSuiteItem {
  return {
    id: row.id,
    suiteId: row.suite_id,
    moduleName: row.module_name,
    title: row.title,
    objective: row.objective,
    preconditions: row.preconditions,
    steps: row.steps,
    expectedResult: row.expected_result,
    priority: row.priority,
    stepType: row.step_type,
    targetRole: row.target_role,
    tagNames: row.tag_names ?? [],
    notes: row.notes ?? null,
    orderIndex: row.order_index,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapTestSuiteItemStepRow(row: any): TestSuiteItemStep {
  return {
    id: row.id,
    suiteItemId: row.suite_item_id,
    stepNumber: row.step_number,
    action: row.action,
    expectedResult: row.expected_result,
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
    startedBy: row.started_by,
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
    testCaseNotes: row.test_case_notes,
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

function mapExternalLinks(value: unknown): ExternalLink[] {
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
    targetRoleId: row.target_role_id,
    externalLinks: mapExternalLinks(row.external_links),
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapAttachmentRow(row: any): Attachment {
  return {
    id: row.id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    projectId: row.project_id,
    storageProvider: row.storage_provider,
    url: row.url,
    fileName: row.file_name,
    fileSize: row.file_size,
    contentType: row.content_type,
    createdAt: row.created_at,
  };
}

export function mapActivityEntryRow(row: any): ActivityEntry {
  return {
    id: row.id,
    projectId: row.project_id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    actorId: row.actor_id,
    eventType: row.event_type,
    payload: row.payload ?? {},
    parentCommentId: row.parent_comment_id,
    deletedAt: row.deleted_at,
    updatedAt: row.updated_at,
    createdAt: row.created_at,
  };
}

export function mapUserRow(row: any): User {
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

export function mapProfileRow(row: any): Profile {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    bio: row.bio,
    usernameChanged: row.username_changed ?? false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapNotificationRow(row: any): Notification {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    title: row.title,
    body: row.body,
    referenceType: row.reference_type,
    referenceId: row.reference_id,
    isRead: row.is_read,
    createdAt: row.created_at,
  };
}
