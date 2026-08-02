import { notificationRepositoryAdapter } from './adapters/notificationResolver';
import type { Notification } from '../types/domain';

export const notificationRepository = {
  findAllByUser(userId: string): Promise<Notification[]> {
    return notificationRepositoryAdapter.findAllByUser(userId);
  },

  findUnreadCount(userId: string): Promise<number> {
    return notificationRepositoryAdapter.findUnreadCount(userId);
  },

  markRead(id: string): Promise<void> {
    return notificationRepositoryAdapter.markRead(id);
  },

  markAllRead(userId: string): Promise<void> {
    return notificationRepositoryAdapter.markAllRead(userId);
  },

  remove(id: string): Promise<void> {
    return notificationRepositoryAdapter.remove(id);
  },

  removeAll(userId: string): Promise<void> {
    return notificationRepositoryAdapter.removeAll(userId);
  },

  removeByReference(referenceType: string, referenceId: string): Promise<void> {
    return notificationRepositoryAdapter.removeByReference(referenceType, referenceId);
  },
};
