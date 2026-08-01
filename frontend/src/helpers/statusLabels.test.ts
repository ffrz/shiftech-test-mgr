import { describe, expect, it } from 'vitest';
import {
  PROJECT_STATUS_LABEL,
  PROJECT_STATUS_SEVERITY,
  PROJECT_VISIBILITY_LABEL,
  PROJECT_VISIBILITY_SEVERITY,
  TEST_SUITE_VISIBILITY_LABEL,
  TEST_SUITE_VISIBILITY_SEVERITY,
  TEST_PLAN_STATUS_LABEL,
  TEST_PLAN_STATUS_SEVERITY,
  TEST_CASE_STATUS_LABEL,
  TEST_CASE_STATUS_SEVERITY,
  TEST_CASE_PRIORITY_LABEL,
  TEST_CASE_PRIORITY_SEVERITY,
  TEST_RUN_STATUS_LABEL,
  TEST_RUN_STATUS_SEVERITY,
  TEST_RESULT_STATUS_LABEL,
  TEST_RESULT_STATUS_SEVERITY,
  ISSUE_PRIORITY_LABEL,
  ISSUE_PRIORITY_SEVERITY,
  ISSUE_STATUS_LABEL,
  ISSUE_STATUS_SEVERITY,
  ISSUE_TYPE_LABEL,
  ISSUE_TYPE_SEVERITY,
  USER_ROLE_LABEL,
  USER_ROLE_SEVERITY,
  PROJECT_MEMBER_ROLE_LABEL,
  PROJECT_MEMBER_ROLE_SEVERITY,
  PROJECT_MEMBER_STATUS_LABEL,
  PROJECT_MEMBER_STATUS_SEVERITY,
} from './statusLabels';

function everyEnumHasLabelAndSeverity(
  entLabel: Record<string, string>,
  entSeverity: Record<string, string>,
  expectedKeys: string[],
) {
  for (const key of expectedKeys) {
    expect(entLabel[key], `missing label for "${key}"`).toBeDefined();
    expect(entLabel[key], `label for "${key}" should not be empty`).not.toBe('');
    expect(entSeverity[key], `missing severity for "${key}"`).toBeDefined();
    expect(entSeverity[key], `severity for "${key}" should not be empty`).not.toBe('');
  }
}

describe('PROJECT_STATUS_LABEL / SEVERITY', () => {
  it('covers all ProjectStatus values', () => {
    everyEnumHasLabelAndSeverity(PROJECT_STATUS_LABEL, PROJECT_STATUS_SEVERITY, ['active', 'inactive', 'archived']);
  });
});

describe('PROJECT_VISIBILITY_LABEL / SEVERITY', () => {
  it('covers all ProjectVisibility values', () => {
    everyEnumHasLabelAndSeverity(PROJECT_VISIBILITY_LABEL, PROJECT_VISIBILITY_SEVERITY, ['private', 'unlisted', 'public']);
  });
});

describe('TEST_SUITE_VISIBILITY_LABEL / SEVERITY', () => {
  it('covers all TestSuiteVisibility values', () => {
    everyEnumHasLabelAndSeverity(TEST_SUITE_VISIBILITY_LABEL, TEST_SUITE_VISIBILITY_SEVERITY, ['private', 'unlisted', 'public']);
  });
});

describe('TEST_PLAN_STATUS_LABEL / SEVERITY', () => {
  it('covers all TestPlanStatus values', () => {
    everyEnumHasLabelAndSeverity(TEST_PLAN_STATUS_LABEL, TEST_PLAN_STATUS_SEVERITY, ['draft', 'active', 'completed', 'archived']);
  });
});

describe('TEST_CASE_STATUS_LABEL / SEVERITY', () => {
  it('covers all TestCaseStatus values', () => {
    everyEnumHasLabelAndSeverity(TEST_CASE_STATUS_LABEL, TEST_CASE_STATUS_SEVERITY, ['active', 'archived']);
  });
});

describe('TEST_CASE_PRIORITY_LABEL / SEVERITY', () => {
  it('covers all TestCasePriority values', () => {
    everyEnumHasLabelAndSeverity(TEST_CASE_PRIORITY_LABEL, TEST_CASE_PRIORITY_SEVERITY, ['low', 'medium', 'high', 'critical']);
  });
});

describe('TEST_RUN_STATUS_LABEL / SEVERITY', () => {
  it('covers all TestRunStatus values', () => {
    everyEnumHasLabelAndSeverity(TEST_RUN_STATUS_LABEL, TEST_RUN_STATUS_SEVERITY, ['in_progress', 'completed']);
  });
});

describe('TEST_RESULT_STATUS_LABEL / SEVERITY', () => {
  it('covers all TestResultStatus values', () => {
    everyEnumHasLabelAndSeverity(TEST_RESULT_STATUS_LABEL, TEST_RESULT_STATUS_SEVERITY, ['pass', 'fail', 'skip', 'blocked', 'not_run']);
  });
});

describe('ISSUE_PRIORITY_LABEL / SEVERITY', () => {
  it('covers all IssuePriority values', () => {
    everyEnumHasLabelAndSeverity(ISSUE_PRIORITY_LABEL, ISSUE_PRIORITY_SEVERITY, ['low', 'medium', 'high', 'critical']);
  });
});

describe('ISSUE_STATUS_LABEL / SEVERITY', () => {
  it('covers all IssueStatus values', () => {
    everyEnumHasLabelAndSeverity(ISSUE_STATUS_LABEL, ISSUE_STATUS_SEVERITY, ['backlog', 'open', 'in_progress', 'resolved', 'verified', 'closed', 'rejected', 'duplicate']);
  });
});

describe('ISSUE_TYPE_LABEL / SEVERITY', () => {
  it('covers all IssueType values', () => {
    everyEnumHasLabelAndSeverity(ISSUE_TYPE_LABEL, ISSUE_TYPE_SEVERITY, ['bug', 'feature', 'improvement', 'task']);
  });
});

describe('USER_ROLE_LABEL / SEVERITY', () => {
  it('covers all UserRole values', () => {
    everyEnumHasLabelAndSeverity(USER_ROLE_LABEL, USER_ROLE_SEVERITY, ['user', 'admin']);
  });
});

describe('PROJECT_MEMBER_ROLE_LABEL / SEVERITY', () => {
  it('covers all ProjectMemberRole values', () => {
    everyEnumHasLabelAndSeverity(PROJECT_MEMBER_ROLE_LABEL, PROJECT_MEMBER_ROLE_SEVERITY, ['manager', 'supervisor', 'tester', 'member']);
  });
});

describe('PROJECT_MEMBER_STATUS_LABEL / SEVERITY', () => {
  it('covers all ProjectMemberStatus values', () => {
    everyEnumHasLabelAndSeverity(PROJECT_MEMBER_STATUS_LABEL, PROJECT_MEMBER_STATUS_SEVERITY, ['invited', 'accepted', 'declined']);
  });
});
