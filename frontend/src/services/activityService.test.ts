import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('../repositories/activityRepository', () => ({
  activityRepository: {
    findForEntity: vi.fn(),
    create: vi.fn(),
    updateComment: vi.fn(),
    softDelete: vi.fn(),
  },
}));
vi.mock('../repositories/profileRepository', () => ({
  profileRepository: { findByUsername: vi.fn() },
}));
vi.mock('./notificationService', () => ({
  notificationService: { create: vi.fn() },
}));

const { activityRepository } = await import('../repositories/activityRepository');
const { profileRepository } = await import('../repositories/profileRepository');
const { notificationService } = await import('./notificationService');
const { activityService } = await import('./activityService');

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(activityRepository.create).mockResolvedValue({ id: 'entry-1' } as never);
});

function mentionInput(overrides: Partial<Parameters<typeof activityService.addComment>[0]> = {}) {
  return {
    projectId: 'proj-1',
    entityType: 'issue' as const,
    entityId: 'issue-1',
    actorId: 'user-a',
    actorName: 'Alice',
    body: 'Hello',
    ...overrides,
  };
}

describe('activityService.addComment', () => {
  it('rejects an empty or whitespace-only body', async () => {
    await expect(activityService.addComment(mentionInput({ body: '   ' }))).rejects.toThrow(
      'Comment cannot be empty.',
    );
    expect(activityRepository.create).not.toHaveBeenCalled();
  });

  it('trims the body before storing the activity entry', async () => {
    await activityService.addComment(mentionInput({ body: '  First comment  ' }));

    expect(activityRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: 'proj-1',
        entityType: 'issue',
        entityId: 'issue-1',
        eventType: 'comment',
        payload: { body: 'First comment' },
        parentCommentId: null,
      }),
    );
  });

  it('does not look up profiles or notify anyone when there are no mentions', async () => {
    await activityService.addComment(mentionInput({ body: 'No mentions here' }));

    expect(profileRepository.findByUsername).not.toHaveBeenCalled();
    expect(notificationService.create).not.toHaveBeenCalled();
  });

  it('resolves every unique mention and notifies each valid recipient', async () => {
    vi.mocked(profileRepository.findByUsername)
      .mockResolvedValueOnce({ id: 'user-b', username: 'alice' } as never)
      .mockResolvedValueOnce({ id: 'user-c', username: 'bob' } as never);

    await activityService.addComment(mentionInput({ body: 'cc @alice and @bob please' }));

    expect(profileRepository.findByUsername).toHaveBeenCalledTimes(2);
    expect(profileRepository.findByUsername).toHaveBeenNthCalledWith(1, 'alice');
    expect(profileRepository.findByUsername).toHaveBeenNthCalledWith(2, 'bob');
    expect(notificationService.create).toHaveBeenCalledTimes(2);
    expect(notificationService.create).toHaveBeenCalledWith(
      'user-b',
      'mention',
      'Alice mentioned you in a comment',
      'cc @alice and @bob please',
      'issue',
      'issue-1',
    );
    expect(notificationService.create).toHaveBeenCalledWith(
      'user-c',
      'mention',
      'Alice mentioned you in a comment',
      'cc @alice and @bob please',
      'issue',
      'issue-1',
    );
  });

  it('deduplicates a username mentioned more than once in the same comment', async () => {
    vi.mocked(profileRepository.findByUsername).mockResolvedValue({ id: 'user-b', username: 'alice' } as never);

    await activityService.addComment(mentionInput({ body: '@alice @alice @alice' }));

    expect(profileRepository.findByUsername).toHaveBeenCalledTimes(1);
    expect(notificationService.create).toHaveBeenCalledTimes(1);
  });

  it('skips usernames that do not resolve to a profile without erroring', async () => {
    vi.mocked(profileRepository.findByUsername)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'user-b', username: 'bob' } as never);

    await expect(
      activityService.addComment(mentionInput({ body: '@ghost and @bob' })),
    ).resolves.toBeDefined();

    expect(notificationService.create).toHaveBeenCalledTimes(1);
    expect(notificationService.create).toHaveBeenCalledWith(
      'user-b',
      'mention',
      expect.any(String),
      '@ghost and @bob',
      'issue',
      'issue-1',
    );
  });

  it('does not notify a mentioned user when they are the actor themself', async () => {
    vi.mocked(profileRepository.findByUsername).mockResolvedValue({ id: 'user-a', username: 'alice' } as never);

    await activityService.addComment(mentionInput({ body: '@alice' }));

    expect(notificationService.create).not.toHaveBeenCalled();
  });

  it('notifies other mentioned users while suppressing a self-mention', async () => {
    vi.mocked(profileRepository.findByUsername)
      .mockResolvedValueOnce({ id: 'user-a', username: 'alice' } as never)
      .mockResolvedValueOnce({ id: 'user-c', username: 'bob' } as never);

    await activityService.addComment(mentionInput({ body: '@alice and @bob' }));

    expect(notificationService.create).toHaveBeenCalledTimes(1);
    expect(notificationService.create).toHaveBeenCalledWith(
      'user-c',
      'mention',
      expect.any(String),
      '@alice and @bob',
      'issue',
      'issue-1',
    );
  });

  it('extracts only word-char username handles, not punctuation or bare @', async () => {
    vi.mocked(profileRepository.findByUsername).mockResolvedValue(null);

    await activityService.addComment(mentionInput({ body: 'ping @alice. and @bob_2; contact @ for help' }));

    expect(profileRepository.findByUsername).toHaveBeenCalledTimes(2);
    expect(profileRepository.findByUsername).toHaveBeenNthCalledWith(1, 'alice');
    expect(profileRepository.findByUsername).toHaveBeenNthCalledWith(2, 'bob_2');
  });
});

describe('activityService.editComment', () => {
  it('rejects an empty body', () => {
    expect(() => activityService.editComment('entry-1', '   ')).toThrow('Comment cannot be empty.');
    expect(activityRepository.updateComment).not.toHaveBeenCalled();
  });

  it('trims the body before delegating', () => {
    activityService.editComment('entry-1', '  Updated  ');
    expect(activityRepository.updateComment).toHaveBeenCalledWith('entry-1', 'Updated');
  });
});

describe('activityService passthrough ops', () => {
  it('delegates listForEntity', async () => {
    vi.mocked(activityRepository.findForEntity).mockResolvedValue([{ id: 'e1' } as never]);
    const result = await activityService.listForEntity('issue', 'issue-1');
    expect(activityRepository.findForEntity).toHaveBeenCalledWith('issue', 'issue-1');
    expect(result).toHaveLength(1);
  });

  it('delegates softDeleteComment', async () => {
    vi.mocked(activityRepository.softDelete).mockResolvedValue(undefined);
    await activityService.softDeleteComment('entry-1');
    expect(activityRepository.softDelete).toHaveBeenCalledWith('entry-1');
  });

  it('delegates logEvent with full payload', async () => {
    vi.mocked(activityRepository.create).mockResolvedValue({ id: 'e2' } as never);
    const input = {
      projectId: 'proj-1',
      entityType: 'test_case' as const,
      entityId: 'tc-1',
      actorId: 'u1',
      eventType: 'status_change',
      payload: { from: 'a', to: 'b' },
    };
    const result = await activityService.logEvent(input);
    expect(activityRepository.create).toHaveBeenCalledWith(input);
    expect(result).toEqual({ id: 'e2' });
  });
});
