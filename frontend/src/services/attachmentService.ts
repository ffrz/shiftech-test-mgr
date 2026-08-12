import { issueRepository } from '../repositories/issueRepository';
import { entityAttachmentRepository } from '../repositories/entityAttachmentRepository';
import { storageAdapter } from './storage';
import { activityService } from './activityService';
import type { AttachmentEntityType, ActivityEntityType } from '../types/domain';

export const attachmentService = {
  listByIssue(issueId: string) {
    return issueRepository.findAttachments(issueId);
  },

  async upload(issueId: string, projectId: string, file: File, actorId?: string) {
    const uploaded = await storageAdapter.upload(file);
    const attachment = await issueRepository.addAttachment({
      issueId,
      projectId,
      storageProvider: storageAdapter.providerName,
      url: uploaded.url,
      fileName: uploaded.fileName,
      fileSize: uploaded.fileSize,
      contentType: uploaded.contentType,
    });
    if (actorId) {
      await activityService.logEvent({
        projectId,
        entityType: 'issue' as ActivityEntityType,
        entityId: issueId,
        actorId,
        eventType: 'attachment_added',
        payload: { fileName: uploaded.fileName },
      });
    }
    return attachment;
  },

  async remove(attachmentId: string, url: string, context?: { projectId?: string; entityId?: string; actorId?: string; fileName?: string }) {
    await storageAdapter.remove(url);
    await issueRepository.removeAttachment(attachmentId);
    if (context?.actorId && context.projectId && context.entityId) {
      await activityService.logEvent({
        projectId: context.projectId,
        entityType: 'issue' as ActivityEntityType,
        entityId: context.entityId,
        actorId: context.actorId,
        eventType: 'attachment_removed',
        payload: { fileName: context.fileName },
      });
    }
  },

  // Entity-agnostic counterparts, for entity types other than issue (Test Case, ...) —
  // see ROADMAP_V2 Phase 8 T07. Issue keeps the methods above unchanged since they're
  // already wired into IssueDetailPage/IssueEditor and there's no need to churn them.
  listForEntity(entityType: AttachmentEntityType, entityId: string) {
    return entityAttachmentRepository.findForEntity(entityType, entityId);
  },

  async uploadForEntity(entityType: AttachmentEntityType, entityId: string, projectId: string, file: File, actorId?: string) {
    const uploaded = await storageAdapter.upload(file);
    const attachment = await entityAttachmentRepository.create({
      entityType,
      entityId,
      projectId,
      storageProvider: storageAdapter.providerName,
      url: uploaded.url,
      fileName: uploaded.fileName,
      fileSize: uploaded.fileSize,
      contentType: uploaded.contentType,
    });
    if (actorId) {
      const validActivityTypes = new Set<string>(['issue', 'test_case', 'test_plan', 'test_run']);
      if (validActivityTypes.has(entityType)) {
        await activityService.logEvent({
          projectId,
          entityType: entityType as ActivityEntityType,
          entityId,
          actorId,
          eventType: 'attachment_added',
          payload: { fileName: uploaded.fileName },
        });
      }
    }
    return attachment;
  },

  async removeForEntity(attachmentId: string, url: string, context?: { projectId?: string; entityType?: AttachmentEntityType; entityId?: string; actorId?: string; fileName?: string }) {
    await storageAdapter.remove(url);
    await entityAttachmentRepository.remove(attachmentId);
    if (context?.actorId && context.projectId && context.entityType && context.entityId) {
      const validActivityTypes = new Set<string>(['issue', 'test_case', 'test_plan', 'test_run']);
      if (validActivityTypes.has(context.entityType)) {
        await activityService.logEvent({
          projectId: context.projectId,
          entityType: context.entityType as ActivityEntityType,
          entityId: context.entityId,
          actorId: context.actorId,
          eventType: 'attachment_removed',
          payload: { fileName: context.fileName },
        });
      }
    }
  },
};
