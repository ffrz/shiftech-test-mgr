import { supabase } from '../config/supabaseClient';
import { mapActivityEntryRow } from '../helpers/mappers';
import type { ActivityEntityType, ActivityEntry } from '../types/domain';

export const activityRepository = {
  async findForEntity(entityType: ActivityEntityType, entityId: string): Promise<ActivityEntry[]> {
    const { data, error } = await supabase
      .from('entity_activity')
      .select('*')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data ?? []).map(mapActivityEntryRow);
  },

  async create(input: {
    projectId: string;
    entityType: ActivityEntityType;
    entityId: string;
    actorId: string;
    eventType: string;
    payload?: Record<string, unknown>;
    parentCommentId?: string | null;
  }): Promise<ActivityEntry> {
    const { data, error } = await supabase
      .from('entity_activity')
      .insert({
        project_id: input.projectId,
        entity_type: input.entityType,
        entity_id: input.entityId,
        actor_id: input.actorId,
        event_type: input.eventType,
        payload: input.payload ?? {},
        parent_comment_id: input.parentCommentId ?? null,
      })
      .select('*')
      .single();
    if (error) throw error;
    return mapActivityEntryRow(data);
  },

  async updateComment(id: string, body: string): Promise<ActivityEntry> {
    const { data, error } = await supabase
      .from('entity_activity')
      .update({ payload: { body }, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return mapActivityEntryRow(data);
  },

  async softDelete(id: string): Promise<ActivityEntry> {
    const { data, error } = await supabase
      .from('entity_activity')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return mapActivityEntryRow(data);
  },
};
