import { describe, expect, it } from 'vitest';
import type { Notification } from '../../../types/domain';
import { createMockNotificationRepository } from './notificationRepository';

function makeNotif(overrides: Partial<Notification> = {}): Notification {
  return {
    id: 'n1',
    userId: 'u1',
    type: 'test',
    title: 'Test',
    body: null,
    referenceType: null,
    referenceId: null,
    isRead: false,
    createdAt: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('createMockNotificationRepository', () => {
  it('starts empty when no seed is given', async () => {
    const repo = createMockNotificationRepository();
    await expect(repo.findAllByUser('any')).resolves.toEqual([]);
  });

  it('seed data is visible via findAllByUser', async () => {
    const n = makeNotif();
    const repo = createMockNotificationRepository([n]);
    await expect(repo.findAllByUser('u1')).resolves.toEqual([n]);
  });

  it('findAllByUser filters by userId', async () => {
    const n1 = makeNotif({ id: 'n1', userId: 'u1', title: 'A' });
    const n2 = makeNotif({ id: 'n2', userId: 'u2', title: 'B' });
    const repo = createMockNotificationRepository([n1, n2]);
    const result = await repo.findAllByUser('u1');
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('A');
  });

  it('findAllByUser sorts by createdAt desc', async () => {
    const n1 = makeNotif({ id: 'n1', createdAt: '2025-01-01T00:00:00Z' });
    const n2 = makeNotif({ id: 'n2', createdAt: '2025-02-01T00:00:00Z' });
    const repo = createMockNotificationRepository([n1, n2]);
    const result = await repo.findAllByUser('u1');
    expect(result.map((n) => n.id)).toEqual(['n2', 'n1']);
  });

  it('findUnreadCount counts only unread for given user', async () => {
    const n1 = makeNotif({ id: 'n1', isRead: false });
    const n2 = makeNotif({ id: 'n2', isRead: true });
    const n3 = makeNotif({ id: 'n3', userId: 'u2', isRead: false });
    const repo = createMockNotificationRepository([n1, n2, n3]);
    await expect(repo.findUnreadCount('u1')).resolves.toBe(1);
  });

  it('markRead sets isRead to true', async () => {
    const n = makeNotif({ id: 'n1', isRead: false });
    const repo = createMockNotificationRepository([n]);
    await repo.markRead('n1');
    const result = await repo.findAllByUser('u1');
    expect(result[0].isRead).toBe(true);
  });

  it('markAllRead marks all unread for user', async () => {
    const n1 = makeNotif({ id: 'n1', isRead: false });
    const n2 = makeNotif({ id: 'n2', isRead: false });
    const n3 = makeNotif({ id: 'n3', userId: 'u2', isRead: false });
    const repo = createMockNotificationRepository([n1, n2, n3]);
    await repo.markAllRead('u1');
    const unread = await repo.findUnreadCount('u1');
    expect(unread).toBe(0);
    const otherUnread = await repo.findUnreadCount('u2');
    expect(otherUnread).toBe(1);
  });

  it('remove deletes notification by id', async () => {
    const n = makeNotif({ id: 'n1' });
    const repo = createMockNotificationRepository([n]);
    await repo.remove('n1');
    await expect(repo.findAllByUser('u1')).resolves.toEqual([]);
  });

  it('removeAll deletes all for given user', async () => {
    const n1 = makeNotif({ id: 'n1' });
    const n2 = makeNotif({ id: 'n2', userId: 'u2' });
    const repo = createMockNotificationRepository([n1, n2]);
    await repo.removeAll('u1');
    await expect(repo.findAllByUser('u1')).resolves.toEqual([]);
    await expect(repo.findAllByUser('u2')).resolves.toHaveLength(1);
  });

  it('removeByReference deletes matching referenceType and referenceId', async () => {
    const n1 = makeNotif({ id: 'n1', referenceType: 'project_invite', referenceId: 'p1' });
    const n2 = makeNotif({ id: 'n2', referenceType: 'project_invite', referenceId: 'p2' });
    const n3 = makeNotif({ id: 'n3', referenceType: 'other', referenceId: 'p1' });
    const repo = createMockNotificationRepository([n1, n2, n3]);
    await repo.removeByReference('project_invite', 'p1');
    const result = await repo.findAllByUser('u1');
    expect(result.map((n) => n.id)).toEqual(['n2', 'n3']);
  });

  it('two instances do not share state', async () => {
    const repoA = createMockNotificationRepository([makeNotif({ id: 'n1' })]);
    const repoB = createMockNotificationRepository();
    await expect(repoB.findAllByUser('u1')).resolves.toEqual([]);
    await expect(repoA.findAllByUser('u1')).resolves.toHaveLength(1);
  });
});
