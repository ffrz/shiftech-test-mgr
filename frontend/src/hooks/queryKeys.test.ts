import { describe, expect, it } from 'vitest';
import { queryKeys } from './queryKeys';

describe('queryKeys', () => {
  describe('project', () => {
    it('returns key tuple with id', () => {
      expect(queryKeys.project('proj-1')).toEqual(['project', 'proj-1']);
    });

    it('returns the same key for the same id', () => {
      expect(queryKeys.project('p1')).toEqual(queryKeys.project('p1'));
    });

    it('returns different keys for different ids', () => {
      expect(queryKeys.project('p1')).not.toEqual(queryKeys.project('p2'));
    });
  });

  describe('projectSummaryCounts', () => {
    it('returns key with summaryCounts suffix', () => {
      expect(queryKeys.projectSummaryCounts('proj-1')).toEqual(['project', 'proj-1', 'summaryCounts']);
    });
  });

  describe('projects', () => {
    it('returns base key when no query', () => {
      expect(queryKeys.projects()).toEqual(['projects']);
    });

    it('returns key with all query params', () => {
      expect(queryKeys.projects({ search: 'test', status: 'active', sortField: 'name', sortDirection: 'asc' }))
        .toEqual(['projects', 'test', 'active', 'name', 'asc']);
    });

    it('returns key with null status', () => {
      expect(queryKeys.projects({ search: '', status: null, sortField: 'createdAt', sortDirection: 'desc' }))
        .toEqual(['projects', '', null, 'createdAt', 'desc']);
    });
  });

  describe('modules', () => {
    it('returns module key for project', () => {
      expect(queryKeys.modules('proj-1')).toEqual(['modules', 'proj-1']);
    });
  });

  describe('tags', () => {
    it('returns tag key for project', () => {
      expect(queryKeys.tags('proj-1')).toEqual(['tags', 'proj-1']);
    });
  });

  describe('testRoles', () => {
    it('returns test role key for project', () => {
      expect(queryKeys.testRoles('proj-1')).toEqual(['testRoles', 'proj-1']);
    });
  });

  describe('testPlan', () => {
    it('returns key with id', () => {
      expect(queryKeys.testPlan('tp-1')).toEqual(['testPlan', 'tp-1']);
    });
  });

  describe('testPlans', () => {
    it('returns key scoped to project', () => {
      expect(queryKeys.testPlans('proj-1')).toEqual(['testPlans', 'proj-1']);
    });
  });

  describe('testPlanCases', () => {
    it('returns key scoped to test plan', () => {
      expect(queryKeys.testPlanCases('tp-1')).toEqual(['testPlanCases', 'tp-1']);
    });
  });

  describe('testCase', () => {
    it('returns key with id', () => {
      expect(queryKeys.testCase('tc-1')).toEqual(['testCase', 'tc-1']);
    });
  });

  describe('testCaseSteps', () => {
    it('returns key scoped to test case', () => {
      expect(queryKeys.testCaseSteps('tc-1')).toEqual(['testCaseSteps', 'tc-1']);
    });
  });

  describe('testCases', () => {
    it('returns key scoped to project', () => {
      expect(queryKeys.testCases('proj-1')).toEqual(['testCases', 'proj-1']);
    });
  });

  describe('testCasesWithDetails', () => {
    it('returns key with "withDetails" marker', () => {
      expect(queryKeys.testCasesWithDetails('proj-1')).toEqual(['testCases', 'withDetails', 'proj-1']);
    });
  });

  describe('testSuites', () => {
    it('returns global test suites key', () => {
      expect(queryKeys.testSuites()).toEqual(['testSuites']);
    });
  });

  describe('testSuite', () => {
    it('returns key with id', () => {
      expect(queryKeys.testSuite('ts-1')).toEqual(['testSuite', 'ts-1']);
    });
  });

  describe('testSuiteItems', () => {
    it('returns key scoped to suite', () => {
      expect(queryKeys.testSuiteItems('ts-1')).toEqual(['testSuiteItems', 'ts-1']);
    });
  });

  describe('testSuiteItem', () => {
    it('returns key with id', () => {
      expect(queryKeys.testSuiteItem('tsi-1')).toEqual(['testSuiteItem', 'tsi-1']);
    });
  });

  describe('testRun', () => {
    it('returns key with id', () => {
      expect(queryKeys.testRun('tr-1')).toEqual(['testRun', 'tr-1']);
    });
  });

  describe('testRunResults', () => {
    it('returns key scoped to run', () => {
      expect(queryKeys.testRunResults('tr-1')).toEqual(['testRunResults', 'tr-1']);
    });
  });

  describe('testRunsByPlan', () => {
    it('returns key with byPlan marker', () => {
      expect(queryKeys.testRunsByPlan('tp-1')).toEqual(['testRuns', 'byPlan', 'tp-1']);
    });
  });

  describe('testRunsByProject', () => {
    it('returns key with byProject marker', () => {
      expect(queryKeys.testRunsByProject('proj-1')).toEqual(['testRuns', 'byProject', 'proj-1']);
    });
  });

  describe('issue', () => {
    it('returns key with id', () => {
      expect(queryKeys.issue('iss-1')).toEqual(['issue', 'iss-1']);
    });
  });

  describe('issuesByProject', () => {
    it('returns key scoped to project', () => {
      expect(queryKeys.issuesByProject('proj-1')).toEqual(['issues', 'byProject', 'proj-1']);
    });
  });

  describe('issuesByTestRun', () => {
    it('returns key scoped to test run', () => {
      expect(queryKeys.issuesByTestRun('tr-1')).toEqual(['issues', 'byTestRun', 'tr-1']);
    });
  });

  describe('issuesByTestResult', () => {
    it('returns key scoped to test result', () => {
      expect(queryKeys.issuesByTestResult('tr-1')).toEqual(['issues', 'byTestResult', 'tr-1']);
    });
  });

  describe('attachmentsByIssue', () => {
    it('returns key scoped to issue', () => {
      expect(queryKeys.attachmentsByIssue('iss-1')).toEqual(['attachments', 'byIssue', 'iss-1']);
    });
  });

  describe('users', () => {
    it('returns global users key', () => {
      expect(queryKeys.users()).toEqual(['users']);
    });
  });

  describe('profiles', () => {
    it('returns global profiles key', () => {
      expect(queryKeys.profiles()).toEqual(['profiles']);
    });
  });

  describe('profile', () => {
    it('returns key with id', () => {
      expect(queryKeys.profile('u-1')).toEqual(['profile', 'u-1']);
    });
  });

  describe('projectMembers', () => {
    it('returns key scoped to project', () => {
      expect(queryKeys.projectMembers('proj-1')).toEqual(['projectMembers', 'proj-1']);
    });
  });

  describe('ownPendingInvitations', () => {
    it('returns key with user id', () => {
      expect(queryKeys.ownPendingInvitations('u-1')).toEqual(['projectMembers', 'ownPendingInvitations', 'u-1']);
    });
  });

  describe('dashboard keys', () => {
    it('dashboardCounts', () => {
      expect(queryKeys.dashboardCounts('u-1')).toEqual(['dashboard', 'counts', 'u-1']);
    });

    it('dashboardRecentProjects', () => {
      expect(queryKeys.dashboardRecentProjects()).toEqual(['dashboard', 'recentProjects']);
    });

    it('dashboardContinueWorking', () => {
      expect(queryKeys.dashboardContinueWorking()).toEqual(['dashboard', 'continueWorking']);
    });

    it('dashboardMyWork', () => {
      expect(queryKeys.dashboardMyWork('u-1')).toEqual(['dashboard', 'myWork', 'u-1']);
    });

    it('dashboardActivity', () => {
      expect(queryKeys.dashboardActivity()).toEqual(['dashboard', 'activity']);
    });
  });

  describe('notifications', () => {
    it('notifications list', () => {
      expect(queryKeys.notifications()).toEqual(['notifications']);
    });

    it('notificationsUnreadCount', () => {
      expect(queryKeys.notificationsUnreadCount()).toEqual(['notifications', 'unreadCount']);
    });
  });

  describe('activity', () => {
    it('returns key with entity type and id', () => {
      expect(queryKeys.activity('issue', 'iss-1')).toEqual(['activity', 'issue', 'iss-1']);
    });

    it('returns key for test_case entity', () => {
      expect(queryKeys.activity('test_case', 'tc-1')).toEqual(['activity', 'test_case', 'tc-1']);
    });
  });

  describe('entityAttachments', () => {
    it('returns key with entity type and id', () => {
      expect(queryKeys.entityAttachments('issue', 'iss-1')).toEqual(['attachments', 'issue', 'iss-1']);
    });
  });

  describe('key uniqueness', () => {
    it('avoids collisions between different entity types', () => {
      const allKeys = new Set<string>();
      const keys = [
        queryKeys.project('1'), queryKeys.testPlan('1'), queryKeys.testCase('1'),
        queryKeys.testRun('1'), queryKeys.issue('1'), queryKeys.testSuite('1'),
        queryKeys.profile('1'), queryKeys.activity('issue', '1'),
      ];
      for (const key of keys) {
        const serialized = JSON.stringify(key);
        expect(allKeys.has(serialized), `duplicate key: ${serialized}`).toBe(false);
        allKeys.add(serialized);
      }
    });
  });
});
