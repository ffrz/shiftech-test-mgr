import type { ActivityEntry, ActivityEntityType } from '../../../types/domain';
import type { ActivityRepository } from '../../interfaces/activityRepository';

let seq = 0;
function nextId(): string {
  seq += 1;
  return `mock-activity-${seq}`;
}

export function createMockActivityRepository(seed: ActivityEntry[] = []): ActivityRepository {
  const store = new Map<string, ActivityEntry>(seed.map((a) => [a.id, a]));

  return {
    async findForEntity(entityType: ActivityEntityType, entityId: string) {
      return [...store.values()]
        .filter((a) => a.entityType === entityType && a.entityId === entityId)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    },

    async create(input) {
      const now = new Date().toISOString();
      const entry: ActivityEntry = {
        id: nextId(),
        projectId: input.projectId,
        entityType: input.entityType,
        entityId: input.entityId,
        actorId: input.actorId,
        eventType: input.eventType,
        payload: input.payload ?? {},
        parentCommentId: input.parentCommentId ?? null,
        deletedAt: null,
        updatedAt: null,
        createdAt: now,
      };
      store.set(entry.id, entry);
      return entry;
    },

    async updateComment(id, body) {
      const existing = store.get(id);
      if (!existing) throw new Error(`mock activity entry not found: ${id}`);
      const updated: ActivityEntry = {
        ...existing,
        payload: { body },
        updatedAt: new Date().toISOString(),
      };
      store.set(id, updated);
      return updated;
    },

    async softDelete(id) {
      const existing = store.get(id);
      if (!existing) throw new Error(`mock activity entry not found: ${id}`);
      const updated: ActivityEntry = {
        ...existing,
        deletedAt: new Date().toISOString(),
      };
      store.set(id, updated);
      return updated;
    },
  };
}
