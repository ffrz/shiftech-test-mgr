import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../repositories/testPlanRepository', () => ({
  testPlanRepository: {
    findAllByProject: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
}));
vi.mock('../repositories/testCaseRepository', () => ({
  testCaseRepository: {
    findCasesForPlan: vi.fn(),
    findCasesForPlanPaginated: vi.fn(),
    attachToPlanMany: vi.fn(),
    attachToPlan: vi.fn(),
    detachFromPlan: vi.fn(),
    swapCaseOrder: vi.fn(),
    findAdjacentPlanCase: vi.fn(),
  },
}));
vi.mock('./activityService', () => ({
  activityService: { logEvent: vi.fn() },
}));

const { testPlanRepository } = await import('../repositories/testPlanRepository');
const { testCaseRepository } = await import('../repositories/testCaseRepository');
const { activityService } = await import('./activityService');
const { testPlanService } = await import('./testPlanService');

beforeEach(() => {
  vi.clearAllMocks();
});

describe('testPlanService passthrough reads and case-scope ops', () => {
  it('delegates listByProject with options', async () => {
    vi.mocked(testPlanRepository.findAllByProject).mockResolvedValue([{ id: 'plan-1' } as never]);
    const options = { search: 'rel', statuses: ['active'] as never };
    const result = await testPlanService.listByProject('proj-1', options);
    expect(testPlanRepository.findAllByProject).toHaveBeenCalledWith('proj-1', options);
    expect(result).toHaveLength(1);
  });

  it('delegates getById', async () => {
    vi.mocked(testPlanRepository.findById).mockResolvedValue({ id: 'plan-1' } as never);
    const result = await testPlanService.getById('plan-1');
    expect(testPlanRepository.findById).toHaveBeenCalledWith('plan-1');
    expect(result?.id).toBe('plan-1');
  });

  it('delegates remove', async () => {
    vi.mocked(testPlanRepository.remove).mockResolvedValue(undefined);
    await testPlanService.remove('plan-1');
    expect(testPlanRepository.remove).toHaveBeenCalledWith('plan-1');
  });

  it('delegates listCases', async () => {
    vi.mocked(testCaseRepository.findCasesForPlan).mockResolvedValue([{ id: 'pc1' } as never]);
    const result = await testPlanService.listCases('plan-1');
    expect(testCaseRepository.findCasesForPlan).toHaveBeenCalledWith('plan-1');
    expect(result).toHaveLength(1);
  });

  it('delegates listCasesPaginated', async () => {
    vi.mocked(testCaseRepository.findCasesForPlanPaginated).mockResolvedValue({
      data: [],
      total: 0,
    } as never);
    const options = { page: 1, rowsPerPage: 10 };
    await testPlanService.listCasesPaginated('plan-1', options);
    expect(testCaseRepository.findCasesForPlanPaginated).toHaveBeenCalledWith('plan-1', options);
  });

  it('delegates addCasesMany', async () => {
    vi.mocked(testCaseRepository.attachToPlanMany).mockResolvedValue([{ id: 'pc1' } as never]);
    const inputs = [{ testPlanId: 'plan-1', testCaseId: 'tc-1', order: 0 }];
    await testPlanService.addCasesMany(inputs);
    expect(testCaseRepository.attachToPlanMany).toHaveBeenCalledWith(inputs);
  });

  it('delegates addCase', async () => {
    vi.mocked(testCaseRepository.attachToPlan).mockResolvedValue({ id: 'pc1' } as never);
    await testPlanService.addCase('plan-1', 'tc-1', 5);
    expect(testCaseRepository.attachToPlan).toHaveBeenCalledWith('plan-1', 'tc-1', 5);
  });

  it('delegates removeCase', async () => {
    vi.mocked(testCaseRepository.detachFromPlan).mockResolvedValue(undefined);
    await testPlanService.removeCase('pc1');
    expect(testCaseRepository.detachFromPlan).toHaveBeenCalledWith('pc1');
  });

  it('delegates swapCaseOrder', async () => {
    vi.mocked(testCaseRepository.swapCaseOrder).mockResolvedValue(undefined);
    await testPlanService.swapCaseOrder({ id: 'a', order: 0 }, { id: 'b', order: 1 });
    expect(testCaseRepository.swapCaseOrder).toHaveBeenCalledWith('a', 0, 'b', 1);
  });

  it('delegates findAdjacentCase', async () => {
    vi.mocked(testCaseRepository.findAdjacentPlanCase).mockResolvedValue({ id: 'pc2' } as never);
    const result = await testPlanService.findAdjacentCase('plan-1', 3, 'after');
    expect(testCaseRepository.findAdjacentPlanCase).toHaveBeenCalledWith('plan-1', 3, 'after');
    expect(result?.id).toBe('pc2');
  });
});

describe('testPlanService.rename', () => {
  it('rejects an empty name', () => {
    expect(() => testPlanService.rename('plan-1', '   ')).toThrow('Test plan name cannot be empty');
  });

  it('trims and delegates to the repository', async () => {
    vi.mocked(testPlanRepository.update).mockResolvedValue({ id: 'plan-1' } as never);
    const result = await testPlanService.rename('plan-1', '  New Name  ');
    expect(testPlanRepository.update).toHaveBeenCalledWith('plan-1', { name: 'New Name' });
    expect(result).toBeDefined();
  });
});

describe('testPlanService.update', () => {
  it('rejects an empty name', () => {
    expect(() => testPlanService.update('plan-1', { name: '  ' })).toThrow('Test plan name cannot be empty');
  });

  it('trims name/description and only includes code/status when provided', async () => {
    vi.mocked(testPlanRepository.update).mockResolvedValue({ id: 'plan-1' } as never);

    await testPlanService.update('plan-1', { name: '  R1  ', description: '  desc  ' });

    expect(testPlanRepository.update).toHaveBeenCalledWith('plan-1', {
      name: 'R1',
      description: 'desc',
    });
  });

  it('includes code and status when provided', async () => {
    vi.mocked(testPlanRepository.update).mockResolvedValue({ id: 'plan-1' } as never);

    await testPlanService.update('plan-1', { name: 'R1', code: '  RC-2  ', status: 'completed' });

    expect(testPlanRepository.update).toHaveBeenCalledWith('plan-1', {
      name: 'R1',
      description: null,
      code: 'RC-2',
      status: 'completed',
    });
  });
});

describe('testPlanService.create', () => {
  it('rejects an empty plan name', async () => {
    await expect(testPlanService.create({ projectId: 'proj-1', name: '   ' })).rejects.toThrow(
      'Test plan name cannot be empty',
    );
    expect(testPlanRepository.create).not.toHaveBeenCalled();
  });

  it('trims name/description/code before delegating', async () => {
    vi.mocked(testPlanRepository.create).mockResolvedValue({ id: 'plan-1' } as never);

    await testPlanService.create({ projectId: 'proj-1', name: '  Release 1  ', description: '  desc  ', code: '  R1  ' });

    expect(testPlanRepository.create).toHaveBeenCalledWith({
      projectId: 'proj-1',
      name: 'Release 1',
      description: 'desc',
      code: 'R1',
      createdBy: null,
    });
  });

  it('defaults description and code to null when omitted or blank', async () => {
    vi.mocked(testPlanRepository.create).mockResolvedValue({ id: 'plan-1' } as never);

    await testPlanService.create({ projectId: 'proj-1', name: 'Release 1' });

    expect(testPlanRepository.create).toHaveBeenCalledWith({
      projectId: 'proj-1',
      name: 'Release 1',
      description: null,
      code: null,
      createdBy: null,
    });
  });
});

describe('testPlanService.changeStatus', () => {
  it('logs activity when the status actually changes', async () => {
    vi.mocked(testPlanRepository.findById).mockResolvedValue({
      id: 'plan-1',
      projectId: 'proj-1',
      status: 'draft',
    } as never);
    vi.mocked(testPlanRepository.update).mockResolvedValue({ id: 'plan-1', status: 'active' } as never);

    await testPlanService.changeStatus('plan-1', 'active', { projectId: 'proj-1', actorId: 'user-a' });

    expect(activityService.logEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'test_plan',
        entityId: 'plan-1',
        eventType: 'status_change',
        payload: { from: 'draft', to: 'active' },
      }),
    );
  });

  it('does not log activity when the status is unchanged', async () => {
    vi.mocked(testPlanRepository.findById).mockResolvedValue({
      id: 'plan-1',
      projectId: 'proj-1',
      status: 'active',
    } as never);
    vi.mocked(testPlanRepository.update).mockResolvedValue({ id: 'plan-1', status: 'active' } as never);

    await testPlanService.changeStatus('plan-1', 'active', { projectId: 'proj-1', actorId: 'user-a' });

    expect(activityService.logEvent).not.toHaveBeenCalled();
  });

  it('does not log activity when the previous plan is missing', async () => {
    vi.mocked(testPlanRepository.findById).mockResolvedValue(null);
    vi.mocked(testPlanRepository.update).mockResolvedValue({ id: 'plan-1', status: 'active' } as never);

    await testPlanService.changeStatus('plan-1', 'active', { projectId: 'proj-1', actorId: 'user-a' });

    expect(activityService.logEvent).not.toHaveBeenCalled();
  });
});

describe('testPlanService.duplicate', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('throws when the source plan is not found', async () => {
    vi.mocked(testPlanRepository.findById).mockResolvedValue(null);

    await expect(testPlanService.duplicate('missing', 'Copy')).rejects.toThrow('Source test plan not found');
  });

  it('re-attaches the same test case ids sequentially with preserved order index', async () => {
    vi.mocked(testPlanRepository.findById).mockResolvedValue({
      id: 'plan-1',
      projectId: 'proj-1',
      name: 'Source',
    } as never);
    vi.mocked(testCaseRepository.findCasesForPlan).mockResolvedValue([
      { id: 'pc1', testCaseId: 'tc-a', order: 0 },
      { id: 'pc2', testCaseId: 'tc-b', order: 1 },
      { id: 'pc3', testCaseId: 'tc-c', order: 2 },
    ] as never);

    const createSpy = vi.spyOn(testPlanService, 'create').mockResolvedValue({ id: 'new-plan' } as never);
    const addCaseSpy = vi.spyOn(testPlanService, 'addCase').mockResolvedValue(undefined as never);

    await testPlanService.duplicate('plan-1', 'Copy');

    expect(createSpy).toHaveBeenCalledWith({ projectId: 'proj-1', name: 'Copy' });
    expect(addCaseSpy.mock.calls.length).toBe(3);
    expect(addCaseSpy.mock.calls.map((call) => call[0])).toEqual(['new-plan', 'new-plan', 'new-plan']);
    expect(addCaseSpy.mock.calls.map((call) => call[1])).toEqual(['tc-a', 'tc-b', 'tc-c']);
    expect(addCaseSpy.mock.calls.map((call) => call[2])).toEqual([0, 1, 2]);
  });
});

describe('testPlanService.bulkChangeStatus', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('processes every id sequentially through changeStatus', async () => {
    const callLog: string[] = [];
    vi.spyOn(testPlanService, 'changeStatus').mockImplementation(async (id: string) => {
      callLog.push(`start:${id}`);
      await new Promise((resolve) => setTimeout(resolve, 3));
      callLog.push(`end:${id}`);
      return { id } as never;
    });

    await testPlanService.bulkChangeStatus(['a', 'b'], 'active', { projectId: 'proj-1', actorId: 'user-a' });

    expect(callLog).toEqual(['start:a', 'end:a', 'start:b', 'end:b']);
  });
});
