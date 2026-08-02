import type { Attachment, AttachmentEntityType } from '../../types/domain';

export interface EntityAttachmentRepository {
  findForEntity(entityType: AttachmentEntityType, entityId: string): Promise<Attachment[]>;
  create(input: {
    entityType: AttachmentEntityType;
    entityId: string;
    projectId: string;
    storageProvider: string;
    url: string;
    fileName: string;
    fileSize: number | null;
    contentType: string | null;
  }): Promise<Attachment>;
  remove(id: string): Promise<void>;
}
