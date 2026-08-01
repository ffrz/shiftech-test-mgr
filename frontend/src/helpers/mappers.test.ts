import { describe, expect, it } from 'vitest';
import {
  mapProjectRow,
  mapProjectMemberRow,
  mapProjectMemberWithProfileRow,
  mapProjectMemberInvitationRow,
  mapModuleRow,
  mapTagRow,
  mapTestRoleRow,
  mapTestPlanRow,
  mapTestCaseRow,
  mapTestSuiteRow,
  mapTestSuiteItemRow,
  mapTestSuiteItemStepRow,
  mapTestCaseStepRow,
  mapTestPlanCaseRow,
  mapTestRunRow,
  mapTestResultRow,
  mapTestResultStepRow,
  mapIssueRow,
  mapAttachmentRow,
  mapActivityEntryRow,
  mapUserRow,
  mapProfileRow,
  mapNotificationRow,
} from './mappers';

// ── mapProjectRow ────────────────────────────────────────────────────────────
describe('mapProjectRow', () => {
  it('maps snake_case columns to camelCase', () => {
    const row = {
      id: 'p1',
      owner_id: 'u1',
      owner_type: 'user',
      name: 'My Project',
      description: 'desc',
      status: 'active',
      visibility: 'public',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-02T00:00:00Z',
    };
    expect(mapProjectRow(row)).toEqual({
      id: 'p1',
      ownerId: 'u1',
      ownerType: 'user',
      name: 'My Project',
      description: 'desc',
      status: 'active',
      visibility: 'public',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-02T00:00:00Z',
    });
  });

  it('handles null description', () => {
    expect(mapProjectRow({ id: 'p1', owner_id: 'u1', owner_type: 'user', name: 'P', description: null, status: 'active', visibility: 'private', created_at: 'dt', updated_at: 'dt' }).description).toBeNull();
  });
});

// ── mapProjectMemberRow ──────────────────────────────────────────────────────
describe('mapProjectMemberRow', () => {
  it('maps all columns including invite fields', () => {
    const row = {
      id: 'm1',
      project_id: 'p1',
      user_id: 'u1',
      role: 'manager',
      status: 'accepted',
      invited_by: 'u2',
      invited_at: '2026-01-01T00:00:00Z',
      responded_at: '2026-01-02T00:00:00Z',
      created_at: '2026-01-01T00:00:00Z',
    };
    expect(mapProjectMemberRow(row)).toEqual({
      id: 'm1',
      projectId: 'p1',
      userId: 'u1',
      role: 'manager',
      status: 'accepted',
      invitedBy: 'u2',
      invitedAt: '2026-01-01T00:00:00Z',
      respondedAt: '2026-01-02T00:00:00Z',
      createdAt: '2026-01-01T00:00:00Z',
    });
  });

  it('handles null invited_by and responded_at', () => {
    const row = { id: 'm1', project_id: 'p1', user_id: 'u1', role: 'member', status: 'invited', invited_by: null, invited_at: '2026-01-01T00:00:00Z', responded_at: null, created_at: '2026-01-01T00:00:00Z' };
    const result = mapProjectMemberRow(row);
    expect(result.invitedBy).toBeNull();
    expect(result.respondedAt).toBeNull();
  });
});

// ── mapProjectMemberWithProfileRow ───────────────────────────────────────────
describe('mapProjectMemberWithProfileRow', () => {
  it('includes profile when embedded row is present', () => {
    const row = {
      id: 'm1', project_id: 'p1', user_id: 'u1', role: 'tester', status: 'accepted',
      invited_by: null, invited_at: '2026-01-01T00:00:00Z', responded_at: null, created_at: '2026-01-01T00:00:00Z',
      member_user: {
        email: 'test@example.com',
        profile: { id: 'u1', username: 'tester1', display_name: 'Tester', avatar_url: null, bio: null, username_changed: false, created_at: 'dt', updated_at: 'dt' },
      },
    };
    const result = mapProjectMemberWithProfileRow(row);
    expect(result.profile?.username).toBe('tester1');
    expect(result.profile?.displayName).toBe('Tester');
    expect(result.email).toBe('test@example.com');
  });

  it('handles null member_user gracefully', () => {
    const row = { id: 'm1', project_id: 'p1', user_id: 'u1', role: 'member', status: 'invited', invited_by: null, invited_at: 'dt', responded_at: null, created_at: 'dt' };
    const result = mapProjectMemberWithProfileRow(row);
    expect(result.profile).toBeNull();
    expect(result.email).toBe('');
  });
});

// ── mapProjectMemberInvitationRow ────────────────────────────────────────────
describe('mapProjectMemberInvitationRow', () => {
  it('resolves project name + inviter display from flat RPC row', () => {
    const row = {
      id: 'i1', project_id: 'p1', role: 'tester', status: 'invited',
      invited_by: 'u2', invited_at: '2026-01-01T00:00:00Z', responded_at: null, created_at: '2026-01-01T00:00:00Z',
      project_name: 'Cool Project',
      inviter_username: 'admin1',
      inviter_display_name: 'Admin User',
    };
    const result = mapProjectMemberInvitationRow(row, 'u1');
    expect(result.project).toEqual({ id: 'p1', name: 'Cool Project' });
    expect(result.inviterUsername).toBe('admin1');
    expect(result.inviterDisplayName).toBe('Admin User');
    expect(result.userId).toBe('u1');
  });

  it('handles missing project name', () => {
    const row = { id: 'i1', project_id: 'p1', role: 'tester', status: 'invited', invited_by: 'u2', invited_at: 'dt', responded_at: null, created_at: 'dt' };
    const result = mapProjectMemberInvitationRow(row, 'u1');
    expect(result.project).toBeNull();
    expect(result.inviterUsername).toBeNull();
  });
});

// ── mapModuleRow ─────────────────────────────────────────────────────────────
describe('mapModuleRow', () => {
  it('maps module columns', () => {
    const row = { id: 'm1', project_id: 'p1', code: 'MOD-1', name: 'Login', created_at: 'dt', updated_at: 'dt' };
    expect(mapModuleRow(row)).toEqual({ id: 'm1', projectId: 'p1', code: 'MOD-1', name: 'Login', createdAt: 'dt', updatedAt: 'dt' });
  });
});

// ── mapTagRow ────────────────────────────────────────────────────────────────
describe('mapTagRow', () => {
  it('maps tag columns', () => {
    const row = { id: 't1', project_id: 'p1', name: 'smoke', created_at: 'dt' };
    expect(mapTagRow(row)).toEqual({ id: 't1', projectId: 'p1', name: 'smoke', createdAt: 'dt' });
  });
});

// ── mapTestRoleRow ───────────────────────────────────────────────────────────
describe('mapTestRoleRow', () => {
  it('maps test role columns', () => {
    const row = { id: 'r1', project_id: 'p1', name: 'Admin', created_at: 'dt', updated_at: 'dt' };
    expect(mapTestRoleRow(row)).toEqual({ id: 'r1', projectId: 'p1', name: 'Admin', createdAt: 'dt', updatedAt: 'dt' });
  });
});

// ── mapTestPlanRow ───────────────────────────────────────────────────────────
describe('mapTestPlanRow', () => {
  it('maps test plan columns', () => {
    const row = { id: 'tp1', project_id: 'p1', code: 'TP-1', name: 'Sprint 1', description: 'desc', status: 'active', created_by: 'u1', created_at: 'dt', updated_at: 'dt' };
    expect(mapTestPlanRow(row)).toEqual({ id: 'tp1', projectId: 'p1', code: 'TP-1', name: 'Sprint 1', description: 'desc', status: 'active', createdBy: 'u1', createdAt: 'dt', updatedAt: 'dt' });
  });

  it('handles null description and created_by', () => {
    const row = { id: 'tp1', project_id: 'p1', code: 'TP-1', name: 'Plan', description: null, status: 'draft', created_by: null, created_at: 'dt', updated_at: 'dt' };
    const result = mapTestPlanRow(row);
    expect(result.description).toBeNull();
    expect(result.createdBy).toBeNull();
  });
});

// ── mapTestCaseRow ───────────────────────────────────────────────────────────
describe('mapTestCaseRow', () => {
  it('maps test case columns including external_links', () => {
    const row = {
      id: 'tc1', project_id: 'p1', module_id: 'm1', code: 'TC-1', title: 'Login works',
      objective: 'Verify auth', preconditions: 'User exists', steps: 'Do it',
      expected_result: 'Works', priority: 'high', status: 'active', notes: 'note',
      step_type: 'simple', target_role_id: 'r1',
      external_links: [{ url: 'https://example.com', label: 'docs' }],
      created_by: 'u1', created_at: 'dt', updated_at: 'dt',
    };
    const result = mapTestCaseRow(row);
    expect(result.externalLinks).toEqual([{ url: 'https://example.com', label: 'docs' }]);
    expect(result.targetRoleId).toBe('r1');
    expect(result.stepType).toBe('simple');
  });

  it('defaults external_links to empty array when not an array', () => {
    const row = { id: 'tc1', project_id: 'p1', module_id: null, code: 'TC-1', title: 'T', objective: null, preconditions: null, steps: '', expected_result: '', priority: 'medium', status: 'active', notes: null, step_type: 'simple', target_role_id: null, external_links: null, created_by: null, created_at: 'dt', updated_at: 'dt' };
    expect(mapTestCaseRow(row).externalLinks).toEqual([]);
  });

  it('defaults external_links to empty array for non-object entries', () => {
    const row = { id: 'tc1', project_id: 'p1', module_id: null, code: 'TC-1', title: 'T', objective: null, preconditions: null, steps: '', expected_result: '', priority: 'medium', status: 'active', notes: null, step_type: 'simple', target_role_id: null, external_links: ['not-an-object', { url: 'https://a.com' }], created_by: null, created_at: 'dt', updated_at: 'dt' };
    expect(mapTestCaseRow(row).externalLinks).toEqual([{ url: 'https://a.com', label: undefined }]);
  });
});

// ── mapTestSuiteRow ──────────────────────────────────────────────────────────
describe('mapTestSuiteRow', () => {
  it('maps suite columns', () => {
    const row = { id: 's1', owner_id: 'u1', visibility: 'public', name: 'Suite A', description: null, created_at: 'dt', updated_at: 'dt' };
    const result = mapTestSuiteRow(row);
    expect(result.ownerId).toBe('u1');
    expect(result.visibility).toBe('public');
  });
});

// ── mapTestSuiteItemRow ──────────────────────────────────────────────────────
describe('mapTestSuiteItemRow', () => {
  it('maps suite item with default empty tagNames', () => {
    const row = { id: 'si1', suite_id: 's1', module_name: null, title: 'Item', objective: null, preconditions: null, steps: '', expected_result: '', priority: 'medium', step_type: 'simple', target_role: null, notes: null, order_index: 0, created_at: 'dt', updated_at: 'dt' };
    expect(mapTestSuiteItemRow(row).tagNames).toEqual([]);
  });

  it('preserves provided tagNames', () => {
    const row = { id: 'si1', suite_id: 's1', module_name: 'Module', title: 'Item', objective: null, preconditions: null, steps: '', expected_result: '', priority: 'medium', step_type: 'simple', target_role: null, tag_names: ['smoke', 'regression'], notes: null, order_index: 0, created_at: 'dt', updated_at: 'dt' };
    expect(mapTestSuiteItemRow(row).tagNames).toEqual(['smoke', 'regression']);
  });
});

// ── mapTestSuiteItemStepRow ──────────────────────────────────────────────────
describe('mapTestSuiteItemStepRow', () => {
  it('maps step columns', () => {
    const row = { id: 'ss1', suite_item_id: 'si1', step_number: 1, action: 'Click button', expected_result: 'Dialog opens' };
    expect(mapTestSuiteItemStepRow(row)).toEqual({ id: 'ss1', suiteItemId: 'si1', stepNumber: 1, action: 'Click button', expectedResult: 'Dialog opens' });
  });
});

// ── mapTestCaseStepRow ───────────────────────────────────────────────────────
describe('mapTestCaseStepRow', () => {
  it('maps step columns', () => {
    const row = { id: 'ts1', test_case_id: 'tc1', step_number: 1, action: 'Click', expected_result: 'Opens', created_at: 'dt', updated_at: 'dt' };
    expect(mapTestCaseStepRow(row)).toEqual({ id: 'ts1', testCaseId: 'tc1', stepNumber: 1, action: 'Click', expectedResult: 'Opens', createdAt: 'dt', updatedAt: 'dt' });
  });
});

// ── mapTestPlanCaseRow ───────────────────────────────────────────────────────
describe('mapTestPlanCaseRow', () => {
  it('maps junction columns', () => {
    const row = { id: 'pc1', test_plan_id: 'tp1', test_case_id: 'tc1', order: 3 };
    expect(mapTestPlanCaseRow(row)).toEqual({ id: 'pc1', testPlanId: 'tp1', testCaseId: 'tc1', order: 3 });
  });
});

// ── mapTestRunRow ────────────────────────────────────────────────────────────
describe('mapTestRunRow', () => {
  it('maps test run columns', () => {
    const row = { id: 'tr1', project_id: 'p1', test_plan_id: 'tp1', code: 'TR-1', name: 'Run 1', status: 'in_progress', started_at: 'dt', completed_at: null, notes: null, started_by: 'u1', created_at: 'dt', updated_at: 'dt' };
    const result = mapTestRunRow(row);
    expect(result.testPlanId).toBe('tp1');
    expect(result.completedAt).toBeNull();
    expect(result.startedBy).toBe('u1');
  });
});

// ── mapTestResultRow ─────────────────────────────────────────────────────────
describe('mapTestResultRow', () => {
  it('maps test result with snapshot columns', () => {
    const row = {
      id: 'tr1', test_run_id: 'r1', test_case_id: 'tc1', tester_id: 'u1',
      status: 'pass', executed_at: 'dt', notes: 'ok',
      test_case_code: 'TC-1', test_case_title: 'Login', test_case_objective: 'Verify',
      test_case_preconditions: null, test_case_steps: 'Do it',
      test_case_expected_result: 'Works', test_case_priority: 'high', test_case_notes: null,
      order: 1, created_at: 'dt', updated_at: 'dt',
    };
    const result = mapTestResultRow(row);
    expect(result.testCaseCode).toBe('TC-1');
    expect(result.testCaseTitle).toBe('Login');
    expect(result.testCasePriority).toBe('high');
    expect(result.order).toBe(1);
  });
});

// ── mapTestResultStepRow ─────────────────────────────────────────────────────
describe('mapTestResultStepRow', () => {
  it('maps result step columns', () => {
    const row = { id: 'rs1', test_result_id: 'tr1', test_case_step_id: 'ts1', status: 'pass', actual_result: 'ok', created_at: 'dt', updated_at: 'dt' };
    expect(mapTestResultStepRow(row)).toEqual({ id: 'rs1', testResultId: 'tr1', testCaseStepId: 'ts1', status: 'pass', actualResult: 'ok', createdAt: 'dt', updatedAt: 'dt' });
  });
});

// ── mapIssueRow ──────────────────────────────────────────────────────────────
describe('mapIssueRow', () => {
  it('maps issue columns including external_links', () => {
    const row = {
      id: 'i1', code: 'ISS-1', project_id: 'p1', module_id: 'm1',
      type: 'bug', title: 'Crash on login', description: 'desc',
      actual_result: 'crash', expected_result: 'login',
      priority: 'critical', status: 'open', assigned_to: 'u1',
      target_role_id: null,
      external_links: [{ url: 'https://bug.com', label: 'ref' }],
      created_by: 'u1', created_at: 'dt', updated_at: 'dt',
    };
    const result = mapIssueRow(row);
    expect(result.code).toBe('ISS-1');
    expect(result.externalLinks).toEqual([{ url: 'https://bug.com', label: 'ref' }]);
    expect(result.priority).toBe('critical');
  });
});

// ── mapAttachmentRow ─────────────────────────────────────────────────────────
describe('mapAttachmentRow', () => {
  it('maps attachment columns', () => {
    const row = { id: 'a1', entity_type: 'issue', entity_id: 'i1', project_id: 'p1', storage_provider: 'supabase', url: 'https://...', file_name: 'screenshot.png', file_size: 1024, content_type: 'image/png', created_at: 'dt' };
    const result = mapAttachmentRow(row);
    expect(result.entityType).toBe('issue');
    expect(result.fileName).toBe('screenshot.png');
    expect(result.fileSize).toBe(1024);
  });
});

// ── mapActivityEntryRow ──────────────────────────────────────────────────────
describe('mapActivityEntryRow', () => {
  it('maps activity entry with default empty payload', () => {
    const row = { id: 'ae1', project_id: 'p1', entity_type: 'issue', entity_id: 'i1', actor_id: 'u1', event_type: 'comment', parent_comment_id: null, deleted_at: null, updated_at: null, created_at: 'dt' };
    const result = mapActivityEntryRow(row);
    expect(result.payload).toEqual({});
    expect(result.eventType).toBe('comment');
  });

  it('preserves provided payload', () => {
    const row = { id: 'ae1', project_id: 'p1', entity_type: 'issue', entity_id: 'i1', actor_id: 'u1', event_type: 'status_change', payload: { from: 'open', to: 'closed' }, parent_comment_id: null, deleted_at: null, updated_at: null, created_at: 'dt' };
    expect(mapActivityEntryRow(row).payload).toEqual({ from: 'open', to: 'closed' });
  });
});

// ── mapUserRow ───────────────────────────────────────────────────────────────
describe('mapUserRow', () => {
  it('maps user columns', () => {
    const row = { id: 'u1', email: 'test@example.com', role: 'admin', created_at: 'dt', updated_at: 'dt', deleted_at: null };
    const result = mapUserRow(row);
    expect(result.email).toBe('test@example.com');
    expect(result.role).toBe('admin');
    expect(result.deletedAt).toBeNull();
  });
});

// ── mapProfileRow ────────────────────────────────────────────────────────────
describe('mapProfileRow', () => {
  it('maps profile columns with default username_changed', () => {
    const row = { id: 'u1', username: 'tester', display_name: 'Tester Name', avatar_url: null, bio: 'Hello', username_changed: true, created_at: 'dt', updated_at: 'dt' };
    const result = mapProfileRow(row);
    expect(result.username).toBe('tester');
    expect(result.displayName).toBe('Tester Name');
    expect(result.usernameChanged).toBe(true);
  });

  it('defaults username_changed to false when missing', () => {
    const row = { id: 'u1', username: 't', display_name: null, avatar_url: null, bio: null, created_at: 'dt', updated_at: 'dt' };
    expect(mapProfileRow(row).usernameChanged).toBe(false);
  });
});

// ── mapNotificationRow ───────────────────────────────────────────────────────
describe('mapNotificationRow', () => {
  it('maps notification columns', () => {
    const row = { id: 'n1', user_id: 'u1', type: 'project_invite', title: 'Invited', body: 'You are invited', reference_type: 'project', reference_id: 'p1', is_read: false, created_at: 'dt' };
    const result = mapNotificationRow(row);
    expect(result.isRead).toBe(false);
    expect(result.referenceType).toBe('project');
  });
});
