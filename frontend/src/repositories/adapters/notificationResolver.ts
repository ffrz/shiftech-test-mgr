import { notificationRepositoryAdapter as supabase } from './supabase/notificationRepository';
import { createMockNotificationRepository } from './mock/notificationRepository';
import { createDataSourceResolver } from './createDataSourceResolver';
import type { NotificationRepository } from '../interfaces/notificationRepository';

export const notificationRepositoryAdapter: NotificationRepository = createDataSourceResolver<NotificationRepository>({
  supabase,
  mock: createMockNotificationRepository(),
});
