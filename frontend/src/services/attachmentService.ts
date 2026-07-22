import { issueRepository } from '../repositories/issueRepository';
import { storageAdapter } from './storage';

export const attachmentService = {
  listByIssue(issueId: string) {
    return issueRepository.findAttachments(issueId);
  },

  async upload(issueId: string, file: File) {
    const uploaded = await storageAdapter.upload(file);
    return issueRepository.addAttachment({
      issueId,
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
};
