import type { ActivityEntry } from '../../types/domain';

export interface AuditLogEntry extends ActivityEntry {
  actorName: string;
}

export interface AuditLogRepository {
  findAllByProject(
    projectId: string,
    options: { entityTypes?: string[]; search?: string; page: number; pageSize: number },
  ): Promise<{ data: AuditLogEntry[]; total: number }>;
}
