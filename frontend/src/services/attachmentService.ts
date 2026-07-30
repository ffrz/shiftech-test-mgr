import { issueRepository } from '../repositories/issueRepository';
import { entityAttachmentRepository } from '../repositories/entityAttachmentRepository';
import { storageAdapter } from './storage';
import type { AttachmentEntityType } from '../types/domain';

export const attachmentService = {
  listByIssue(issueId: string) {
    return issueRepository.findAttachments(issueId);
  },

  async upload(issueId: string, projectId: string, file: File) {
    const uploaded = await storageAdapter.upload(file);
    return issueRepository.addAttachment({
      issueId,
      projectId,
      storageProvider: storageAdapter.providerName,
      url: uploaded.url,
      fileName: uploaded.fileName,
      fileSize: uploaded.fileSize,
      contentType: uploaded.contentType,
    });
  },

  async remove(attachmentId: string, url: string) {
    await storageAdapter.remove(url);
    await issueRepository.removeAttachment(attachmentId);
  },

  // Entity-agnostic counterparts, for entity types other than issue (Test Case, ...) —
  // see ROADMAP_V2 Phase 8 T07. Issue keeps the methods above unchanged since they're
  // already wired into IssueDetailPage/IssueEditor and there's no need to churn them.
  listForEntity(entityType: AttachmentEntityType, entityId: string) {
    return entityAttachmentRepository.findForEntity(entityType, entityId);
  },

  async uploadForEntity(entityType: AttachmentEntityType, entityId: string, projectId: string, file: File) {
    const uploaded = await storageAdapter.upload(file);
    return entityAttachmentRepository.create({
      entityType,
      entityId,
      projectId,
      storageProvider: storageAdapter.providerName,
      url: uploaded.url,
      fileName: uploaded.fileName,
      fileSize: uploaded.fileSize,
      contentType: uploaded.contentType,
    });
  },

  async removeForEntity(attachmentId: string, url: string) {
    await storageAdapter.remove(url);
    await entityAttachmentRepository.remove(attachmentId);
  },
};
