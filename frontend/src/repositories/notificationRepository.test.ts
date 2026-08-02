import { describe, expect, it, vi } from 'vitest';

vi.stubEnv('VITE_DATA_SOURCE', 'mock');

const { notificationRepository } = await import('./notificationRepository');

describe('notificationRepository (VITE_DATA_SOURCE=mock)', () => {
  it('findAllByUser returns an empty list for an empty store', async () => {
    await expect(notificationRepository.findAllByUser('notif-user-1')).resolves.toEqual([]);
  });

  it('findUnreadCount returns 0 for an empty store', async () => {
    await expect(notificationRepository.findUnreadCount('notif-user-2')).resolves.toBe(0);
  });

  it('markRead and markAllRead do not throw', async () => {
    await expect(notificationRepository.markRead('notif-missing-1')).resolves.toBeUndefined();
    await expect(notificationRepository.markAllRead('notif-user-3')).resolves.toBeUndefined();
  });

  it('remove, removeAll, and removeByReference do not throw', async () => {
    await expect(notificationRepository.remove('notif-missing-2')).resolves.toBeUndefined();
    await expect(notificationRepository.removeAll('notif-user-4')).resolves.toBeUndefined();
    await expect(notificationRepository.removeByReference('project_invite', 'ref-1')).resolves.toBeUndefined();
  });
});
