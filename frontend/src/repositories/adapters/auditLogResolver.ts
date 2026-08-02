import { auditLogRepositoryAdapter as supabase } from './supabase/auditLogRepository';
import { createMockAuditLogRepository } from './mock/auditLogRepository';
import { createDataSourceResolver } from './createDataSourceResolver';
import type { AuditLogRepository } from '../interfaces/auditLogRepository';

export const auditLogRepositoryAdapter: AuditLogRepository = createDataSourceResolver<AuditLogRepository>({
  supabase,
  mock: createMockAuditLogRepository(),
});
