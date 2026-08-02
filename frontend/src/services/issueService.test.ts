import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import type { Issue, IssueWithDetails } from '../types/domain';

vi.mock('../repositories/issueRepository', () => ({
  issueRepository: {
    findById: vi.fn(),
    create: vi.fn(),
    createMany: vi.fn(),
    update: vi.fn(),
    updateStatus: vi.fn(),
    assign: vi.fn(),
    linkToTestResult: vi.fn(),
    unlinkFromTestResult: vi.fn(),
    remove: vi.fn(),
    findAttachments: vi.fn(),
    removeAttachment: vi.fn(),
    findAllByProject: vi.fn(),
    findAllByProjectPaginated: vi.fn(),
    findAllByTestRun: vi.fn(),
    findAllByTestResult: vi.fn(),
  },
}));
vi.mock('./tagService', () => ({
  tagService: {
    saveTagsForIssue: vi.fn(),
    saveTagsForIssueMany: vi.fn(),
  },
}));
vi.mock('./activityService', () => ({
  activityService: { logEvent: vi.fn() },
}));
vi.mock('./notificationService', () => ({
  notificationService: { create: vi.fn() },
}));

const { issueRepository } = await import('../repositories/issueRepository');
const { tagService } = await import('./tagService');
const { activityService } = await import('./activityService');
const { notificationService } = await import('./notificationService');
const { issueService } = await import('./issueService');

function makeIssue(overrides: Partial<Issue> = {}): IssueWithDetails {
  return {
    id: 'issue-1',
    code: 'ISS-1',
    projectId: 'proj-1',
    moduleId: null,
    type: 'bug',
    title: 'Login fails',
    description: null,
    actualResult: null,
    expectedResult: null,
    priority: 'medium',
    status: 'open',
    assignedTo: null,
    targetRoleId: null,
    externalLinks: [],
    createdBy: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    assignee: null,
    module: null,
    targetRole: null,
    tags: [],
    linkedTestResults: [],
    ...overrides,
  } as IssueWithDetails;
}

describe('issueService passthrough reads', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('delegates getById', async () => {
    vi.mocked(issueRepository.findById).mockResolvedValue(makeIssue());
    const result = await issueService.getById('issue-1');
    expect(issueRepository.findById).toHaveBeenCalledWith('issue-1');
    expect(result?.id).toBe('issue-1');
  });

  it('delegates listByProject with options', async () => {
    vi.mocked(issueRepository.findAllByProject).mockResolvedValue([makeIssue()]);
    const options = { search: 'login', statuses: ['open'] as Issue['status'][] };
    const result = await issueService.listByProject('proj-1', options);
    expect(issueRepository.findAllByProject).toHaveBeenCalledWith('proj-1', options);
    expect(result).toHaveLength(1);
  });

  it('delegates listByProjectPaginated with options', async () => {
    vi.mocked(issueRepository.findAllByProjectPaginated).mockResolvedValue({ data: [makeIssue()], total: 1 });
    const options = {
      page: 1,
      pageSize: 10,
      sortField: 'created_at',
      sortOrder: 'desc' as const,
    };
    const result = await issueService.listByProjectPaginated('proj-1', options);
    expect(issueRepository.findAllByProjectPaginated).toHaveBeenCalledWith('proj-1', options);
    expect(result.total).toBe(1);
  });

  it('delegates listByTestRun', async () => {
    vi.mocked(issueRepository.findAllByTestRun).mockResolvedValue([makeIssue()]);
    const result = await issueService.listByTestRun('run-1');
    expect(issueRepository.findAllByTestRun).toHaveBeenCalledWith('run-1');
    expect(result).toHaveLength(1);
  });

  it('delegates listByTestResult', async () => {
    vi.mocked(issueRepository.findAllByTestResult).mockResolvedValue([makeIssue()]);
    const result = await issueService.listByTestResult('result-1');
    expect(issueRepository.findAllByTestResult).toHaveBeenCalledWith('result-1');
    expect(result).toHaveLength(1);
  });
});

describe('issueService repository-bound helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('delegates remove', async () => {
    vi.mocked(issueRepository.remove).mockResolvedValue(undefined);
    await issueService.remove('issue-1');
    expect(issueRepository.remove).toHaveBeenCalledWith('issue-1');
  });

  it('delegates linkToTestResult', async () => {
    vi.mocked(issueRepository.linkToTestResult).mockResolvedValue(undefined);
    await issueService.linkToTestResult('issue-1', 'result-1');
    expect(issueRepository.linkToTestResult).toHaveBeenCalledWith('issue-1', 'result-1');
  });

  it('delegates unlinkFromTestResult', async () => {
    vi.mocked(issueRepository.unlinkFromTestResult).mockResolvedValue(undefined);
    await issueService.unlinkFromTestResult('issue-1', 'result-1');
    expect(issueRepository.unlinkFromTestResult).toHaveBeenCalledWith('issue-1', 'result-1');
  });

  it('delegates listAttachments', async () => {
    vi.mocked(issueRepository.findAttachments).mockResolvedValue([{ id: 'att-1' } as never]);
    const result = await issueService.listAttachments('issue-1');
    expect(issueRepository.findAttachments).toHaveBeenCalledWith('issue-1');
    expect(result).toHaveLength(1);
  });

  it('delegates removeAttachment', async () => {
    vi.mocked(issueRepository.removeAttachment).mockResolvedValue(undefined);
    await issueService.removeAttachment('att-1');
    expect(issueRepository.removeAttachment).toHaveBeenCalledWith('att-1');
  });
});

describe('issueService.create', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects an empty title', async () => {
    await expect(
      issueService.create({ projectId: 'proj-1', title: '   ' }),
    ).rejects.toThrow('Issue title cannot be empty');
    expect(issueRepository.create).not.toHaveBeenCalled();
  });

  it('defaults type to bug, priority to medium, status to open', async () => {
    vi.mocked(issueRepository.create).mockResolvedValue(makeIssue());

    await issueService.create({ projectId: 'proj-1', title: 'Login fails' });

    expect(issueRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'bug', priority: 'medium', status: 'open' }),
    );
  });

  it('passes an explicit status (e.g. backlog) through to the repository', async () => {
    vi.mocked(issueRepository.create).mockResolvedValue(makeIssue());

    await issueService.create({ projectId: 'proj-1', title: 'Backlog item', status: 'backlog' });

    expect(issueRepository.create).toHaveBeenCalledWith(expect.objectContaining({ status: 'backlog' }));
  });

  it('trims title and optional fields before delegating to the repository', async () => {
    vi.mocked(issueRepository.create).mockResolvedValue(makeIssue());

    await issueService.create({
      projectId: 'proj-1',
      title: '  Login fails  ',
      code: '  ISS-1  ',
      description: '  desc  ',
      type: 'feature',
      priority: 'high',
    });

    expect(issueRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Login fails',
        code: 'ISS-1',
        description: 'desc',
        type: 'feature',
        priority: 'high',
      }),
    );
  });

  it('does not save tags when tagNames is not provided', async () => {
    vi.mocked(issueRepository.create).mockResolvedValue(makeIssue());

    await issueService.create({ projectId: 'proj-1', title: 'Login fails' });

    expect(tagService.saveTagsForIssue).not.toHaveBeenCalled();
  });

  it('saves tags when tagNames is provided', async () => {
    vi.mocked(issueRepository.create).mockResolvedValue(makeIssue());

    await issueService.create({
      projectId: 'proj-1',
      title: 'Login fails',
      tagNames: ['auth', 'critical'],
    });

    expect(tagService.saveTagsForIssue).toHaveBeenCalledWith('proj-1', 'issue-1', ['auth', 'critical']);
  });

  it('links to a test result only when linkToTestResultId is provided', async () => {
    vi.mocked(issueRepository.create).mockResolvedValue(makeIssue());

    await issueService.create({ projectId: 'proj-1', title: 'Login fails' });
    expect(issueRepository.linkToTestResult).not.toHaveBeenCalled();

    await issueService.create({ projectId: 'proj-1', title: 'Login fails', linkToTestResultId: 'result-9' });
    expect(issueRepository.linkToTestResult).toHaveBeenCalledWith('issue-1', 'result-9');
  });
});

describe('issueService.createMany', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects the whole batch when any title is empty', async () => {
    await expect(
      issueService.createMany([
        { projectId: 'proj-1', title: 'ok' },
        { projectId: 'proj-1', title: '   ' },
      ]),
    ).rejects.toThrow('Issue title cannot be empty');
    expect(issueRepository.createMany).not.toHaveBeenCalled();
  });

  it('trims titles and applies defaults to every row', async () => {
    vi.mocked(issueRepository.createMany).mockResolvedValue([makeIssue({ id: 'i1' }), makeIssue({ id: 'i2' })]);

    await issueService.createMany([
      { projectId: 'proj-1', title: '  A  ' },
      { projectId: 'proj-1', title: ' B ', priority: 'critical', type: 'task' },
    ]);

    expect(issueRepository.createMany).toHaveBeenCalledWith([
      expect.objectContaining({ title: 'A', type: 'bug', priority: 'medium', status: 'open' }),
      expect.objectContaining({ title: 'B', type: 'task', priority: 'critical', status: 'open' }),
    ]);
  });

  it('saves tags only for issues that carry tagNames, keeping row index alignment', async () => {
    vi.mocked(issueRepository.createMany).mockResolvedValue([makeIssue({ id: 'i1' }), makeIssue({ id: 'i2' })]);

    await issueService.createMany([
      { projectId: 'proj-1', title: 'A', tagNames: ['smoke'] },
      { projectId: 'proj-1', title: 'B' },
    ]);

    expect(tagService.saveTagsForIssueMany).toHaveBeenCalledWith('proj-1', [{ issueId: 'i1', tagNames: ['smoke'] }]);
  });

  it('skips tag saving entirely when no input has tags', async () => {
    vi.mocked(issueRepository.createMany).mockResolvedValue([makeIssue({ id: 'i1' })]);

    await issueService.createMany([{ projectId: 'proj-1', title: 'A' }]);

    expect(tagService.saveTagsForIssueMany).not.toHaveBeenCalled();
  });
});

describe('issueService.update', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects an empty title', async () => {
    await expect(
      issueService.update('issue-1', 'proj-1', {
        title: '   ',
        priority: 'medium',
        type: 'bug',
        moduleId: null,
        externalLinks: [],
      }),
    ).rejects.toThrow('Issue title cannot be empty');
    expect(issueRepository.update).not.toHaveBeenCalled();
  });

  it('does not save tags when tagNames is undefined', async () => {
    vi.mocked(issueRepository.update).mockResolvedValue(makeIssue());

    await issueService.update('issue-1', 'proj-1', {
      title: 'New title',
      priority: 'medium',
      type: 'bug',
      moduleId: null,
      externalLinks: [],
    });

    expect(tagService.saveTagsForIssue).not.toHaveBeenCalled();
  });

  it('saves tags when tagNames is provided', async () => {
    vi.mocked(issueRepository.update).mockResolvedValue(makeIssue());

    await issueService.update(
      'issue-1',
      'proj-1',
      { title: 'New title', priority: 'medium', type: 'bug', moduleId: null, externalLinks: [] },
      ['ui', 'regression'],
    );

    expect(tagService.saveTagsForIssue).toHaveBeenCalledWith('proj-1', 'issue-1', ['ui', 'regression']);
  });

  it('passes code (trimmed) and targetRoleId through when provided', async () => {
    vi.mocked(issueRepository.update).mockResolvedValue(makeIssue());

    await issueService.update('issue-1', 'proj-1', {
      title: 'New title',
      code: '  BUG-42  ',
      priority: 'high',
      type: 'bug',
      moduleId: 'm-1',
      targetRoleId: 'r-1',
      externalLinks: [],
    });

    expect(issueRepository.update).toHaveBeenCalledWith(
      'issue-1',
      expect.objectContaining({ code: 'BUG-42', targetRoleId: 'r-1', moduleId: 'm-1' }),
    );
  });
});

describe('issueService.patchField', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects an empty title', async () => {
    await expect(issueService.patchField('issue-1', { title: '  ' })).rejects.toThrow('Issue title cannot be empty');
    expect(issueRepository.update).not.toHaveBeenCalled();
  });

  it('trims the title before delegating', async () => {
    vi.mocked(issueRepository.update).mockResolvedValue(makeIssue());

    await issueService.patchField('issue-1', { title: '  Login broken  ' });

    expect(issueRepository.update).toHaveBeenCalledWith('issue-1', { title: 'Login broken' });
  });

  it('passes non-title changes through unchanged', async () => {
    vi.mocked(issueRepository.update).mockResolvedValue(makeIssue());

    await issueService.patchField('issue-1', { priority: 'critical' });

    expect(issueRepository.update).toHaveBeenCalledWith('issue-1', { priority: 'critical' });
  });
});

describe('issueService.changeStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('logs activity and notifies the assignee when the status changes and assignee is not the actor', async () => {
    vi.mocked(issueRepository.findById).mockResolvedValue(
      makeIssue({ status: 'open', assignedTo: 'user-b', title: 'Login fails' }),
    );
    vi.mocked(issueRepository.updateStatus).mockResolvedValue(makeIssue({ status: 'in_progress' }));

    await issueService.changeStatus('issue-1', 'in_progress', {
      projectId: 'proj-1',
      actorId: 'user-a',
      actorName: 'Alice',
    });

    expect(activityService.logEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'issue',
        entityId: 'issue-1',
        eventType: 'status_change',
        payload: { from: 'open', to: 'in_progress' },
      }),
    );
    expect(notificationService.create).toHaveBeenCalledWith(
      'user-b',
      'status_change',
      'Alice changed "Login fails" to In Progress',
      null,
      'issue',
      'issue-1',
    );
  });

  it('falls back to "Someone" when the actor name is missing', async () => {
    vi.mocked(issueRepository.findById).mockResolvedValue(
      makeIssue({ status: 'open', assignedTo: 'user-b', title: 'Login fails' }),
    );
    vi.mocked(issueRepository.updateStatus).mockResolvedValue(makeIssue({ status: 'in_progress' }));

    await issueService.changeStatus('issue-1', 'in_progress', { projectId: 'proj-1', actorId: 'user-a' });

    expect(notificationService.create).toHaveBeenCalledWith(
      'user-b',
      'status_change',
      'Someone changed "Login fails" to In Progress',
      null,
      'issue',
      'issue-1',
    );
  });

  it('logs activity but does not notify when status changes and there is no assignee', async () => {
    vi.mocked(issueRepository.findById).mockResolvedValue(makeIssue({ status: 'open', assignedTo: null }));
    vi.mocked(issueRepository.updateStatus).mockResolvedValue(makeIssue({ status: 'in_progress' }));

    await issueService.changeStatus('issue-1', 'in_progress', { projectId: 'proj-1', actorId: 'user-a' });

    expect(activityService.logEvent).toHaveBeenCalledTimes(1);
    expect(notificationService.create).not.toHaveBeenCalled();
  });

  it('logs activity but does not notify the actor themself', async () => {
    vi.mocked(issueRepository.findById).mockResolvedValue(
      makeIssue({ status: 'open', assignedTo: 'user-a' }),
    );
    vi.mocked(issueRepository.updateStatus).mockResolvedValue(makeIssue({ status: 'in_progress' }));

    await issueService.changeStatus('issue-1', 'in_progress', { projectId: 'proj-1', actorId: 'user-a' });

    expect(activityService.logEvent).toHaveBeenCalledTimes(1);
    expect(notificationService.create).not.toHaveBeenCalled();
  });

  it('does nothing (no activity, no notification) when the status is unchanged', async () => {
    vi.mocked(issueRepository.findById).mockResolvedValue(
      makeIssue({ status: 'open', assignedTo: 'user-b' }),
    );
    vi.mocked(issueRepository.updateStatus).mockResolvedValue(makeIssue({ status: 'open' }));

    await issueService.changeStatus('issue-1', 'open', { projectId: 'proj-1', actorId: 'user-a' });

    expect(activityService.logEvent).not.toHaveBeenCalled();
    expect(notificationService.create).not.toHaveBeenCalled();
  });
});

describe('issueService.assign', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('always logs the assignment activity', async () => {
    vi.mocked(issueRepository.assign).mockResolvedValue(makeIssue({ assignedTo: 'user-b' }));

    await issueService.assign('issue-1', 'user-b', { projectId: 'proj-1', actorId: 'user-a', assigneeName: 'Bob' });

    expect(activityService.logEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'issue',
        eventType: 'assignment',
        payload: { assigneeName: 'Bob' },
      }),
    );
  });

  it('notifies the new assignee when they are not the actor', async () => {
    vi.mocked(issueRepository.assign).mockResolvedValue(makeIssue({ assignedTo: 'user-b', title: 'Login fails' }));

    await issueService.assign('issue-1', 'user-b', { projectId: 'proj-1', actorId: 'user-a', actorName: 'Alice' });

    expect(notificationService.create).toHaveBeenCalledWith(
      'user-b',
      'assignment',
      'Alice assigned you to "Login fails"',
      null,
      'issue',
      'issue-1',
    );
  });

  it('does not notify when unassigning (assignedTo null)', async () => {
    vi.mocked(issueRepository.assign).mockResolvedValue(makeIssue({ assignedTo: null }));

    await issueService.assign('issue-1', null, { projectId: 'proj-1', actorId: 'user-a' });

    expect(activityService.logEvent).toHaveBeenCalledWith(
      expect.objectContaining({ payload: { assigneeName: null } }),
    );
    expect(notificationService.create).not.toHaveBeenCalled();
  });

  it('does not notify when assigning to the actor themself', async () => {
    vi.mocked(issueRepository.assign).mockResolvedValue(makeIssue({ assignedTo: 'user-a' }));

    await issueService.assign('issue-1', 'user-a', { projectId: 'proj-1', actorId: 'user-a' });

    expect(notificationService.create).not.toHaveBeenCalled();
  });
});

describe('issueService.bulkChangeStatus', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('processes every id sequentially through changeStatus', async () => {
    const callLog: string[] = [];
    vi.spyOn(issueService, 'changeStatus').mockImplementation(async (id: string) => {
      callLog.push(`start:${id}`);
      await new Promise((resolve) => setTimeout(resolve, 3));
      callLog.push(`end:${id}`);
      return { id } as never;
    });

    await issueService.bulkChangeStatus(['a', 'b', 'c'], 'in_progress', {
      projectId: 'proj-1',
      actorId: 'user-a',
    });

    expect(callLog).toEqual(['start:a', 'end:a', 'start:b', 'end:b', 'start:c', 'end:c']);
  });
});

describe('issueService.bulkAssign', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('processes every id sequentially through assign', async () => {
    const callLog: string[] = [];
    vi.spyOn(issueService, 'assign').mockImplementation(async (id: string) => {
      callLog.push(`start:${id}`);
      await new Promise((resolve) => setTimeout(resolve, 3));
      callLog.push(`end:${id}`);
      return { id } as never;
    });

    await issueService.bulkAssign(['a', 'b'], 'user-x', { projectId: 'proj-1', actorId: 'user-a' });

    expect(callLog).toEqual(['start:a', 'end:a', 'start:b', 'end:b']);
  });
});
