import { auditLogRepository } from '../repositories/auditLogRepository';

export const auditLogService = {
  listByProject(projectId: string, options: { entityTypes?: string[]; search?: string; page: number; pageSize: number }) {
    return auditLogRepository.findAllByProject(projectId, options);
  },
};
