import { describe, expect, it } from 'vitest';
import { createMockDashboardRepository } from './dashboardRepository';
import type { Project, TestPlan, TestCase, Issue, TestSuite, TestRun, ActivityEntry } from '../../../types/domain';

function makeProject(id: string, overrides: Partial<Project> = {}): Project {
  return {
    id,
    ownerId: 'user-1',
    ownerType: 'user',
    name: `Project ${id}`,
    description: null,
    status: 'active',
    visibility: 'private',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-06-01T00:00:00Z',
    ...overrides,
  };
}

function makeTestPlan(id: string, projectId: string): TestPlan {
  return {
    id,
    projectId,
    code: `TP-${id}`,
    name: `Plan ${id}`,
    description: null,
    status: 'active',
    createdBy: 'user-1',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  };
}

function makeTestCase(id: string, projectId: string): TestCase {
  return {
    id,
    projectId,
    moduleId: null,
    code: `TC-${id}`,
    title: `Case ${id}`,
    objective: null,
    preconditions: null,
    steps: '',
    expectedResult: '',
    priority: 'medium',
    status: 'active',
    notes: null,
    stepType: 'simple',
    targetRoleId: null,
    externalLinks: [],
    createdBy: 'user-1',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  };
}

function makeIssue(id: string, projectId: string, overrides: Partial<Issue> = {}): Issue {
  return {
    id,
    code: `ISS-${id}`,
    projectId,
    moduleId: null,
    type: 'bug',
    title: `Issue ${id}`,
    description: null,
    actualResult: null,
    expectedResult: null,
    priority: 'medium',
    status: 'open',
    assignedTo: null,
    targetRoleId: null,
    externalLinks: [],
    createdBy: 'user-1',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeTestSuite(id: string, ownerId: string): TestSuite {
  return {
    id,
    ownerId,
    visibility: 'private',
    name: `Suite ${id}`,
    description: null,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  };
}

function makeTestRun(id: string, projectId: string, overrides: Partial<TestRun> = {}): TestRun {
  return {
    id,
    projectId,
    testPlanId: null,
    code: `TR-${id}`,
    name: `Run ${id}`,
    status: 'in_progress',
    startedAt: '2025-01-01T00:00:00Z',
    completedAt: null,
    notes: null,
    startedBy: 'user-1',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeActivity(id: string, overrides: Partial<ActivityEntry> = {}): ActivityEntry {
  return {
    id,
    projectId: 'pj-1',
    entityType: 'issue',
    entityId: 'iss-1',
    actorId: 'user-1',
    eventType: 'comment',
    payload: {},
    parentCommentId: null,
    deletedAt: null,
    updatedAt: null,
    createdAt: '2025-06-01T00:00:00Z',
    ...overrides,
  };
}

describe('createMockDashboardRepository', () => {
  it('getCounts calculates correctly from seed', async () => {
    const repo = createMockDashboardRepository({
      projects: [makeProject('pj-1'), makeProject('pj-2')],
      testPlans: [makeTestPlan('tp-1', 'pj-1')],
      testCases: [makeTestCase('tc-1', 'pj-1'), makeTestCase('tc-2', 'pj-1'), makeTestCase('tc-3', 'pj-1')],
      issues: [
        makeIssue('iss-1', 'pj-1', { status: 'open' }),
        makeIssue('iss-2', 'pj-1', { status: 'closed' }),
        makeIssue('iss-3', 'pj-1', { status: 'rejected' }),
      ],
      testSuites: [
        makeTestSuite('ts-1', 'user-a'),
        makeTestSuite('ts-2', 'user-a'),
        makeTestSuite('ts-3', 'user-b'),
      ],
      testRuns: [
        makeTestRun('tr-1', 'pj-1', { status: 'in_progress' }),
        makeTestRun('tr-2', 'pj-1', { status: 'completed' }),
        makeTestRun('tr-3', 'pj-1', { status: 'in_progress' }),
      ],
    });

    const counts = await repo.getCounts('user-a');

    expect(counts.projectCount).toBe(2);
    expect(counts.testPlanCount).toBe(1);
    expect(counts.testCaseCount).toBe(3);
    expect(counts.issueCount).toBe(3);
    expect(counts.openIssueCount).toBe(1);
    expect(counts.testSuiteOwnedCount).toBe(2);
    expect(counts.runningTestRunCount).toBe(2);
  });

  it('findRecentProjects returns sorted by updatedAt desc limited', async () => {
    const p1 = makeProject('pj-1', { updatedAt: '2025-03-01T00:00:00Z' });
    const p2 = makeProject('pj-2', { updatedAt: '2025-06-01T00:00:00Z' });
    const p3 = makeProject('pj-3', { updatedAt: '2025-01-01T00:00:00Z' });

    const repo = createMockDashboardRepository({ projects: [p1, p2, p3] });
    const result = await repo.findRecentProjects(2);

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('pj-2');
    expect(result[1].id).toBe('pj-1');
  });

  it('findContinueWorking joins testRuns with projects and testPlans', async () => {
    const pj = makeProject('pj-1');
    const tp = makeTestPlan('tp-1', 'pj-1');
    const run1 = makeTestRun('tr-1', 'pj-1', { testPlanId: 'tp-1', status: 'in_progress', updatedAt: '2025-06-01T00:00:00Z', name: 'Run Alpha' });
    const run2 = makeTestRun('tr-2', 'pj-1', { status: 'completed', updatedAt: '2025-06-02T00:00:00Z' });
    const run3 = makeTestRun('tr-3', 'pj-1', { status: 'in_progress', updatedAt: '2025-05-01T00:00:00Z', name: 'Run Beta' });

    const repo = createMockDashboardRepository({
      projects: [pj],
      testPlans: [tp],
      testRuns: [run1, run2, run3],
    });

    const result = await repo.findContinueWorking(5);

    expect(result).toHaveLength(2);
    expect(result[0].testRunName).toBe('Run Alpha');
    expect(result[0].project.id).toBe('pj-1');
    expect(result[0].testPlan).not.toBeNull();
    expect(result[0].testPlan!.id).toBe('tp-1');
    expect(result[1].testRunName).toBe('Run Beta');
    expect(result[1].testPlan).toBeNull();
  });

  it('findMyWorkIssues filters by assignedTo and non-closed status', async () => {
    const pj1 = makeProject('pj-1', { name: 'Alpha', ownerId: 'owner-a' });
    const pj2 = makeProject('pj-2', { name: 'Beta', ownerId: 'owner-b' });

    const iss1 = makeIssue('iss-1', 'pj-1', { assignedTo: 'user-1', status: 'open', updatedAt: '2025-06-01T00:00:00Z' });
    const iss2 = makeIssue('iss-2', 'pj-1', { assignedTo: 'user-1', status: 'closed', updatedAt: '2025-06-02T00:00:00Z' });
    const iss3 = makeIssue('iss-3', 'pj-2', { assignedTo: 'user-2', status: 'open', updatedAt: '2025-06-03T00:00:00Z' });
    const iss4 = makeIssue('iss-4', 'pj-2', { assignedTo: 'user-1', status: 'in_progress', updatedAt: '2025-06-04T00:00:00Z' });

    const repo = createMockDashboardRepository({
      projects: [pj1, pj2],
      issues: [iss1, iss2, iss3, iss4],
    });

    const result = await repo.findMyWorkIssues('user-1', 5);

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('iss-4');
    expect(result[0].projectName).toBe('Beta');
    expect(result[0].projectOwnerId).toBe('owner-b');
    expect(result[1].id).toBe('iss-1');
    expect(result[1].projectName).toBe('Alpha');
    expect(result[1].projectOwnerId).toBe('owner-a');
  });

  it('findRecentActivity filters out soft-deleted entries', async () => {
    const a1 = makeActivity('a-1', { createdAt: '2025-06-01T00:00:00Z' });
    const a2 = makeActivity('a-2', { deletedAt: '2025-06-02T00:00:00Z', createdAt: '2025-06-02T00:00:00Z' });
    const a3 = makeActivity('a-3', { createdAt: '2025-06-03T00:00:00Z' });

    const repo = createMockDashboardRepository({ activity: [a1, a2, a3] });
    const result = await repo.findRecentActivity(5);

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('a-3');
    expect(result[1].id).toBe('a-1');
  });

  it('two instances do not share state', async () => {
    const repoA = createMockDashboardRepository({
      projects: [makeProject('pj-1')],
    });
    const repoB = createMockDashboardRepository({
      projects: [makeProject('pj-1'), makeProject('pj-2')],
    });

    const countsA = await repoA.getCounts('user-1');
    const countsB = await repoB.getCounts('user-1');

    expect(countsA.projectCount).toBe(1);
    expect(countsB.projectCount).toBe(2);
  });
});
