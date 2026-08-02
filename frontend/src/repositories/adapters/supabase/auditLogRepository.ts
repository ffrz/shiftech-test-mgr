import { supabase } from '../../../config/supabaseClient';
import { mapActivityEntryRow } from '../../../helpers/mappers';
import type { AuditLogEntry, AuditLogRepository } from '../../interfaces/auditLogRepository';

export const auditLogRepositoryAdapter: AuditLogRepository = {
  async findAllByProject(
    projectId: string,
    options: {
      entityTypes?: string[];
      search?: string;
      page: number;
      pageSize: number;
    },
  ): Promise<{ data: AuditLogEntry[]; total: number }> {
    let query = supabase
      .from('entity_activity')
      .select('*, actor:profiles(display_name, username)', { count: 'exact' })
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (options.entityTypes?.length) query = query.in('entity_type', options.entityTypes);
    if (options.search?.trim()) {
      query = query.ilike('payload->>body', `%${options.search.trim()}%`);
    }

    const from = (options.page - 1) * options.pageSize;
    query = query.range(from, from + options.pageSize - 1);

    const { data, error, count } = await query;
    if (error) throw error;
    return {
      data: (data ?? []).map((row: any) => ({
        ...mapActivityEntryRow(row),
        actorName: row.actor?.display_name ?? row.actor?.username ?? 'Unknown',
      })),
      total: count ?? 0,
    };
  },
};
