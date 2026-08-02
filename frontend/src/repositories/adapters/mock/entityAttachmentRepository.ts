import type { Attachment, AttachmentEntityType } from '../../../types/domain';
import type { EntityAttachmentRepository } from '../../interfaces/entityAttachmentRepository';

let seq = 0;
function nextId(): string {
  seq += 1;
  return `mock-attachment-${seq}`;
}

export function createMockEntityAttachmentRepository(seed: Attachment[] = []): EntityAttachmentRepository {
  const store = new Map<string, Attachment>(seed.map((a) => [a.id, a]));

  return {
    async findForEntity(entityType: AttachmentEntityType, entityId: string) {
      const results = [...store.values()]
        .filter((a) => a.entityType === entityType && a.entityId === entityId)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      return results;
    },

    async create(input) {
      const now = new Date().toISOString();
      const attachment: Attachment = {
        id: nextId(),
        entityType: input.entityType,
        entityId: input.entityId,
        projectId: input.projectId,
        storageProvider: input.storageProvider,
        url: input.url,
        fileName: input.fileName,
        fileSize: input.fileSize,
        contentType: input.contentType,
        createdAt: now,
      };
      store.set(attachment.id, attachment);
      return attachment;
    },

    async remove(id: string) {
      store.delete(id);
    },
  };
}
