import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { TestCaseWithDetails, TestPlan } from '../types/domain';

vi.mock('./projectService', () => ({
  projectService: { create: vi.fn() },
}));
vi.mock('./moduleService', () => ({
  moduleService: { createMany: vi.fn() },
}));
vi.mock('./testRoleService', () => ({
  testRoleService: { createMany: vi.fn() },
}));
vi.mock('../repositories/testCaseRepository', () => ({
  testCaseRepository: { createMany: vi.fn() },
}));
vi.mock('../repositories/testCaseStepRepository', () => ({
  testCaseStepRepository: { createMany: vi.fn() },
}));
vi.mock('./tagService', () => ({
  tagService: { saveTagsForTestCaseMany: vi.fn() },
}));
vi.mock('./testCaseService', () => ({
  testCaseService: { listSteps: vi.fn() },
}));
vi.mock('./testPlanService', () => ({
  testPlanService: {
    create: vi.fn(),
    listCases: vi.fn(),
    addCasesMany: vi.fn(),
  },
}));
vi.mock('./issueService', () => ({
  issueService: { createMany: vi.fn() },
}));

const { projectService } = await import('./projectService');
const { moduleService } = await import('./moduleService');
const { testRoleService } = await import('./testRoleService');
const { testCaseRepository } = await import('../repositories/testCaseRepository');
const { testCaseStepRepository } = await import('../repositories/testCaseStepRepository');
const { tagService } = await import('./tagService');
const { testCaseService } = await import('./testCaseService');
const { testPlanService } = await import('./testPlanService');
const { issueService } = await import('./issueService');
const { projectDuplicateService } = await import('./projectDuplicateService');

function makeTestCase(overrides: Partial<TestCaseWithDetails> = {}): TestCaseWithDetails {
  return {
    id: 'tc-1',
    projectId: 'proj-src',
    moduleId: null,
    code: 'TC-1',
    title: 'Login works',
    objective: null,
    preconditions: null,
    steps: 'Do the thing',
    expectedResult: 'It works',
    priority: 'medium',
    status: 'active',
    notes: null,
    stepType: 'simple',
    targetRoleId: null,
    externalLinks: [],
    createdBy: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    module: null,
    tags: [],
    targetRole: null,
    ...overrides,
  } as TestCaseWithDetails;
}

function makePlan(overrides: Partial<TestPlan> = {}): TestPlan {
  return {
    id: 'plan-1',
    projectId: 'proj-src',
    code: 'PL-1',
    name: 'Release plan',
    description: null,
    status: 'active',
    createdBy: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  } as TestPlan;
}

function baseSelection() {
  return { testPlanIds: [], testCaseIds: [], issueIds: [] };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(projectService.create).mockResolvedValue({ id: 'proj-new' } as never);
  vi.mocked(moduleService.createMany).mockResolvedValue([] as never);
  vi.mocked(testRoleService.createMany).mockResolvedValue([] as never);
  vi.mocked(testCaseRepository.createMany).mockResolvedValue([] as never);
  vi.mocked(tagService.saveTagsForTestCaseMany).mockResolvedValue(undefined);
  vi.mocked(issueService.createMany).mockResolvedValue([] as never);
  vi.mocked(testPlanService.create).mockResolvedValue({ id: 'new-plan-1' } as never);
  vi.mocked(testPlanService.addCasesMany).mockResolvedValue(undefined);
});

describe('projectDuplicateService.duplicateProject', () => {
  it('creates the new project with the given name', async () => {
    await projectDuplicateService.duplicateProject('Clone', baseSelection(), { testPlans: [], testCases: [], issues: [] });

    expect(projectService.create).toHaveBeenCalledWith({ name: 'Clone' });
  });

  it('unions explicitly selected test cases with plan-scope cases without duplicates', async () => {
    const tc1 = makeTestCase({ id: 'tc1' });
    const tc2 = makeTestCase({ id: 'tc2' });
    const plan = makePlan({ id: 'plan-1' });
    vi.mocked(testPlanService.listCases).mockResolvedValue([
      { id: 'pc1', testPlanId: 'plan-1', testCaseId: 'tc1', order: 0 },
      { id: 'pc2', testPlanId: 'plan-1', testCaseId: 'tc2', order: 1 },
    ] as never);
    vi.mocked(testCaseRepository.createMany).mockResolvedValue([
      { id: 'new-tc1' },
      { id: 'new-tc2' },
    ] as never);

    await projectDuplicateService.duplicateProject('Clone', { ...baseSelection(), testPlanIds: ['plan-1'], testCaseIds: ['tc1'] }, {
      testPlans: [plan],
      testCases: [tc1, tc2],
      issues: [],
    });

    expect(testCaseRepository.createMany).toHaveBeenCalledTimes(1);
    const createdInputs = vi.mocked(testCaseRepository.createMany).mock.calls[0][0];
    expect(createdInputs.map((i: { title: string }) => i.title)).toEqual(['Login works', 'Login works']);
    expect(createdInputs).toHaveLength(2);
  });

  it('skips a selected test plan id that does not exist in the source data', async () => {
    vi.mocked(testCaseRepository.createMany).mockResolvedValue([] as never);

    await projectDuplicateService.duplicateProject('Clone', { ...baseSelection(), testPlanIds: ['plan-ghost'] }, {
      testPlans: [],
      testCases: [],
      issues: [],
    });

    expect(testPlanService.listCases).not.toHaveBeenCalled();
    expect(testCaseRepository.createMany).toHaveBeenCalledWith([]);
  });

  it('drops explicitly selected test case ids that do not exist in source data', async () => {
    const tc1 = makeTestCase({ id: 'tc1' });
    vi.mocked(testCaseRepository.createMany).mockResolvedValue([{ id: 'new-tc1' }] as never);

    await projectDuplicateService.duplicateProject('Clone', { ...baseSelection(), testCaseIds: ['tc1', 'tc-ghost'] }, {
      testPlans: [],
      testCases: [tc1],
      issues: [],
    });

    expect(vi.mocked(testCaseRepository.createMany).mock.calls[0][0]).toHaveLength(1);
  });

  it('deduplicates module/role names and remaps both selected test cases and issues', async () => {
    const tc1 = makeTestCase({ id: 'tc1', module: { id: 'm1', projectId: 'proj-src', code: '', name: 'Auth', createdAt: '', updatedAt: '' }, targetRole: { id: 'r1', projectId: 'proj-src', name: 'Admin', createdAt: '', updatedAt: '' } });
    const tc2 = makeTestCase({ id: 'tc2', module: { id: 'm1', projectId: 'proj-src', code: '', name: 'Auth', createdAt: '', updatedAt: '' } });
    vi.mocked(moduleService.createMany).mockResolvedValue([
      { id: 'm-new', name: 'Auth' },
    ] as never);
    vi.mocked(testRoleService.createMany).mockResolvedValue([
      { id: 'r-new', name: 'Admin' },
    ] as never);
    vi.mocked(testCaseRepository.createMany).mockResolvedValue([
      { id: 'new-tc1' },
      { id: 'new-tc2' },
    ] as never);

    await projectDuplicateService.duplicateProject('Clone', { ...baseSelection(), testCaseIds: ['tc1', 'tc2'] }, {
      testPlans: [],
      testCases: [tc1, tc2],
      issues: [],
    });

    expect(moduleService.createMany).toHaveBeenCalledWith([{ projectId: 'proj-new', name: 'Auth' }]);
    expect(testRoleService.createMany).toHaveBeenCalledWith([{ projectId: 'proj-new', name: 'Admin' }]);
    const createdInputs = vi.mocked(testCaseRepository.createMany).mock.calls[0][0];
    expect(createdInputs[0]).toMatchObject({ moduleId: 'm-new', targetRoleId: 'r-new' });
    expect(createdInputs[1]).toMatchObject({ moduleId: 'm-new', targetRoleId: null });
  });

  it('inserts steps only for detailed test cases', async () => {
    const tcSimple = makeTestCase({ id: 'tc1', stepType: 'simple' });
    const tcDetailed = makeTestCase({ id: 'tc2', stepType: 'detailed' });
    vi.mocked(testCaseService.listSteps).mockResolvedValue([
      { id: 's1', testCaseId: 'tc2', stepNumber: 1, action: 'Click', expectedResult: 'Shown', createdAt: '', updatedAt: '' },
      { id: 's2', testCaseId: 'tc2', stepNumber: 2, action: 'Check', expectedResult: null, createdAt: '', updatedAt: '' },
    ] as never);
    vi.mocked(testCaseRepository.createMany).mockResolvedValue([
      { id: 'new-tc1' },
      { id: 'new-tc2' },
    ] as never);

    await projectDuplicateService.duplicateProject('Clone', { ...baseSelection(), testCaseIds: ['tc1', 'tc2'] }, {
      testPlans: [],
      testCases: [tcSimple, tcDetailed],
      issues: [],
    });

    expect(testCaseService.listSteps).toHaveBeenCalledTimes(1);
    expect(testCaseService.listSteps).toHaveBeenCalledWith('tc2');
    expect(testCaseStepRepository.createMany).toHaveBeenCalledWith([
      { testCaseId: 'new-tc2', stepNumber: 1, action: 'Click', expectedResult: 'Shown' },
      { testCaseId: 'new-tc2', stepNumber: 2, action: 'Check', expectedResult: null },
    ]);
  });

  it('maps module/role lookups to null when a requested name is not in the created map', async () => {
    const tc1 = makeTestCase({
      id: 'tc1',
      module: { id: 'm1', projectId: 'proj-src', code: '', name: 'Auth', createdAt: '', updatedAt: '' },
      targetRole: { id: 'r1', projectId: 'proj-src', name: 'Admin', createdAt: '', updatedAt: '' },
    });
    // createMany returns fewer rows than requested (defensive) so lookups fall back to null
    vi.mocked(moduleService.createMany).mockResolvedValue([{ id: 'm-new' }] as never);
    vi.mocked(testRoleService.createMany).mockResolvedValue([] as never);
    vi.mocked(testCaseRepository.createMany).mockResolvedValue([{ id: 'new-tc1' }] as never);

    await projectDuplicateService.duplicateProject('Clone', { ...baseSelection(), testCaseIds: ['tc1'] }, {
      testPlans: [],
      testCases: [tc1],
      issues: [],
    });

    const createdInputs = vi.mocked(testCaseRepository.createMany).mock.calls[0][0];
    // m-new has no `name` so moduleIdMap lookup for 'Auth' fails -> null
    expect(createdInputs[0]).toMatchObject({ moduleId: null, targetRoleId: null });
  });

  it('handles a detailed test case with no steps (empty fallback)', async () => {
    const tcDetailed = makeTestCase({ id: 'tc2', stepType: 'detailed' });
    vi.mocked(testCaseService.listSteps).mockResolvedValue([] as never);
    vi.mocked(testCaseRepository.createMany).mockResolvedValue([{ id: 'new-tc2' }] as never);

    await projectDuplicateService.duplicateProject('Clone', { ...baseSelection(), testCaseIds: ['tc2'] }, {
      testPlans: [],
      testCases: [tcDetailed],
      issues: [],
    });

    expect(testCaseStepRepository.createMany).not.toHaveBeenCalled();
  });

  it('does not call step insert when no detailed test case is selected', async () => {
    const tc1 = makeTestCase({ id: 'tc1', stepType: 'simple' });
    vi.mocked(testCaseRepository.createMany).mockResolvedValue([{ id: 'new-tc1' }] as never);

    await projectDuplicateService.duplicateProject('Clone', { ...baseSelection(), testCaseIds: ['tc1'] }, {
      testPlans: [],
      testCases: [tc1],
      issues: [],
    });

    expect(testCaseStepRepository.createMany).not.toHaveBeenCalled();
  });

  it('assigns tags to the new test cases preserving source tag names', async () => {
    const tc1 = makeTestCase({ id: 'tc1', tags: [{ id: 't1', projectId: 'proj-src', name: 'smoke', createdAt: '' }] });
    const tc2 = makeTestCase({ id: 'tc2', tags: [] });
    vi.mocked(testCaseRepository.createMany).mockResolvedValue([
      { id: 'new-tc1' },
      { id: 'new-tc2' },
    ] as never);

    await projectDuplicateService.duplicateProject('Clone', { ...baseSelection(), testCaseIds: ['tc1', 'tc2'] }, {
      testPlans: [],
      testCases: [tc1, tc2],
      issues: [],
    });

    expect(tagService.saveTagsForTestCaseMany).toHaveBeenCalledWith('proj-new', [
      { testCaseId: 'new-tc1', tagNames: ['smoke'] },
      { testCaseId: 'new-tc2', tagNames: [] },
    ]);
  });

  it('recreates selected plans and attaches cases with order derived from array position', async () => {
    const tc1 = makeTestCase({ id: 'tc1' });
    const tc3 = makeTestCase({ id: 'tc3' });
    const plan = makePlan({ id: 'plan-1' });
    vi.mocked(testPlanService.create).mockResolvedValue({ id: 'new-plan-1' } as never);
    vi.mocked(testPlanService.listCases).mockResolvedValue([
      { id: 'pc1', testPlanId: 'plan-1', testCaseId: 'tc1', order: 0 },
      { id: 'pc2', testPlanId: 'plan-1', testCaseId: 'tc3', order: 1 },
    ] as never);
    vi.mocked(testCaseRepository.createMany).mockResolvedValue([
      { id: 'new-tc1' },
      { id: 'new-tc3' },
    ] as never);

    await projectDuplicateService.duplicateProject('Clone', { ...baseSelection(), testPlanIds: ['plan-1'] }, {
      testPlans: [plan],
      testCases: [tc1, tc3],
      issues: [],
    });

    expect(testPlanService.create).toHaveBeenCalledWith({
      projectId: 'proj-new',
      name: 'Release plan',
      description: undefined,
    });
    expect(testPlanService.addCasesMany).toHaveBeenCalledWith([
      { testPlanId: 'new-plan-1', testCaseId: 'new-tc1', order: 0 },
      { testPlanId: 'new-plan-1', testCaseId: 'new-tc3', order: 1 },
    ]);
  });

  it('filters out plan-case attach inputs whose testCaseId did not resolve', async () => {
    const tc1 = makeTestCase({ id: 'tc1' });
    const plan = makePlan({ id: 'plan-1' });
    vi.mocked(testPlanService.create).mockResolvedValue({ id: 'new-plan-1' } as never);
    vi.mocked(testPlanService.listCases).mockResolvedValue([
      { id: 'pc1', testPlanId: 'plan-1', testCaseId: 'tc1', order: 0 },
      { id: 'pc2', testPlanId: 'plan-1', testCaseId: 'tc-ghost', order: 1 },
    ] as never);
    vi.mocked(testCaseRepository.createMany).mockResolvedValue([{ id: 'new-tc1' }] as never);

    await projectDuplicateService.duplicateProject('Clone', { ...baseSelection(), testPlanIds: ['plan-1'] }, {
      testPlans: [plan],
      testCases: [tc1],
      issues: [],
    });

    expect(testPlanService.addCasesMany).toHaveBeenCalledWith([
      { testPlanId: 'new-plan-1', testCaseId: 'new-tc1', order: 0 },
    ]);
  });

  it('recreates selected issues with remapped module ids and their tags', async () => {
    const issue = {
      id: 'iss-1',
      code: 'ISS-1',
      projectId: 'proj-src',
      moduleId: null,
      type: 'bug',
      title: 'Broken login',
      description: null,
      actualResult: null,
      expectedResult: null,
      priority: 'high',
      status: 'open',
      assignedTo: null,
      targetRoleId: null,
      externalLinks: [],
      createdBy: null,
      createdAt: '',
      updatedAt: '',
      module: { id: 'm1', projectId: 'proj-src', code: '', name: 'Auth', createdAt: '', updatedAt: '' },
      targetRole: null,
      tags: [{ id: 't1', projectId: 'proj-src', name: 'critical', createdAt: '' }],
      linkedTestResults: [],
    };
    vi.mocked(moduleService.createMany).mockResolvedValue([{ id: 'm-new', name: 'Auth' }] as never);
    vi.mocked(testCaseRepository.createMany).mockResolvedValue([] as never);

    await projectDuplicateService.duplicateProject('Clone', { ...baseSelection(), issueIds: ['iss-1'] }, {
      testPlans: [],
      testCases: [],
      issues: [issue as never],
    });

    expect(issueService.createMany).toHaveBeenCalledWith([
      expect.objectContaining({
        projectId: 'proj-new',
        moduleId: 'm-new',
        type: 'bug',
        title: 'Broken login',
        priority: 'high',
        tagNames: ['critical'],
      }),
    ]);
  });

  it('skips module name collection and maps moduleId to null for an issue without a module', async () => {
    const issue = {
      id: 'iss-1',
      code: 'ISS-1',
      projectId: 'proj-src',
      moduleId: null,
      type: 'bug',
      title: 'Broken login',
      description: null,
      actualResult: null,
      expectedResult: null,
      priority: 'high',
      status: 'open',
      assignedTo: null,
      targetRoleId: null,
      externalLinks: [],
      createdBy: null,
      createdAt: '',
      updatedAt: '',
      module: null,
      targetRole: null,
      tags: [],
      linkedTestResults: [],
    };
    vi.mocked(testCaseRepository.createMany).mockResolvedValue([] as never);

    await projectDuplicateService.duplicateProject('Clone', { ...baseSelection(), issueIds: ['iss-1'] }, {
      testPlans: [],
      testCases: [],
      issues: [issue as never],
    });

    expect(moduleService.createMany).not.toHaveBeenCalled();
    expect(issueService.createMany).toHaveBeenCalledWith([
      expect.objectContaining({ projectId: 'proj-new', moduleId: null }),
    ]);
  });

  it('maps an issue module lookup to null when the module was not created', async () => {
    const issue = {
      id: 'iss-1',
      code: 'ISS-1',
      projectId: 'proj-src',
      moduleId: null,
      type: 'bug',
      title: 'Broken login',
      description: null,
      actualResult: null,
      expectedResult: null,
      priority: 'high',
      status: 'open',
      assignedTo: null,
      targetRoleId: null,
      externalLinks: [],
      createdBy: null,
      createdAt: '',
      updatedAt: '',
      module: { id: 'm1', projectId: 'proj-src', code: '', name: 'Auth', createdAt: '', updatedAt: '' },
      targetRole: null,
      tags: [],
      linkedTestResults: [],
    };
    vi.mocked(moduleService.createMany).mockResolvedValue([] as never);
    vi.mocked(testCaseRepository.createMany).mockResolvedValue([] as never);

    await projectDuplicateService.duplicateProject('Clone', { ...baseSelection(), issueIds: ['iss-1'] }, {
      testPlans: [],
      testCases: [],
      issues: [issue as never],
    });

    expect(issueService.createMany).toHaveBeenCalledWith([
      expect.objectContaining({ projectId: 'proj-new', moduleId: null }),
    ]);
  });
});
