import type { Notification } from '../../types/domain';

export interface NotificationRepository {
  findAllByUser(userId: string): Promise<Notification[]>;
  findUnreadCount(userId: string): Promise<number>;
  markRead(id: string): Promise<void>;
  markAllRead(userId: string): Promise<void>;
  remove(id: string): Promise<void>;
  removeAll(userId: string): Promise<void>;
  removeByReference(referenceType: string, referenceId: string): Promise<void>;
}
