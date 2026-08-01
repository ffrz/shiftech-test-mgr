import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('../repositories/testRunRepository', () => ({
  testRunRepository: {
    findAllByPlan: vi.fn(),
    findAllByPlanPaginated: vi.fn(),
    findAllByProject: vi.fn(),
    create: vi.fn(),
    findById: vi.fn(),
    update: vi.fn(),
    updateStatus: vi.fn(),
    remove: vi.fn(),
  },
}));
vi.mock('../repositories/testResultRepository', () => ({
  testResultRepository: {
    seedForRun: vi.fn(),
    getSummaryByRunIds: vi.fn(),
    getDistinctTestersByRunIds: vi.fn(),
    findAllByRun: vi.fn(),
    recordResult: vi.fn(),
    recordStepResult: vi.fn(),
    syncWithTestCase: vi.fn(),
  },
}));
vi.mock('../repositories/testCaseRepository', () => ({
  testCaseRepository: { findCasesForPlan: vi.fn() },
}));
vi.mock('../repositories/testPlanRepository', () => ({
  testPlanRepository: { findById: vi.fn() },
}));
vi.mock('./activityService', () => ({
  activityService: { logEvent: vi.fn() },
}));

const { testRunRepository } = await import('../repositories/testRunRepository');
const { testResultRepository } = await import('../repositories/testResultRepository');
const { testCaseRepository } = await import('../repositories/testCaseRepository');
const { testPlanRepository } = await import('../repositories/testPlanRepository');
const { activityService } = await import('./activityService');
const { testRunService } = await import('./testRunService');

beforeEach(() => {
  vi.clearAllMocks();
});

describe('testRunService passthrough reads', () => {
  it('delegates listByPlan', async () => {
    vi.mocked(testRunRepository.findAllByPlan).mockResolvedValue([{ id: 'run-1' } as never]);
    const result = await testRunService.listByPlan('plan-1');
    expect(testRunRepository.findAllByPlan).toHaveBeenCalledWith('plan-1');
    expect(result).toHaveLength(1);
  });

  it('delegates listByProject with options', async () => {
    vi.mocked(testRunRepository.findAllByProject).mockResolvedValue([{ id: 'run-1' } as never]);
    const options = { search: 'reg', statuses: ['completed'] as never };
    const result = await testRunService.listByProject('proj-1', options);
    expect(testRunRepository.findAllByProject).toHaveBeenCalledWith('proj-1', options);
    expect(result).toHaveLength(1);
  });

  it('delegates getById', async () => {
    vi.mocked(testRunRepository.findById).mockResolvedValue({ id: 'run-1' } as never);
    const result = await testRunService.getById('run-1');
    expect(testRunRepository.findById).toHaveBeenCalledWith('run-1');
    expect(result?.id).toBe('run-1');
  });

  it('delegates remove', async () => {
    vi.mocked(testRunRepository.remove).mockResolvedValue(undefined);
    await testRunService.remove('run-1');
    expect(testRunRepository.remove).toHaveBeenCalledWith('run-1');
  });

  it('delegates recordResult', async () => {
    vi.mocked(testResultRepository.recordResult).mockResolvedValue({ id: 'res-1' } as never);
    const result = await testRunService.recordResult('res-1', 'u-1', 'pass', 'note');
    expect(testResultRepository.recordResult).toHaveBeenCalledWith('res-1', {
      status: 'pass',
      testerId: 'u-1',
      notes: 'note',
    });
    expect(result).toBeDefined();
  });

  it('delegates recordStepResult', async () => {
    vi.mocked(testResultRepository.recordStepResult).mockResolvedValue({ id: 'rs-1' } as never);
    const result = await testRunService.recordStepResult('rs-1', 'fail', 'actual');
    expect(testResultRepository.recordStepResult).toHaveBeenCalledWith('rs-1', {
      status: 'fail',
      actualResult: 'actual',
    });
    expect(result).toBeDefined();
  });
});

describe('testRunService summaries', () => {
  it('merges summary + testers into listByProjectWithSummary', async () => {
    vi.mocked(testRunRepository.findAllByProject).mockResolvedValue([
      { id: 'run-1' },
      { id: 'run-2' },
    ] as never);
    vi.mocked(testResultRepository.getSummaryByRunIds).mockResolvedValue({
      'run-1': { total: 3, pass: 2, fail: 1 },
    } as never);
    vi.mocked(testResultRepository.getDistinctTestersByRunIds).mockResolvedValue({
      'run-1': ['u-1'],
    } as never);

    const result = await testRunService.listByProjectWithSummary('proj-1');

    expect(result[0]).toEqual({ id: 'run-1', total: 3, pass: 2, fail: 1, testers: ['u-1'] });
    expect(result[1]).toEqual({ id: 'run-2', total: 0, pass: 0, fail: 0, testers: [] });
  });

  it('merges summary + testers into listByPlanWithSummary', async () => {
    vi.mocked(testRunRepository.findAllByPlan).mockResolvedValue([{ id: 'run-1' }] as never);
    vi.mocked(testResultRepository.getSummaryByRunIds).mockResolvedValue({
      'run-1': { total: 5, pass: 5, fail: 0 },
    } as never);
    vi.mocked(testResultRepository.getDistinctTestersByRunIds).mockResolvedValue({
      'run-1': ['u-1', 'u-2'],
    } as never);

    const result = await testRunService.listByPlanWithSummary('plan-1');

    expect(result[0]).toEqual({ id: 'run-1', total: 5, pass: 5, fail: 0, testers: ['u-1', 'u-2'] });
  });

  it('falls back to zeroed summary and empty testers for runs missing from the maps', async () => {
    vi.mocked(testRunRepository.findAllByPlan).mockResolvedValue([{ id: 'run-x' }] as never);
    vi.mocked(testResultRepository.getSummaryByRunIds).mockResolvedValue({} as never);
    vi.mocked(testResultRepository.getDistinctTestersByRunIds).mockResolvedValue({} as never);

    const result = await testRunService.listByPlanWithSummary('plan-1');

    expect(result[0]).toEqual({ id: 'run-x', total: 0, pass: 0, fail: 0, testers: [] });
  });

  it('merges summary + testers into listByPlanWithSummaryPaginated and keeps total', async () => {
    vi.mocked(testRunRepository.findAllByPlanPaginated).mockResolvedValue({
      data: [{ id: 'run-1' }],
      total: 1,
    } as never);
    vi.mocked(testResultRepository.getSummaryByRunIds).mockResolvedValue({} as never);
    vi.mocked(testResultRepository.getDistinctTestersByRunIds).mockResolvedValue({} as never);

    const result = await testRunService.listByPlanWithSummaryPaginated('plan-1', {
      search: '',
      statuses: [],
      page: 1,
      rowsPerPage: 10,
    });

    expect(testRunRepository.findAllByPlanPaginated).toHaveBeenCalledWith('plan-1', {
      search: '',
      statuses: [],
      page: 1,
      rowsPerPage: 10,
    });
    expect(result.total).toBe(1);
    expect(result.data[0]).toEqual({ id: 'run-1', total: 0, pass: 0, fail: 0, testers: [] });
  });
});

describe('testRunService.start', () => {
  it('rejects an empty run name', async () => {
    await expect(testRunService.start('plan-1', '   ')).rejects.toThrow('Test run name cannot be empty');
    expect(testPlanRepository.findById).not.toHaveBeenCalled();
  });

  it('rejects starting a run when the plan is missing', async () => {
    vi.mocked(testPlanRepository.findById).mockResolvedValue(null);
    await expect(testRunService.start('plan-1', 'Regression')).rejects.toThrow('Test plan not found');
  });

  it('rejects starting a run when the plan has no test cases', async () => {
    vi.mocked(testPlanRepository.findById).mockResolvedValue({ id: 'plan-1', projectId: 'proj-1' } as never);
    vi.mocked(testCaseRepository.findCasesForPlan).mockResolvedValue([]);

    await expect(testRunService.start('plan-1', 'Regression')).rejects.toThrow(
      'This test plan has no test cases yet — add test cases before starting a run',
    );
    expect(testRunRepository.create).not.toHaveBeenCalled();
  });

  it('creates the run and seeds results for every case in the plan scope', async () => {
    vi.mocked(testPlanRepository.findById).mockResolvedValue({ id: 'plan-1', projectId: 'proj-1' } as never);
    vi.mocked(testCaseRepository.findCasesForPlan).mockResolvedValue([
      { testCaseId: 'tc-1' },
      { testCaseId: 'tc-2' },
    ] as never);
    vi.mocked(testRunRepository.create).mockResolvedValue({ id: 'run-1' } as never);

    const run = await testRunService.start('plan-1', '  Regression  ', 'RT-1', 'u-1');

    expect(testRunRepository.create).toHaveBeenCalledWith({
      projectId: 'proj-1',
      testPlanId: 'plan-1',
      name: 'Regression',
      code: 'RT-1',
      startedBy: 'u-1',
    });
    expect(testResultRepository.seedForRun).toHaveBeenCalledWith('run-1', ['tc-1', 'tc-2']);
    expect(run.id).toBe('run-1');
  });

  it('defaults code and startedBy to null when omitted', async () => {
    vi.mocked(testPlanRepository.findById).mockResolvedValue({ id: 'plan-1', projectId: 'proj-1' } as never);
    vi.mocked(testCaseRepository.findCasesForPlan).mockResolvedValue([{ testCaseId: 'tc-1' }] as never);
    vi.mocked(testRunRepository.create).mockResolvedValue({ id: 'run-2' } as never);

    await testRunService.start('plan-1', 'Regression');

    expect(testRunRepository.create).toHaveBeenCalledWith({
      projectId: 'proj-1',
      testPlanId: 'plan-1',
      name: 'Regression',
      code: null,
      startedBy: null,
    });
  });
});

describe('testRunService.startCustom', () => {
  it('rejects an empty run name', async () => {
    await expect(testRunService.startCustom('proj-1', '   ', ['tc-1'])).rejects.toThrow(
      'Test run name cannot be empty',
    );
  });

  it('rejects when no test cases are selected', async () => {
    await expect(testRunService.startCustom('proj-1', 'Custom', [])).rejects.toThrow(
      'Select at least one test case for this test run',
    );
  });

  it('creates an unplanned run (testPlanId null) and seeds the chosen cases', async () => {
    vi.mocked(testRunRepository.create).mockResolvedValue({ id: 'run-c' } as never);

    const run = await testRunService.startCustom('proj-1', '  Custom  ', ['tc-1', 'tc-2'], 'RC-1', 'u-1');

    expect(testRunRepository.create).toHaveBeenCalledWith({
      projectId: 'proj-1',
      testPlanId: null,
      name: 'Custom',
      code: 'RC-1',
      startedBy: 'u-1',
    });
    expect(testResultRepository.seedForRun).toHaveBeenCalledWith('run-c', ['tc-1', 'tc-2']);
    expect(run.id).toBe('run-c');
  });

  it('defaults code and startedBy to null when omitted', async () => {
    vi.mocked(testRunRepository.create).mockResolvedValue({ id: 'run-c2' } as never);

    await testRunService.startCustom('proj-1', 'Custom', ['tc-1']);

    expect(testRunRepository.create).toHaveBeenCalledWith({
      projectId: 'proj-1',
      testPlanId: null,
      name: 'Custom',
      code: null,
      startedBy: null,
    });
  });
});

describe('testRunService.rename', () => {
  it('rejects an empty name', () => {
    expect(() => testRunService.rename('run-1', { name: '  ', code: 'RT-1' })).toThrow(
      'Test run name cannot be empty',
    );
  });

  it('rejects an empty code', () => {
    expect(() => testRunService.rename('run-1', { name: 'Run', code: '  ' })).toThrow(
      'Test run code cannot be empty',
    );
  });

  it('trims and delegates to the repository', async () => {
    vi.mocked(testRunRepository.update).mockResolvedValue({ id: 'run-1' } as never);

    const result = await testRunService.rename('run-1', { name: '  Run A  ', code: '  RT-2  ' });

    expect(testRunRepository.update).toHaveBeenCalledWith('run-1', { name: 'Run A', code: 'RT-2' });
    expect(result).toBeDefined();
  });
});

describe('testRunService.complete / reopen', () => {
  it('completes the run and logs a status_change event', async () => {
    vi.mocked(testRunRepository.updateStatus).mockResolvedValue({ id: 'run-1', status: 'completed' } as never);

    const result = await testRunService.complete('run-1', { projectId: 'proj-1', actorId: 'u-1' }, 'all done');

    expect(testRunRepository.updateStatus).toHaveBeenCalledWith('run-1', 'completed', 'all done');
    expect(activityService.logEvent).toHaveBeenCalledWith({
      projectId: 'proj-1',
      entityType: 'test_run',
      entityId: 'run-1',
      actorId: 'u-1',
      eventType: 'status_change',
      payload: { from: 'in_progress', to: 'completed' },
    });
    expect(result.status).toBe('completed');
  });

  it('reopens the run and logs a status_change event', async () => {
    vi.mocked(testRunRepository.updateStatus).mockResolvedValue({ id: 'run-1', status: 'in_progress' } as never);

    const result = await testRunService.reopen('run-1', { projectId: 'proj-1', actorId: 'u-1' });

    expect(testRunRepository.updateStatus).toHaveBeenCalledWith('run-1', 'in_progress');
    expect(activityService.logEvent).toHaveBeenCalledWith({
      projectId: 'proj-1',
      entityType: 'test_run',
      entityId: 'run-1',
      actorId: 'u-1',
      eventType: 'status_change',
      payload: { from: 'completed', to: 'in_progress' },
    });
    expect(result.status).toBe('in_progress');
  });
});

describe('testRunService.getWithResults', () => {
  it('derives summary counts and progress percent from results, never storing them', async () => {
    vi.mocked(testResultRepository.findAllByRun).mockResolvedValue([
      { status: 'pass' },
      { status: 'pass' },
      { status: 'fail' },
      { status: 'skip' },
      { status: 'blocked' },
      { status: 'not_run' },
    ] as never);

    const { summary } = await testRunService.getWithResults('run-1');

    expect(summary).toEqual({
      total: 6,
      executed: 5,
      progressPercent: 83,
      pass: 2,
      fail: 1,
      skip: 1,
      blocked: 1,
      notRun: 1,
    });
  });

  it('reports zero progress for a run with no results', async () => {
    vi.mocked(testResultRepository.findAllByRun).mockResolvedValue([]);

    const { summary } = await testRunService.getWithResults('run-1');

    expect(summary.progressPercent).toBe(0);
    expect(summary.total).toBe(0);
  });
});

describe('testRunService.syncResultWithTestCase', () => {
  it('refuses to sync once the run is completed', async () => {
    vi.mocked(testRunRepository.findById).mockResolvedValue({ id: 'run-1', status: 'completed' } as never);

    await expect(testRunService.syncResultWithTestCase('run-1', 'result-1')).rejects.toThrow(
      'This test run is already completed — reopen it to sync',
    );
    expect(testResultRepository.syncWithTestCase).not.toHaveBeenCalled();
  });

  it('syncs when the run is still in progress', async () => {
    vi.mocked(testRunRepository.findById).mockResolvedValue({ id: 'run-1', status: 'in_progress' } as never);

    await testRunService.syncResultWithTestCase('run-1', 'result-1');

    expect(testResultRepository.syncWithTestCase).toHaveBeenCalledWith('result-1');
  });
});
