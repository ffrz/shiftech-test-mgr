import { supabase } from '../config/supabaseClient';
import { mapAttachmentRow } from '../helpers/mappers';
import type { AttachmentEntityType, Attachment } from '../types/domain';

// Entity-agnostic counterpart to issueRepository's findAttachments/addAttachment/
// removeAttachment (which stay issue-hardcoded for their existing call sites — see
// ROADMAP_V2 Phase 8 T07). Both read/write the same `entity_attachments` table.
export const entityAttachmentRepository = {
  async findForEntity(entityType: AttachmentEntityType, entityId: string): Promise<Attachment[]> {
    const { data, error } = await supabase
      .from('entity_attachments')
      .select('*')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data ?? []).map(mapAttachmentRow);
  },

  async create(input: {
    entityType: AttachmentEntityType;
    entityId: string;
    projectId: string;
    storageProvider: string;
    url: string;
    fileName: string;
    fileSize: number | null;
    contentType: string | null;
  }): Promise<Attachment> {
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

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('entity_attachments').delete().eq('id', id);
    if (error) throw error;
  },
};
