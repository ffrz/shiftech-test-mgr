import { auditLogRepositoryAdapter } from './adapters/auditLogResolver';

export type { AuditLogEntry } from './interfaces/auditLogRepository';

export const auditLogRepository = {
  findAllByProject(
    projectId: string,
    options: { entityTypes?: string[]; search?: string; page: number; pageSize: number },
  ) {
    return auditLogRepositoryAdapter.findAllByProject(projectId, options);
  },
};
