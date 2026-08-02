import type { Notification } from '../../../types/domain';
import type { NotificationRepository } from '../../interfaces/notificationRepository';

export function createMockNotificationRepository(seed: Notification[] = []): NotificationRepository {
  const store = new Map<string, Notification>(seed.map((n) => [n.id, n]));

  return {
    async findAllByUser(userId: string): Promise<Notification[]> {
      return [...store.values()]
        .filter((n) => n.userId === userId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },

    async findUnreadCount(userId: string): Promise<number> {
      let count = 0;
      for (const n of store.values()) {
        if (n.userId === userId && !n.isRead) count += 1;
      }
      return count;
    },

    async markRead(id: string): Promise<void> {
      const existing = store.get(id);
      if (existing) {
        store.set(id, { ...existing, isRead: true });
      }
    },

    async markAllRead(userId: string): Promise<void> {
      for (const [id, n] of store) {
        if (n.userId === userId && !n.isRead) {
          store.set(id, { ...n, isRead: true });
        }
      }
    },

    async remove(id: string): Promise<void> {
      store.delete(id);
    },

    async removeAll(userId: string): Promise<void> {
      for (const [id, n] of store) {
        if (n.userId === userId) store.delete(id);
      }
    },

    async removeByReference(referenceType: string, referenceId: string): Promise<void> {
      for (const [id, n] of store) {
        if (n.referenceType === referenceType && n.referenceId === referenceId) {
          store.delete(id);
        }
      }
    },
  };
}
