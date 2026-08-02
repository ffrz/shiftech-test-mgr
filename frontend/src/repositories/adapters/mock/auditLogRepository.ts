import type { AuditLogEntry, AuditLogRepository } from '../../interfaces/auditLogRepository';

export function createMockAuditLogRepository(seed: AuditLogEntry[] = []): AuditLogRepository {
  const store = seed.map((e) => ({ ...e }));

  return {
    async findAllByProject(
      projectId: string,
      options: { entityTypes?: string[]; search?: string; page: number; pageSize: number },
    ): Promise<{ data: AuditLogEntry[]; total: number }> {
      let entries = store.filter((e) => e.projectId === projectId);

      if (options.entityTypes?.length) {
        entries = entries.filter((e) => options.entityTypes!.includes(e.entityType));
      }
      if (options.search?.trim()) {
        const needle = options.search.trim().toLowerCase();
        entries = entries.filter((e) => {
          const body = typeof e.payload?.body === 'string' ? e.payload.body : '';
          return body.toLowerCase().includes(needle);
        });
      }

      entries.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

      const total = entries.length;
      const from = (options.page - 1) * options.pageSize;
      return { data: entries.slice(from, from + options.pageSize), total };
    },
  };
}
