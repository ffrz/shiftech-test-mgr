import { supabase } from '../../../config/supabaseClient';
import { mapAttachmentRow } from '../../../helpers/mappers';
import type { AttachmentEntityType } from '../../../types/domain';
import type { EntityAttachmentRepository } from '../../interfaces/entityAttachmentRepository';

export const entityAttachmentRepositoryAdapter: EntityAttachmentRepository = {
  async findForEntity(entityType: AttachmentEntityType, entityId: string) {
    const { data, error } = await supabase
      .from('entity_attachments')
      .select('*')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data ?? []).map(mapAttachmentRow);
  },

  async create(input) {
    const { data, error } = await supabase
      .from('entity_attachments')
      .insert({
        entity_type: input.entityType,
        entity_id: input.entityId,
        project_id: input.projectId,
        storage_provider: input.storageProvider,
        url: input.url,
        file_name: input.fileName,
        file_size: input.fileSize,
        content_type: input.contentType,
      })
      .select('*')
      .single();
    if (error) throw error;
    return mapAttachmentRow(data);
  },

  async remove(id: string) {
    const { error } = await supabase.from('entity_attachments').delete().eq('id', id);
    if (error) throw error;
  },
};
