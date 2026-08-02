import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { TestCase, TestCaseWithDetails, TestCaseStep } from '../types/domain';

vi.mock('../repositories/testCaseRepository', () => ({
  testCaseRepository: {
    findAllByProject: vi.fn(),
    findAllByProjectWithDetails: vi.fn(),
    findById: vi.fn(),
    findByIdWithDetails: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    findByIdsWithDetails: vi.fn(),
    createMany: vi.fn(),
  },
}));
vi.mock('../repositories/testCaseStepRepository', () => ({
  testCaseStepRepository: {
    findAllByTestCases: vi.fn(),
    createMany: vi.fn(),
  },
}));
vi.mock('./tagService', () => ({
  tagService: {
    saveTagsForTestCase: vi.fn(),
    saveTagsForTestCaseMany: vi.fn(),
  },
}));
vi.mock('./testCaseStepService', () => ({
  testCaseStepService: {
    listByTestCase: vi.fn(),
    replaceForTestCase: vi.fn(),
  },
}));
vi.mock('./activityService', () => ({
  activityService: { logEvent: vi.fn() },
}));
vi.mock('./moduleService', () => ({
  moduleService: {
    listByProject: vi.fn(),
    createMany: vi.fn(),
  },
}));
vi.mock('./testRoleService', () => ({
  testRoleService: {
    listByProject: vi.fn(),
    createMany: vi.fn(),
  },
}));

const { testCaseRepository } = await import('../repositories/testCaseRepository');
const { testCaseStepRepository } = await import('../repositories/testCaseStepRepository');
const { tagService } = await import('./tagService');
const { testCaseStepService } = await import('./testCaseStepService');
const { activityService } = await import('./activityService');
const { moduleService } = await import('./moduleService');
const { testRoleService } = await import('./testRoleService');
const { testCaseService } = await import('./testCaseService');

function makeTestCase(overrides: Partial<TestCase> = {}): TestCase {
  return {
    id: 'tc-1',
    projectId: 'proj-1',
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
    ...overrides,
  } as TestCase;
}

function makeTestCaseWithDetails(overrides: Partial<TestCaseWithDetails> = {}): TestCaseWithDetails {
  return {
    ...makeTestCase(),
    module: null,
    tags: [],
    targetRole: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('testCaseService passthrough reads', () => {
  it('delegates listByProject', async () => {
    vi.mocked(testCaseRepository.findAllByProject).mockResolvedValue([makeTestCase()]);
    const result = await testCaseService.listByProject('proj-1');
    expect(testCaseRepository.findAllByProject).toHaveBeenCalledWith('proj-1');
    expect(result).toHaveLength(1);
  });

  it('delegates listByProjectWithDetails', async () => {
    vi.mocked(testCaseRepository.findAllByProjectWithDetails).mockResolvedValue([makeTestCaseWithDetails()]);
    const options = { search: 'login', statuses: ['active'] as TestCase['status'][] };
    const result = await testCaseService.listByProjectWithDetails('proj-1', options);
    expect(testCaseRepository.findAllByProjectWithDetails).toHaveBeenCalledWith('proj-1', options);
    expect(result[0].code).toBe('TC-1');
  });

  it('delegates getById', async () => {
    vi.mocked(testCaseRepository.findById).mockResolvedValue(makeTestCase());
    const result = await testCaseService.getById('tc-1');
    expect(testCaseRepository.findById).toHaveBeenCalledWith('tc-1');
    expect(result?.id).toBe('tc-1');
  });

  it('delegates getByIdWithDetails', async () => {
    vi.mocked(testCaseRepository.findByIdWithDetails).mockResolvedValue({
      ...makeTestCaseWithDetails(),
      project: { id: 'proj-1', name: 'P' },
    });
    const result = await testCaseService.getByIdWithDetails('tc-1');
    expect(testCaseRepository.findByIdWithDetails).toHaveBeenCalledWith('tc-1');
    expect(result?.project.name).toBe('P');
  });

  it('delegates listSteps', async () => {
    const step: TestCaseStep = {
      id: 's1',
      testCaseId: 'tc-1',
      stepNumber: 1,
      action: 'Click',
      expectedResult: null,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };
    vi.mocked(testCaseStepService.listByTestCase).mockResolvedValue([step]);
    const result = await testCaseService.listSteps('tc-1');
    expect(testCaseStepService.listByTestCase).toHaveBeenCalledWith('tc-1');
    expect(result).toEqual([step]);
  });

  it('delegates remove', async () => {
    vi.mocked(testCaseRepository.remove).mockResolvedValue(undefined);
    await testCaseService.remove('tc-1');
    expect(testCaseRepository.remove).toHaveBeenCalledWith('tc-1');
  });
});

describe('testCaseService.create', () => {
  it('rejects an empty title', async () => {
    await expect(
      testCaseService.create({
        projectId: 'proj-1',
        moduleId: null,
        title: '   ',
        steps: 'step',
        expectedResult: 'result',
      }),
    ).rejects.toThrow('Test case title cannot be empty');
    expect(testCaseRepository.create).not.toHaveBeenCalled();
  });

  it('rejects a simple test case with empty steps', async () => {
    await expect(
      testCaseService.create({
        projectId: 'proj-1',
        moduleId: null,
        title: 'Valid title',
        steps: '',
        expectedResult: 'result',
      }),
    ).rejects.toThrow('Test steps cannot be empty');
  });

  it('rejects a simple test case with empty expected result', async () => {
    await expect(
      testCaseService.create({
        projectId: 'proj-1',
        moduleId: null,
        title: 'Valid title',
        steps: 'step',
        expectedResult: '',
      }),
    ).rejects.toThrow('Expected result cannot be empty');
  });

  it('rejects a detailed test case with no steps', async () => {
    await expect(
      testCaseService.create({
        projectId: 'proj-1',
        moduleId: null,
        title: 'Valid title',
        steps: '',
        expectedResult: '',
        stepType: 'detailed',
        detailedSteps: [],
      }),
    ).rejects.toThrow('A detailed test case must have at least one step');
  });

  it('trims fields and delegates to the repository for a valid simple test case', async () => {
    vi.mocked(testCaseRepository.create).mockResolvedValue(makeTestCase());

    const result = await testCaseService.create({
      projectId: 'proj-1',
      moduleId: null,
      title: '  Login works  ',
      steps: '  Do the thing  ',
      expectedResult: '  It works  ',
    });

    expect(testCaseRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Login works',
        steps: 'Do the thing',
        expectedResult: 'It works',
        priority: 'medium',
        status: 'active',
        stepType: 'simple',
        targetRoleId: null,
        externalLinks: [],
        createdBy: null,
      }),
    );
    expect(result.id).toBe('tc-1');
    expect(tagService.saveTagsForTestCase).not.toHaveBeenCalled();
  });

  it('passes through optional fields (code, priority, targetRoleId, createdBy)', async () => {
    vi.mocked(testCaseRepository.create).mockResolvedValue(makeTestCase());

    await testCaseService.create({
      projectId: 'proj-1',
      moduleId: 'm-1',
      code: '  TC-42  ',
      title: 'Login',
      objective: '  Obj  ',
      preconditions: '  Pre  ',
      steps: 's',
      expectedResult: 'r',
      priority: 'high',
      notes: '  Note  ',
      targetRoleId: 'role-1',
      createdBy: 'u-1',
    });

    expect(testCaseRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        moduleId: 'm-1',
        code: 'TC-42',
        objective: 'Obj',
        preconditions: 'Pre',
        notes: 'Note',
        priority: 'high',
        targetRoleId: 'role-1',
        createdBy: 'u-1',
      }),
    );
  });

  it('saves tags when tagNames is provided', async () => {
    vi.mocked(testCaseRepository.create).mockResolvedValue(makeTestCase());

    await testCaseService.create({
      projectId: 'proj-1',
      moduleId: null,
      title: 'Login works',
      steps: 'Do the thing',
      expectedResult: 'It works',
      tagNames: ['smoke', 'auth'],
    });

    expect(tagService.saveTagsForTestCase).toHaveBeenCalledWith('proj-1', 'tc-1', ['smoke', 'auth']);
  });

  it('replaces detailed steps when stepType is detailed', async () => {
    vi.mocked(testCaseRepository.create).mockResolvedValue(makeTestCase({ stepType: 'detailed' }));
    const detailedSteps = [{ action: 'Click login', expectedResult: 'Dashboard shown' }];

    await testCaseService.create({
      projectId: 'proj-1',
      moduleId: null,
      title: 'Login works',
      steps: '',
      expectedResult: '',
      stepType: 'detailed',
      detailedSteps,
    });

    expect(testCaseStepService.replaceForTestCase).toHaveBeenCalledWith('tc-1', detailedSteps);
  });
});

describe('testCaseService.update', () => {
  it('updates the repository and applies optional tag/detailed-step/activity side effects', async () => {
    vi.mocked(testCaseRepository.update).mockResolvedValue(makeTestCase({ stepType: 'detailed' }));

    await testCaseService.update(
      'tc-1',
      'proj-1',
      { title: 'New title', stepType: 'detailed' },
      ['a', 'b'],
      [{ action: 'x', expectedResult: 'y' }],
      'u-1',
    );

    expect(testCaseRepository.update).toHaveBeenCalledWith('tc-1', { title: 'New title', stepType: 'detailed' });
    expect(tagService.saveTagsForTestCase).toHaveBeenCalledWith('proj-1', 'tc-1', ['a', 'b']);
    expect(testCaseStepService.replaceForTestCase).toHaveBeenCalledWith('tc-1', [{ action: 'x', expectedResult: 'y' }]);
    expect(activityService.logEvent).toHaveBeenCalledWith({
      projectId: 'proj-1',
      entityType: 'test_case',
      entityId: 'tc-1',
      actorId: 'u-1',
      eventType: 'field_update',
    });
  });

  it('skips tags/detailed-steps/activity when not provided', async () => {
    vi.mocked(testCaseRepository.update).mockResolvedValue(makeTestCase());

    await testCaseService.update('tc-1', 'proj-1', { title: 'T' });

    expect(tagService.saveTagsForTestCase).not.toHaveBeenCalled();
    expect(testCaseStepService.replaceForTestCase).not.toHaveBeenCalled();
    expect(activityService.logEvent).not.toHaveBeenCalled();
  });

  it('does not replace detailed steps when stepType is simple', async () => {
    vi.mocked(testCaseRepository.update).mockResolvedValue(makeTestCase({ stepType: 'simple' }));

    await testCaseService.update('tc-1', 'proj-1', { title: 'T' }, undefined, [{ action: 'x' }]);

    expect(testCaseStepService.replaceForTestCase).not.toHaveBeenCalled();
  });
});

describe('testCaseService.bulkUpdate', () => {
  it('updates every id sequentially with the same changes', async () => {
    vi.mocked(testCaseRepository.update).mockResolvedValue(makeTestCase());

    await testCaseService.bulkUpdate(['a', 'b', 'c'], { priority: 'critical', status: 'archived' });

    expect(testCaseRepository.update).toHaveBeenCalledTimes(3);
    expect(testCaseRepository.update).toHaveBeenCalledWith('a', { priority: 'critical', status: 'archived' });
    expect(testCaseRepository.update).toHaveBeenCalledWith('c', { priority: 'critical', status: 'archived' });
  });
});

describe('testCaseService.archive / reactivate', () => {
  it('archives the case and logs a status_change event', async () => {
    vi.mocked(testCaseRepository.update).mockResolvedValue(makeTestCase({ status: 'archived' }));

    const result = await testCaseService.archive('tc-1', { projectId: 'proj-1', actorId: 'u-1' });

    expect(testCaseRepository.update).toHaveBeenCalledWith('tc-1', { status: 'archived' });
    expect(activityService.logEvent).toHaveBeenCalledWith({
      projectId: 'proj-1',
      entityType: 'test_case',
      entityId: 'tc-1',
      actorId: 'u-1',
      eventType: 'status_change',
      payload: { from: 'active', to: 'archived' },
    });
    expect(result.status).toBe('archived');
  });

  it('reactivates the case and logs a status_change event', async () => {
    vi.mocked(testCaseRepository.update).mockResolvedValue(makeTestCase({ status: 'active' }));

    await testCaseService.reactivate('tc-1', { projectId: 'proj-1', actorId: 'u-1' });

    expect(testCaseRepository.update).toHaveBeenCalledWith('tc-1', { status: 'active' });
    expect(activityService.logEvent).toHaveBeenCalledWith({
      projectId: 'proj-1',
      entityType: 'test_case',
      entityId: 'tc-1',
      actorId: 'u-1',
      eventType: 'status_change',
      payload: { from: 'archived', to: 'active' },
    });
  });
});

describe('testCaseService.cloneToProject', () => {
  it('returns early when the id list is empty', async () => {
    await testCaseService.cloneToProject([], 'proj-2');
    expect(testCaseRepository.findByIdsWithDetails).not.toHaveBeenCalled();
  });

  it('reuses existing modules and roles by name and clones cases + tags + steps', async () => {
    const item: TestCaseWithDetails = makeTestCaseWithDetails({
      id: 'src-1',
      moduleId: 'mod-1',
      module: { id: 'mod-1', projectId: 'proj-1', code: 'M-1', name: 'Auth', createdAt: '', updatedAt: '' },
      targetRoleId: 'role-1',
      targetRole: { id: 'role-1', projectId: 'proj-1', name: 'Admin', createdAt: '', updatedAt: '' },
      tags: [{ id: 'tag-1', projectId: 'proj-1', name: 'smoke', createdAt: '' }],
      stepType: 'detailed',
    });
    vi.mocked(testCaseRepository.findByIdsWithDetails).mockResolvedValue([item]);
    vi.mocked(moduleService.listByProject).mockResolvedValue([
      { id: 'mod-1', projectId: 'proj-2', code: 'M-1', name: 'Auth', createdAt: '', updatedAt: '' },
    ]);
    vi.mocked(testRoleService.listByProject).mockResolvedValue([
      { id: 'role-1', projectId: 'proj-2', name: 'Admin', createdAt: '', updatedAt: '' },
    ]);
    vi.mocked(testCaseRepository.createMany).mockResolvedValue([
      { ...makeTestCase({ id: 'new-1' }), stepType: 'detailed' },
    ]);
    const step: TestCaseStep = {
      id: 's1',
      testCaseId: 'src-1',
      stepNumber: 1,
      action: 'Click',
      expectedResult: 'Works',
      createdAt: '',
      updatedAt: '',
    };
    vi.mocked(testCaseStepRepository.findAllByTestCases).mockResolvedValue([step]);

    await testCaseService.cloneToProject(['src-1'], 'proj-2');

    expect(moduleService.createMany).not.toHaveBeenCalled();
    expect(testRoleService.createMany).not.toHaveBeenCalled();
    expect(testCaseRepository.createMany).toHaveBeenCalledWith([
      expect.objectContaining({
        projectId: 'proj-2',
        moduleId: 'mod-1',
        title: 'Login works',
        stepType: 'detailed',
        targetRoleId: 'role-1',
        status: 'active',
      }),
    ]);
    expect(tagService.saveTagsForTestCaseMany).toHaveBeenCalledWith('proj-2', [
      { testCaseId: 'new-1', tagNames: ['smoke'] },
    ]);
    expect(testCaseStepRepository.createMany).toHaveBeenCalledWith([
      { testCaseId: 'new-1', stepNumber: 1, action: 'Click', expectedResult: 'Works' },
    ]);
  });

  it('creates new modules and roles when names are not found', async () => {
    const item: TestCaseWithDetails = makeTestCaseWithDetails({
      id: 'src-1',
      module: { id: 'mod-1', projectId: 'proj-1', code: 'M-1', name: 'Auth', createdAt: '', updatedAt: '' },
      targetRole: { id: 'role-1', projectId: 'proj-1', name: 'Admin', createdAt: '', updatedAt: '' },
      tags: [],
      stepType: 'simple',
    });
    vi.mocked(testCaseRepository.findByIdsWithDetails).mockResolvedValue([item]);
    vi.mocked(moduleService.listByProject).mockResolvedValue([]);
    vi.mocked(testRoleService.listByProject).mockResolvedValue([]);
    vi.mocked(moduleService.createMany).mockResolvedValue([
      { id: 'mod-new', projectId: 'proj-2', code: 'M-NEW', name: 'Auth', createdAt: '', updatedAt: '' },
    ]);
    vi.mocked(testRoleService.createMany).mockResolvedValue([
      { id: 'role-new', projectId: 'proj-2', name: 'Admin', createdAt: '', updatedAt: '' },
    ]);
    vi.mocked(testCaseRepository.createMany).mockResolvedValue([makeTestCase({ id: 'new-1' })]);

    await testCaseService.cloneToProject(['src-1'], 'proj-2');

    expect(moduleService.createMany).toHaveBeenCalledWith([{ projectId: 'proj-2', name: 'Auth' }]);
    expect(testRoleService.createMany).toHaveBeenCalledWith([{ projectId: 'proj-2', name: 'Admin' }]);
    expect(testCaseRepository.createMany).toHaveBeenCalledWith([
      expect.objectContaining({ moduleId: 'mod-new', targetRoleId: 'role-new' }),
    ]);
    expect(testCaseStepRepository.findAllByTestCases).not.toHaveBeenCalled();
  });

  it('maps items without module/role to null ids', async () => {
    const item: TestCaseWithDetails = makeTestCaseWithDetails({ id: 'src-1', tags: [] });
    vi.mocked(testCaseRepository.findByIdsWithDetails).mockResolvedValue([item]);
    vi.mocked(moduleService.listByProject).mockResolvedValue([]);
    vi.mocked(testRoleService.listByProject).mockResolvedValue([]);
    vi.mocked(testCaseRepository.createMany).mockResolvedValue([makeTestCase({ id: 'new-1' })]);

    await testCaseService.cloneToProject(['src-1'], 'proj-2');

    expect(testCaseRepository.createMany).toHaveBeenCalledWith([
      expect.objectContaining({ moduleId: null, targetRoleId: null }),
    ]);
  });

  it('falls back to null module/role ids when the created name does not match the item reference', async () => {
    const item: TestCaseWithDetails = makeTestCaseWithDetails({
      id: 'src-1',
      module: { id: 'mod-1', projectId: 'proj-1', code: 'M-1', name: 'Auth', createdAt: '', updatedAt: '' },
      targetRole: { id: 'role-1', projectId: 'proj-1', name: 'Admin', createdAt: '', updatedAt: '' },
      tags: [],
      stepType: 'simple',
    });
    vi.mocked(testCaseRepository.findByIdsWithDetails).mockResolvedValue([item]);
    vi.mocked(moduleService.listByProject).mockResolvedValue([]);
    vi.mocked(testRoleService.listByProject).mockResolvedValue([]);
    // Defensive: createMany returns a row whose name never made it into the map.
    vi.mocked(moduleService.createMany).mockResolvedValue([
      { id: 'mod-other', projectId: 'proj-2', code: 'M-O', name: 'Other', createdAt: '', updatedAt: '' },
    ]);
    vi.mocked(testRoleService.createMany).mockResolvedValue([
      { id: 'role-other', projectId: 'proj-2', name: 'Other', createdAt: '', updatedAt: '' },
    ]);
    vi.mocked(testCaseRepository.createMany).mockResolvedValue([makeTestCase({ id: 'new-1' })]);

    await testCaseService.cloneToProject(['src-1'], 'proj-2');

    expect(testCaseRepository.createMany).toHaveBeenCalledWith([
      expect.objectContaining({ moduleId: null, targetRoleId: null }),
    ]);
  });

  it('groups multiple steps per source case and tolerates a detailed case with no steps', async () => {
    const itemA: TestCaseWithDetails = makeTestCaseWithDetails({
      id: 'src-a',
      tags: [],
      stepType: 'detailed',
    });
    const itemB: TestCaseWithDetails = makeTestCaseWithDetails({
      id: 'src-b',
      tags: [],
      stepType: 'detailed',
    });
    vi.mocked(testCaseRepository.findByIdsWithDetails).mockResolvedValue([itemA, itemB]);
    vi.mocked(moduleService.listByProject).mockResolvedValue([]);
    vi.mocked(testRoleService.listByProject).mockResolvedValue([]);
    vi.mocked(testCaseRepository.createMany).mockResolvedValue([
      makeTestCase({ id: 'new-a', stepType: 'detailed' }),
      makeTestCase({ id: 'new-b', stepType: 'detailed' }),
    ]);
    vi.mocked(testCaseStepRepository.findAllByTestCases).mockResolvedValue([
      { id: 's1', testCaseId: 'src-a', stepNumber: 1, action: 'Open', expectedResult: 'Shown', createdAt: '', updatedAt: '' },
      { id: 's2', testCaseId: 'src-a', stepNumber: 2, action: 'Submit', expectedResult: 'Saved', createdAt: '', updatedAt: '' },
    ]);

    await testCaseService.cloneToProject(['src-a', 'src-b'], 'proj-2');

    expect(testCaseStepRepository.createMany).toHaveBeenCalledWith([
      { testCaseId: 'new-a', stepNumber: 1, action: 'Open', expectedResult: 'Shown' },
      { testCaseId: 'new-a', stepNumber: 2, action: 'Submit', expectedResult: 'Saved' },
    ]);
  });
});
