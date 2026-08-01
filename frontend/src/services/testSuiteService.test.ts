import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import type { TestSuiteItem, TestSuiteItemStep } from '../types/domain';

vi.mock('../repositories/testSuiteRepository', () => ({
  testSuiteRepository: {
    findAll: vi.fn(),
    findAllPaginated: vi.fn(),
    findByOwner: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    findItemsBySuite: vi.fn(),
    findStepsByItem: vi.fn(),
    findStepsByItems: vi.fn(),
    findItemById: vi.fn(),
    createItem: vi.fn(),
    createItemsMany: vi.fn(),
    replaceStepsForItem: vi.fn(),
    createStepsMany: vi.fn(),
    updateItem: vi.fn(),
    removeItem: vi.fn(),
    removeItemsMany: vi.fn(),
    findItemsByIds: vi.fn(),
  },
}));
vi.mock('../repositories/testCaseRepository', () => ({
  testCaseRepository: {
    findByIdsWithDetails: vi.fn(),
    createMany: vi.fn(),
  },
}));
vi.mock('../repositories/testCaseStepRepository', () => ({
  testCaseStepRepository: {
    findAllByTestCases: vi.fn(),
    createMany: vi.fn(),
    replaceForTestCase: vi.fn(),
  },
}));
vi.mock('../repositories/profileRepository', () => ({
  profileRepository: {
    findById: vi.fn(),
    findByIds: vi.fn(),
  },
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
vi.mock('./tagService', () => ({
  tagService: { saveTagsForTestCaseMany: vi.fn() },
}));

const { testSuiteRepository } = await import('../repositories/testSuiteRepository');
const { testCaseRepository } = await import('../repositories/testCaseRepository');
const { testCaseStepRepository } = await import('../repositories/testCaseStepRepository');
const { profileRepository } = await import('../repositories/profileRepository');
const { moduleService } = await import('./moduleService');
const { testRoleService } = await import('./testRoleService');
const { tagService } = await import('./tagService');
const { testSuiteService } = await import('./testSuiteService');

function makeItem(overrides: Partial<TestSuiteItem> = {}): TestSuiteItem {
  return {
    id: 'item-1',
    suiteId: 'suite-1',
    moduleName: null,
    title: 'Login works',
    objective: null,
    preconditions: null,
    steps: 'Do the thing',
    expectedResult: 'It works',
    priority: 'medium',
    stepType: 'simple',
    targetRole: null,
    tagNames: [],
    notes: null,
    orderIndex: 0,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  } as TestSuiteItem;
}

function makeStep(overrides: Partial<TestSuiteItemStep> = {}): TestSuiteItemStep {
  return {
    id: 'step-1',
    suiteItemId: 'item-1',
    stepNumber: 1,
    action: 'Click login',
    expectedResult: 'Dashboard shown',
    ...overrides,
  } as TestSuiteItemStep;
}

describe('testSuiteService.createSuite / updateSuite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects an empty suite name on create', async () => {
    await expect(testSuiteService.createSuite({ name: '   ' })).rejects.toThrow('Suite name cannot be empty');
    expect(testSuiteRepository.create).not.toHaveBeenCalled();
  });

  it('trims name/description and defaults visibility to private', async () => {
    vi.mocked(testSuiteRepository.create).mockResolvedValue({ id: 'suite-1' } as never);

    await testSuiteService.createSuite({ name: '  Smoke suite  ', description: '  desc  ' });

    expect(testSuiteRepository.create).toHaveBeenCalledWith({
      name: 'Smoke suite',
      description: 'desc',
      visibility: 'private',
    });
  });

  it('rejects an empty suite name on update', async () => {
    await expect(testSuiteService.updateSuite('suite-1', { name: '   ' })).rejects.toThrow(
      'Suite name cannot be empty',
    );
    expect(testSuiteRepository.update).not.toHaveBeenCalled();
  });

  it('includes visibility on update when provided', async () => {
    vi.mocked(testSuiteRepository.update).mockResolvedValue({ id: 'suite-1' } as never);

    await testSuiteService.updateSuite('suite-1', { name: '  R1  ', description: '  d  ', visibility: 'public' });

    expect(testSuiteRepository.update).toHaveBeenCalledWith('suite-1', {
      name: 'R1',
      description: 'd',
      visibility: 'public',
    });
  });
});

describe('testSuiteService passthrough suite ops', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('delegates listSuites', async () => {
    vi.mocked(testSuiteRepository.findAll).mockResolvedValue([{ id: 's1' } as never]);
    const result = await testSuiteService.listSuites();
    expect(testSuiteRepository.findAll).toHaveBeenCalled();
    expect(result).toHaveLength(1);
  });

  it('delegates listByOwner', async () => {
    vi.mocked(testSuiteRepository.findByOwner).mockResolvedValue([{ id: 's1' } as never]);
    const result = await testSuiteService.listByOwner('u1', ['private']);
    expect(testSuiteRepository.findByOwner).toHaveBeenCalledWith('u1', ['private']);
    expect(result).toHaveLength(1);
  });

  it('delegates removeSuite', async () => {
    vi.mocked(testSuiteRepository.remove).mockResolvedValue(undefined);
    await testSuiteService.removeSuite('s1');
    expect(testSuiteRepository.remove).toHaveBeenCalledWith('s1');
  });

  it('delegates listItems', async () => {
    vi.mocked(testSuiteRepository.findItemsBySuite).mockResolvedValue([makeItem()]);
    const result = await testSuiteService.listItems('suite-1');
    expect(testSuiteRepository.findItemsBySuite).toHaveBeenCalledWith('suite-1');
    expect(result).toHaveLength(1);
  });
});

describe('testSuiteService.getItemWithSteps / getItemById', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches steps for a detailed item', async () => {
    vi.mocked(testSuiteRepository.findStepsByItem).mockResolvedValue([makeStep()]);

    const result = await testSuiteService.getItemWithSteps(makeItem({ stepType: 'detailed' }));

    expect(testSuiteRepository.findStepsByItem).toHaveBeenCalledWith('item-1');
    expect(result.detailedSteps).toHaveLength(1);
  });

  it('returns empty steps for a simple item without querying', async () => {
    const result = await testSuiteService.getItemWithSteps(makeItem({ stepType: 'simple' }));
    expect(testSuiteRepository.findStepsByItem).not.toHaveBeenCalled();
    expect(result.detailedSteps).toEqual([]);
  });

  it('getItemById returns null when the item is missing', async () => {
    vi.mocked(testSuiteRepository.findItemById).mockResolvedValue(null);
    expect(await testSuiteService.getItemById('missing')).toBeNull();
  });

  it('getItemById loads steps for a found item', async () => {
    vi.mocked(testSuiteRepository.findItemById).mockResolvedValue(makeItem({ stepType: 'detailed' }));
    vi.mocked(testSuiteRepository.findStepsByItem).mockResolvedValue([makeStep()]);

    const result = await testSuiteService.getItemById('item-1');

    expect(testSuiteRepository.findItemById).toHaveBeenCalledWith('item-1');
    expect(result?.detailedSteps).toHaveLength(1);
  });
});

describe('testSuiteService.updateItem / removeItem / removeItemsMany', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('replaces steps when the item is detailed and steps are provided', async () => {
    vi.mocked(testSuiteRepository.updateItem).mockResolvedValue(makeItem({ stepType: 'detailed' }));

    await testSuiteService.updateItem('item-1', { title: 'New' }, [
      { action: 'a', expectedResult: '  b  ' },
    ]);

    expect(testSuiteRepository.updateItem).toHaveBeenCalledWith('item-1', { title: 'New' });
    expect(testSuiteRepository.replaceStepsForItem).toHaveBeenCalledWith('item-1', [
      { action: 'a', expectedResult: 'b' },
    ]);
  });

  it('does not replace steps when the item is simple', async () => {
    vi.mocked(testSuiteRepository.updateItem).mockResolvedValue(makeItem({ stepType: 'simple' }));

    await testSuiteService.updateItem('item-1', { title: 'New' }, [{ action: 'a' }]);

    expect(testSuiteRepository.replaceStepsForItem).not.toHaveBeenCalled();
  });

  it('does not replace steps when detailedSteps is undefined', async () => {
    vi.mocked(testSuiteRepository.updateItem).mockResolvedValue(makeItem({ stepType: 'detailed' }));

    await testSuiteService.updateItem('item-1', { title: 'New' });

    expect(testSuiteRepository.replaceStepsForItem).not.toHaveBeenCalled();
  });

  it('delegates removeItem', async () => {
    vi.mocked(testSuiteRepository.removeItem).mockResolvedValue(undefined);
    await testSuiteService.removeItem('item-1');
    expect(testSuiteRepository.removeItem).toHaveBeenCalledWith('item-1');
  });

  it('delegates removeItemsMany', async () => {
    vi.mocked(testSuiteRepository.removeItemsMany).mockResolvedValue(undefined);
    await testSuiteService.removeItemsMany(['a', 'b']);
    expect(testSuiteRepository.removeItemsMany).toHaveBeenCalledWith(['a', 'b']);
  });
});

describe('testSuiteService.addItem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects an empty title', async () => {
    await expect(
      testSuiteService.addItem({ suiteId: 'suite-1', title: '  ', steps: 's', expectedResult: 'r', orderIndex: 0 }),
    ).rejects.toThrow('Test case title cannot be empty');
    expect(testSuiteRepository.createItem).not.toHaveBeenCalled();
  });

  it('rejects a simple item with empty steps', async () => {
    await expect(
      testSuiteService.addItem({ suiteId: 'suite-1', title: 'T', steps: ' ', expectedResult: 'r', orderIndex: 0 }),
    ).rejects.toThrow('Test steps cannot be empty');
  });

  it('rejects a simple item with empty expected result', async () => {
    await expect(
      testSuiteService.addItem({ suiteId: 'suite-1', title: 'T', steps: 's', expectedResult: ' ', orderIndex: 0 }),
    ).rejects.toThrow('Expected result cannot be empty');
  });

  it('rejects a detailed item with no detailed steps', async () => {
    await expect(
      testSuiteService.addItem({
        suiteId: 'suite-1',
        title: 'T',
        steps: 's',
        expectedResult: 'r',
        stepType: 'detailed',
        detailedSteps: [],
        orderIndex: 0,
      }),
    ).rejects.toThrow('A detailed test case must have at least one step');
  });

  it('trims fields and defaults stepType/priority for a valid simple item', async () => {
    vi.mocked(testSuiteRepository.createItem).mockResolvedValue(makeItem());

    await testSuiteService.addItem({
      suiteId: 'suite-1',
      moduleName: '  Auth  ',
      title: '  Login  ',
      steps: '  Do it  ',
      expectedResult: '  Works  ',
      orderIndex: 3,
    });

    expect(testSuiteRepository.createItem).toHaveBeenCalledWith(
      expect.objectContaining({
        suiteId: 'suite-1',
        moduleName: 'Auth',
        title: 'Login',
        steps: 'Do it',
        expectedResult: 'Works',
        priority: 'medium',
        stepType: 'simple',
        orderIndex: 3,
      }),
    );
    expect(testSuiteRepository.replaceStepsForItem).not.toHaveBeenCalled();
  });

  it('replaces detailed steps when stepType is detailed', async () => {
    vi.mocked(testSuiteRepository.createItem).mockResolvedValue(makeItem({ id: 'item-9', stepType: 'detailed' }));
    const detailedSteps = [{ action: ' Click login ', expectedResult: ' Dashboard shown ' }];

    await testSuiteService.addItem({
      suiteId: 'suite-1',
      title: 'T',
      steps: '',
      expectedResult: '',
      stepType: 'detailed',
      detailedSteps,
      orderIndex: 0,
    });

    expect(testSuiteRepository.replaceStepsForItem).toHaveBeenCalledWith('item-9', [
      { action: ' Click login ', expectedResult: 'Dashboard shown' },
    ]);
  });
});

describe('testSuiteService.addItemsMany', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns [] without touching the repository when given no inputs', async () => {
    const result = await testSuiteService.addItemsMany([]);
    expect(result).toEqual([]);
    expect(testSuiteRepository.createItemsMany).not.toHaveBeenCalled();
  });

  it('batch-inserts items and only builds step rows for detailed items, in order', async () => {
    vi.mocked(testSuiteRepository.createItemsMany).mockResolvedValue([
      makeItem({ id: 'a', stepType: 'simple' }),
      makeItem({ id: 'b', stepType: 'detailed' }),
    ] as never);

    await testSuiteService.addItemsMany([
      { suiteId: 'suite-1', title: 'A', steps: 's1', expectedResult: 'r1', stepType: 'simple', orderIndex: 0 },
      {
        suiteId: 'suite-1',
        title: 'B',
        steps: '',
        expectedResult: '',
        stepType: 'detailed',
        detailedSteps: [
          { action: 'step one', expectedResult: 'one' },
          { action: 'step two', expectedResult: ' two ' },
        ],
        orderIndex: 1,
      },
    ]);

    expect(testSuiteRepository.createItemsMany).toHaveBeenCalledTimes(1);
    expect(testSuiteRepository.createStepsMany).toHaveBeenCalledWith([
      { suiteItemId: 'b', stepNumber: 1, action: 'step one', expectedResult: 'one' },
      { suiteItemId: 'b', stepNumber: 2, action: 'step two', expectedResult: 'two' },
    ]);
  });

  it('skips createStepsMany when no input is detailed', async () => {
    vi.mocked(testSuiteRepository.createItemsMany).mockResolvedValue([makeItem({ id: 'a' })] as never);

    await testSuiteService.addItemsMany([
      { suiteId: 'suite-1', title: 'A', steps: 's1', expectedResult: 'r1', orderIndex: 0 },
    ]);

    expect(testSuiteRepository.createStepsMany).not.toHaveBeenCalled();
  });
});

describe('testSuiteService.listPaginated', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deduplicates owner ids before fetching profiles and falls back to em dash', async () => {
    vi.mocked(testSuiteRepository.findAllPaginated).mockResolvedValue({
      data: [
        { id: 's1', owner_id: 'u1', visibility: 'private', name: 'A', description: null, created_at: 'x', updated_at: 'x' },
        { id: 's2', owner_id: 'u1', visibility: 'public', name: 'B', description: null, created_at: 'x', updated_at: 'x' },
        { id: 's3', owner_id: null, visibility: 'private', name: 'C', description: null, created_at: 'x', updated_at: 'x' },
      ],
      total: 3,
    } as never);
    vi.mocked(profileRepository.findByIds).mockResolvedValue([
      { id: 'u1', username: 'alice', displayName: null },
    ] as never);

    const result = await testSuiteService.listPaginated({ page: 1, pageSize: 10 });

    expect(profileRepository.findByIds).toHaveBeenCalledWith(['u1']);
    expect(result.data[0]).toMatchObject({ _authorUsername: 'alice', _authorDisplayName: '—' });
    expect(result.data[1]).toMatchObject({ _authorUsername: 'alice' });
    expect(result.data[2]).toMatchObject({ _authorUsername: '—', _authorDisplayName: '—' });
    expect(result.total).toBe(3);
  });
});

describe('testSuiteService.getSuite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when the suite does not exist', async () => {
    vi.mocked(testSuiteRepository.findById).mockResolvedValue(null);
    expect(await testSuiteService.getSuite('missing')).toBeNull();
    expect(profileRepository.findById).not.toHaveBeenCalled();
  });

  it('resolves author info from the owner profile when ownerId exists', async () => {
    vi.mocked(testSuiteRepository.findById).mockResolvedValue({ id: 's1', ownerId: 'u1' } as never);
    vi.mocked(profileRepository.findById).mockResolvedValue({
      id: 'u1',
      username: 'alice',
      displayName: 'Alice',
    } as never);

    const suite = await testSuiteService.getSuite('s1');
    expect(suite?._authorUsername).toBe('alice');
    expect(suite?._authorDisplayName).toBe('Alice');
  });
});

describe('testSuiteService.getItemsWithSteps', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('groups steps per item so they are never mixed between items', async () => {
    vi.mocked(testSuiteRepository.findItemsBySuite).mockResolvedValue([
      makeItem({ id: 'a', stepType: 'simple' }),
      makeItem({ id: 'b', stepType: 'detailed' }),
    ]);
    vi.mocked(testSuiteRepository.findStepsByItems).mockResolvedValue([
      makeStep({ id: 's1', suiteItemId: 'b', action: 'B step 1' }),
      makeStep({ id: 's2', suiteItemId: 'b', action: 'B step 2' }),
    ]);

    const items = await testSuiteService.getItemsWithSteps('suite-1');

    expect(items[0].detailedSteps).toEqual([]);
    expect(items[1].detailedSteps.map((s) => s.action)).toEqual(['B step 1', 'B step 2']);
  });
});

describe('testSuiteService.duplicateSuite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects an empty name for the new suite', async () => {
    await expect(testSuiteService.duplicateSuite('s1', { name: ' ' })).rejects.toThrow(
      'Suite name cannot be empty',
    );
  });

  it('copies items with their detailed steps correctly grouped per source item', async () => {
    vi.mocked(testSuiteRepository.create).mockResolvedValue({ id: 'new-suite' } as never);
    vi.mocked(testSuiteRepository.findItemsBySuite).mockResolvedValue([
      makeItem({ id: 'item-simple', title: 'Simple', steps: 's', expectedResult: 'r', stepType: 'simple' }),
      makeItem({ id: 'item-detailed-a', title: 'Detailed A', stepType: 'detailed' }),
      makeItem({ id: 'item-detailed-b', title: 'Detailed B', stepType: 'detailed' }),
    ]);
    vi.mocked(testSuiteRepository.findStepsByItems).mockResolvedValue([
      makeStep({ id: 's1', suiteItemId: 'item-detailed-a', action: 'A step 1', expectedResult: null }),
      makeStep({ id: 's2', suiteItemId: 'item-detailed-b', action: 'B step 1', expectedResult: null }),
      makeStep({ id: 's3', suiteItemId: 'item-detailed-a', action: 'A step 2', expectedResult: null }),
    ]);
    const addItemsManySpy = vi.spyOn(testSuiteService, 'addItemsMany').mockResolvedValue([] as never);

    await testSuiteService.duplicateSuite('s1', { name: 'Copy' });

    expect(testSuiteRepository.findStepsByItems).toHaveBeenCalledWith(['item-detailed-a', 'item-detailed-b']);
    const inputs = addItemsManySpy.mock.calls[0][0];
    expect(inputs).toHaveLength(3);
    const [simple, detailedA, detailedB] = inputs;
    expect(simple).toMatchObject({ stepType: 'simple', detailedSteps: undefined });
    expect(detailedA).toMatchObject({ title: 'Detailed A', stepType: 'detailed' });
    expect(detailedA.detailedSteps).toEqual([
      { action: 'A step 1', expectedResult: undefined },
      { action: 'A step 2', expectedResult: undefined },
    ]);
    expect(detailedB.detailedSteps).toEqual([{ action: 'B step 1', expectedResult: undefined }]);
  });

  it('keeps the original orderIndex of each item', async () => {
    vi.mocked(testSuiteRepository.create).mockResolvedValue({ id: 'new-suite' } as never);
    vi.mocked(testSuiteRepository.findItemsBySuite).mockResolvedValue([
      makeItem({ id: 'a', title: 'A', steps: 's', expectedResult: 'r', orderIndex: 2 }),
      makeItem({ id: 'b', title: 'B', steps: 's', expectedResult: 'r', orderIndex: 5 }),
    ]);
    const addItemsManySpy = vi.spyOn(testSuiteService, 'addItemsMany').mockResolvedValue([] as never);

    await testSuiteService.duplicateSuite('s1', { name: 'Copy' });

    expect(addItemsManySpy.mock.calls[0][0].map((i: { orderIndex: number }) => i.orderIndex)).toEqual([2, 5]);
  });
});

describe('testSuiteService.cloneItemsToSuite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns early when no items are selected', async () => {
    await testSuiteService.cloneItemsToSuite('suite-1', []);
    expect(testSuiteRepository.findItemsBySuite).not.toHaveBeenCalled();
  });

  it('continues orderIndex from existing items length and carries detailed steps per item', async () => {
    vi.mocked(testSuiteRepository.findItemsBySuite).mockResolvedValue([
      makeItem({ id: 'existing', title: 'Existing', steps: 's', expectedResult: 'r', orderIndex: 0 }),
    ]);
    vi.mocked(testSuiteRepository.findItemsByIds).mockResolvedValue([
      makeItem({ id: 'x1', title: 'X1', steps: 's', expectedResult: 'r', orderIndex: 0, stepType: 'simple' }),
      makeItem({ id: 'x2', title: 'X2', stepType: 'detailed' }),
    ]);
    vi.mocked(testSuiteRepository.findStepsByItems).mockResolvedValue([
      makeStep({ id: 's1', suiteItemId: 'x2', action: 'X2 step', expectedResult: null }),
    ]);
    const addItemsManySpy = vi.spyOn(testSuiteService, 'addItemsMany').mockResolvedValue([] as never);

    await testSuiteService.cloneItemsToSuite('suite-1', ['x1', 'x2']);

    const inputs = addItemsManySpy.mock.calls[0][0];
    expect(inputs.map((i: { orderIndex: number }) => i.orderIndex)).toEqual([1, 2]);
    expect(inputs[0]).toMatchObject({ title: 'X1', stepType: 'simple', detailedSteps: undefined });
    expect(inputs[1].detailedSteps).toEqual([{ action: 'X2 step', expectedResult: undefined }]);
  });
});

describe('testSuiteService.cloneItemsToProject', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns early when no items are selected', async () => {
    await testSuiteService.cloneItemsToProject('proj-1', []);
    expect(testCaseRepository.createMany).not.toHaveBeenCalled();
  });

  it('resolves module/role by name case-insensitively and find-or-creates missing names', async () => {
    vi.mocked(testSuiteRepository.findItemsByIds).mockResolvedValue([
      makeItem({
        id: 'i1',
        title: 'T1',
        steps: 's',
        expectedResult: 'r',
        moduleName: 'Auth',
        targetRole: 'Admin',
        tagNames: ['smoke'],
      }),
      makeItem({ id: 'i2', title: 'T2', steps: 's', expectedResult: 'r', moduleName: 'auth', targetRole: null }),
    ]);
    vi.mocked(moduleService.listByProject).mockResolvedValue([
      { id: 'm1', name: 'Auth', projectId: 'proj-1' },
    ] as never);
    vi.mocked(moduleService.createMany).mockResolvedValue([] as never);
    vi.mocked(testRoleService.listByProject).mockResolvedValue([] as never);
    vi.mocked(testRoleService.createMany).mockResolvedValue([
      { id: 'r1', name: 'Admin', projectId: 'proj-1' },
    ] as never);
    vi.mocked(testCaseRepository.createMany).mockResolvedValue([
      { id: 'tc1', stepType: 'simple' },
      { id: 'tc2', stepType: 'simple' },
    ] as never);

    await testSuiteService.cloneItemsToProject('proj-1', ['i1', 'i2']);

    expect(moduleService.createMany).not.toHaveBeenCalled();
    expect(testRoleService.createMany).toHaveBeenCalledWith([{ projectId: 'proj-1', name: 'Admin' }]);

    expect(testCaseRepository.createMany).toHaveBeenCalledWith([
      expect.objectContaining({ title: 'T1', moduleId: 'm1', targetRoleId: 'r1' }),
      expect.objectContaining({ title: 'T2', moduleId: 'm1', targetRoleId: null }),
    ]);
    expect(tagService.saveTagsForTestCaseMany).toHaveBeenCalledWith('proj-1', [
      { testCaseId: 'tc1', tagNames: ['smoke'] },
      { testCaseId: 'tc2', tagNames: [] },
    ]);
  });

  it('creates new modules when names are not found, mapping them onto the new cases', async () => {
    vi.mocked(testSuiteRepository.findItemsByIds).mockResolvedValue([
      makeItem({ id: 'i1', title: 'T1', steps: 's', expectedResult: 'r', moduleName: 'Billing' }),
      makeItem({ id: 'i2', title: 'T2', steps: 's', expectedResult: 'r', moduleName: 'Billing' }),
    ]);
    vi.mocked(moduleService.listByProject).mockResolvedValue([] as never);
    vi.mocked(moduleService.createMany).mockResolvedValue([
      { id: 'm-new', name: 'Billing', projectId: 'proj-1' },
    ] as never);
    vi.mocked(testRoleService.listByProject).mockResolvedValue([] as never);
    vi.mocked(testCaseRepository.createMany).mockResolvedValue([
      { id: 'tc1', stepType: 'simple' },
      { id: 'tc2', stepType: 'simple' },
    ] as never);

    await testSuiteService.cloneItemsToProject('proj-1', ['i1', 'i2']);

    expect(moduleService.createMany).toHaveBeenCalledWith([{ projectId: 'proj-1', name: 'Billing' }]);
    expect(testCaseRepository.createMany).toHaveBeenCalledWith([
      expect.objectContaining({ title: 'T1', moduleId: 'm-new' }),
      expect.objectContaining({ title: 'T2', moduleId: 'm-new' }),
    ]);
  });

  it('batch-copies detailed steps only for detailed items', async () => {
    vi.mocked(testSuiteRepository.findItemsByIds).mockResolvedValue([
      makeItem({ id: 'i1', title: 'Simple', steps: 's', expectedResult: 'r', stepType: 'simple' }),
      makeItem({ id: 'i2', title: 'Detailed', stepType: 'detailed' }),
    ]);
    vi.mocked(moduleService.listByProject).mockResolvedValue([] as never);
    vi.mocked(testRoleService.listByProject).mockResolvedValue([] as never);
    vi.mocked(testCaseRepository.createMany).mockResolvedValue([
      { id: 'tc1', stepType: 'simple' },
      { id: 'tc2', stepType: 'detailed' },
    ] as never);
    vi.mocked(testSuiteRepository.findStepsByItems).mockResolvedValue([
      makeStep({ id: 's1', suiteItemId: 'i2', action: 'Step A', expectedResult: 'expected A' }),
      makeStep({ id: 's2', suiteItemId: 'i2', action: 'Step B', expectedResult: null }),
    ]);

    await testSuiteService.cloneItemsToProject('proj-1', ['i1', 'i2']);

    expect(testSuiteRepository.findStepsByItems).toHaveBeenCalledWith(['i2']);
    expect(testCaseStepRepository.createMany).toHaveBeenCalledWith([
      { testCaseId: 'tc2', stepNumber: 1, action: 'Step A', expectedResult: 'expected A' },
      { testCaseId: 'tc2', stepNumber: 2, action: 'Step B', expectedResult: null },
    ]);
  });
});

describe('testSuiteService.cloneProjectCasesToSuite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns early when no test cases are selected', async () => {
    await testSuiteService.cloneProjectCasesToSuite('suite-1', []);
    expect(testCaseRepository.findByIdsWithDetails).not.toHaveBeenCalled();
  });

  it('maps test case details into suite items continuing the existing order', async () => {
    vi.mocked(testCaseRepository.findByIdsWithDetails).mockResolvedValue([
      {
        id: 'tc1',
        title: 'Case one',
        steps: 's',
        expectedResult: 'r',
        stepType: 'simple',
        module: { name: 'Auth' },
        targetRole: { name: 'Admin' },
        tags: [{ name: 'smoke' }],
      },
      {
        id: 'tc2',
        title: 'Case two',
        stepType: 'detailed',
        module: null,
        targetRole: null,
        tags: [],
      },
    ] as never);
    vi.mocked(testSuiteRepository.findItemsBySuite).mockResolvedValue([
      makeItem({ id: 'existing', title: 'Existing', steps: 's', expectedResult: 'r', orderIndex: 0 }),
    ]);
    vi.mocked(testCaseStepRepository.findAllByTestCases).mockResolvedValue([
      { id: 's1', testCaseId: 'tc2', action: 'Detail step', expectedResult: 'detail result' },
    ] as never);
    const addItemsManySpy = vi.spyOn(testSuiteService, 'addItemsMany').mockResolvedValue([] as never);

    await testSuiteService.cloneProjectCasesToSuite('suite-1', ['tc1', 'tc2']);

    const inputs = addItemsManySpy.mock.calls[0][0];
    expect(inputs.map((i: { orderIndex: number }) => i.orderIndex)).toEqual([1, 2]);
    expect(inputs[0]).toMatchObject({
      title: 'Case one',
      moduleName: 'Auth',
      targetRole: 'Admin',
      tagNames: ['smoke'],
      stepType: 'simple',
    });
    expect(inputs[1].detailedSteps).toEqual([{ action: 'Detail step', expectedResult: 'detail result' }]);
  });

  it('groups multiple steps per detailed case and tolerates a detailed case with no steps', async () => {
    vi.mocked(testCaseRepository.findByIdsWithDetails).mockResolvedValue([
      {
        id: 'tc-a',
        title: 'Case A',
        stepType: 'detailed',
        module: null,
        targetRole: null,
        tags: [],
      },
      {
        id: 'tc-b',
        title: 'Case B',
        stepType: 'detailed',
        module: null,
        targetRole: null,
        tags: [],
      },
    ] as never);
    vi.mocked(testSuiteRepository.findItemsBySuite).mockResolvedValue([]);
    // Only tc-a has steps; tc-b has none so the per-item lookup falls back to [].
    vi.mocked(testCaseStepRepository.findAllByTestCases).mockResolvedValue([
      { id: 's1', testCaseId: 'tc-a', action: 'Open', expectedResult: 'Shown' },
      { id: 's2', testCaseId: 'tc-a', action: 'Submit', expectedResult: 'Saved' },
    ] as never);
    const addItemsManySpy = vi.spyOn(testSuiteService, 'addItemsMany').mockResolvedValue([] as never);

    await testSuiteService.cloneProjectCasesToSuite('suite-1', ['tc-a', 'tc-b']);

    const inputs = addItemsManySpy.mock.calls[0][0];
    expect(inputs[0].detailedSteps).toEqual([
      { action: 'Open', expectedResult: 'Shown' },
      { action: 'Submit', expectedResult: 'Saved' },
    ]);
    expect(inputs[1].detailedSteps).toEqual([]);
  });
});
