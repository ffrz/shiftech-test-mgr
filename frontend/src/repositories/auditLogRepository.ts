import { supabase } from '../config/supabaseClient';
import { mapActivityEntryRow } from '../helpers/mappers';
import type { ActivityEntry } from '../types/domain';

export interface AuditLogEntry extends ActivityEntry {
  actorName: string;
}

// Read-only, project-scoped view over entity_activity — powers the "Activity Log" tab on
// ProjectDetailPage (all Issue/TestCase/TestPlan/TestRun/Project activity in one project,
// filterable). Access is the same has_project_access RLS as everything else that reads
// entity_activity — any member of the project can see this, not just managers/owners
// (product decision 2026-07-30, superseding the earlier admin-only "Audit Log" design).
export const auditLogRepository = {
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
    // Only comment bodies are searchable — system-event descriptions (e.g. "changed
    // status from open to in_progress") are generated client-side by describeSystemEvent,
    // not stored as text, so there's nothing in the DB to ilike against for those rows.
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
