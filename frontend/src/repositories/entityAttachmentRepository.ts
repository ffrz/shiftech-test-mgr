import { entityAttachmentRepositoryAdapter } from './adapters/entityAttachmentResolver';
import type { AttachmentEntityType, Attachment } from '../types/domain';

export type { AttachmentEntityType, Attachment };

export const entityAttachmentRepository = {
  findForEntity(entityType: AttachmentEntityType, entityId: string): Promise<Attachment[]> {
    return entityAttachmentRepositoryAdapter.findForEntity(entityType, entityId);
  },

  create(input: {
    entityType: AttachmentEntityType;
    entityId: string;
    projectId: string;
    storageProvider: string;
    url: string;
    fileName: string;
    fileSize: number | null;
    contentType: string | null;
  }): Promise<Attachment> {
    return entityAttachmentRepositoryAdapter.create(input);
  },

  remove(id: string): Promise<void> {
    return entityAttachmentRepositoryAdapter.remove(id);
  },
};
