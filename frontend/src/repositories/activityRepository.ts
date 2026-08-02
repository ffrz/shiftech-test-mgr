import { activityRepositoryAdapter } from './adapters/activityResolver';
import type { ActivityEntityType, ActivityEntry } from '../types/domain';

export const activityRepository = {
  findForEntity(entityType: ActivityEntityType, entityId: string): Promise<ActivityEntry[]> {
    return activityRepositoryAdapter.findForEntity(entityType, entityId);
  },

  create(input: {
    projectId: string;
    entityType: ActivityEntityType;
    entityId: string;
    actorId: string;
    eventType: string;
    payload?: Record<string, unknown>;
    parentCommentId?: string | null;
  }): Promise<ActivityEntry> {
    return activityRepositoryAdapter.create(input);
  },

  updateComment(id: string, body: string): Promise<ActivityEntry> {
    return activityRepositoryAdapter.updateComment(id, body);
  },

  softDelete(id: string): Promise<ActivityEntry> {
    return activityRepositoryAdapter.softDelete(id);
  },
};
