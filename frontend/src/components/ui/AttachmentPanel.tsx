import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FileUpload, type FileUploadHandlerEvent } from 'primereact/fileupload';
import { Button } from 'primereact/button';
import { confirmDialog } from 'primereact/confirmdialog';
import { attachmentService } from '../../services/attachmentService';
import { queryKeys } from '../../hooks/queryKeys';
import type { AttachmentEntityType, Attachment } from '../../types/domain';

interface AttachmentPanelProps {
  projectId: string;
  entityType: AttachmentEntityType;
  entityId: string | null;
  canManage: boolean;
  onToastSuccess?: (summary: string) => void;
  onToastError?: (summary: string, detail?: string) => void;
}

// Entity-agnostic counterpart to the attachment list/upload block already inline in
// IssueDetailPage.tsx — see ROADMAP_V2 Phase 8 T07. IssueDetailPage isn't migrated to this
// component (its own attachmentService.listByIssue/upload/remove path stays as-is, already
// wired and tested), this covers the entity types that had no attachment UI before.
export function AttachmentPanel({ projectId, entityType, entityId, canManage, onToastSuccess, onToastError }: AttachmentPanelProps) {
  const queryClient = useQueryClient();

  const { data: attachments = [] } = useQuery({
    queryKey: queryKeys.entityAttachments(entityType, entityId ?? ''),
    queryFn: () => attachmentService.listForEntity(entityType, entityId!),
    enabled: !!entityId,
  });

  function invalidate() {
    if (!entityId) return Promise.resolve();
    return queryClient.invalidateQueries({ queryKey: queryKeys.entityAttachments(entityType, entityId) });
  }

  async function handleUpload(event: FileUploadHandlerEvent) {
    if (!entityId) return;
    try {
      for (const file of event.files) {
        await attachmentService.uploadForEntity(entityType, entityId, projectId, file);
      }
      await invalidate();
      onToastSuccess?.('Attachment uploaded');
    } catch (err) {
      onToastError?.('Upload failed', err instanceof Error ? err.message : undefined);
    }
  }

  function handleRemove(attachment: Attachment) {
    confirmDialog({
      header: 'Delete Attachment',
      message: `Attachment "${attachment.fileName}" will be deleted. Continue?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        try {
          await attachmentService.removeForEntity(attachment.id, attachment.url);
          await invalidate();
          onToastSuccess?.('Attachment removed');
        } catch (err) {
          onToastError?.('Remove failed', err instanceof Error ? err.message : undefined);
        }
      },
    });
  }

  if (!entityId) return null;

  return (
    <div className="flex flex-column gap-2">
      <div className="flex flex-wrap gap-2">
        {attachments.map((a) => (
          <div key={a.id} className="flex align-items-center gap-1 p-2 border-round surface-100">
            <a className="entity-link flex align-items-center gap-2" href={a.url} target="_blank" rel="noreferrer">
              <i className="pi pi-paperclip flex-shrink-0" />
              <span>{a.fileName}</span>
            </a>
            {canManage && (
              <Button icon="pi pi-trash" size="small" text severity="danger" onClick={() => handleRemove(a)} />
            )}
          </div>
        ))}
      </div>
      {attachments.length === 0 && <p className="text-color-secondary text-sm m-0">No attachments yet.</p>}
      {canManage && (
        <FileUpload
          mode="basic"
          chooseLabel="Upload File"
          chooseOptions={{ icon: 'pi pi-plus', className: 'p-button-text p-button-sm w-fit comment-btn-sm' }}
          customUpload
          uploadHandler={handleUpload}
          auto
          multiple
        />
      )}
    </div>
  );
}
