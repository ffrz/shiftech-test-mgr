import type { ActivityEntityType, ActivityEntry } from '../../types/domain';

export interface ActivityRepository {
  findForEntity(entityType: ActivityEntityType, entityId: string): Promise<ActivityEntry[]>;
  create(input: {
    projectId: string;
    entityType: ActivityEntityType;
    entityId: string;
    actorId: string;
    eventType: string;
    payload?: Record<string, unknown>;
    parentCommentId?: string | null;
  }): Promise<ActivityEntry>;
  updateComment(id: string, body: string): Promise<ActivityEntry>;
  softDelete(id: string): Promise<ActivityEntry>;
}
