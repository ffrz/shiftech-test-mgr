import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Avatar } from 'primereact/avatar';
import { Button } from 'primereact/button';
import { InputTextarea } from 'primereact/inputtextarea';
import { FileUpload, type FileUploadHandlerEvent } from 'primereact/fileupload';
import { profileRepository } from '../../repositories/profileRepository';
import { attachmentService } from '../../services/attachmentService';
import { useActivity } from '../../hooks/useActivity';
import { useAuthContext } from '../../hooks/useAuth';
import { queryKeys } from '../../hooks/queryKeys';
import { formatDateTime } from '../../helpers/dateFormatter';
import { describeSystemEvent } from '../../helpers/activityDescribe';
import { CharacterCount } from './CharacterCount';
import type { ActivityEntityType, ActivityEntry, Profile } from '../../types/domain';

const COMMENT_MAX_LENGTH = 2000;

interface ActivityPanelProps {
  projectId: string;
  entityType: ActivityEntityType;
  entityId: string | null;
}

// One comment's attachments — its own query/upload/remove, scoped by entity_type='comment'
// + entity_id=commentId (see 20260730000003 migration). Split out from renderEntry so each
// comment's attachment list only re-renders/re-queries independently of the others.
function CommentAttachments({ projectId, commentId, canManage }: { projectId: string; commentId: string; canManage: boolean }) {
  const queryClient = useQueryClient();
  const { data: attachments = [] } = useQuery({
    queryKey: queryKeys.entityAttachments('comment', commentId),
    queryFn: () => attachmentService.listForEntity('comment', commentId),
  });

  function invalidate() {
    return queryClient.invalidateQueries({ queryKey: queryKeys.entityAttachments('comment', commentId) });
  }

  async function handleUpload(event: FileUploadHandlerEvent) {
    for (const file of event.files) {
      await attachmentService.uploadForEntity('comment', commentId, projectId, file);
    }
    await invalidate();
  }

  async function handleRemove(attachmentId: string, url: string) {
    await attachmentService.removeForEntity(attachmentId, url);
    await invalidate();
  }

  if (attachments.length === 0 && !canManage) return null;

  return (
    <div className="flex flex-column gap-1 mt-2">
      {attachments.map((a) => (
        <div key={a.id} className="flex align-items-center justify-content-between gap-2 p-1 border-round surface-100 text-sm">
          <a className="entity-link" href={a.url} target="_blank" rel="noreferrer">
            <i className="pi pi-paperclip mr-1" style={{ fontSize: '0.8rem' }} />
            {a.fileName}
          </a>
          {canManage && (
            <Button icon="pi pi-times" size="small" text severity="danger" style={{ width: '1.5rem', height: '1.5rem' }} onClick={() => handleRemove(a.id, a.url)} />
          )}
        </div>
      ))}
      {canManage && (
        <FileUpload mode="basic" chooseLabel="Attach file" chooseOptions={{ className: 'p-button-sm p-button-text' }} customUpload uploadHandler={handleUpload} auto multiple />
      )}
    </div>
  );
}

// Universal Comment + Activity Timeline — one panel, both concerns, since a comment is
// just one event_type in the same entity_activity stream (see ROADMAP_V2 Phase 8). System
// event rendering (status_change, assignment, ...) is added incrementally in ROADMAP_V2
// Phase 8 T05 as each producer starts writing them; unknown event_type falls back to a
// generic line so this component doesn't need to change when a new producer lands.
export function ActivityPanel({ projectId, entityType, entityId }: ActivityPanelProps) {
  const { user, profile: ownProfile } = useAuthContext();
  const { entries, loading, addComment, editComment, deleteComment } = useActivity(projectId, entityType, entityId);
  const [draft, setDraft] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');

  const actorIds = useMemo(() => [...new Set(entries.map((e) => e.actorId))], [entries]);
  const { data: actorProfiles = [] } = useQuery({
    queryKey: ['profiles', 'byIds', ...actorIds.sort()],
    queryFn: () => profileRepository.findByIds(actorIds),
    enabled: actorIds.length > 0,
  });
  const profileById = useMemo(() => {
    const map = new Map<string, Profile>();
    for (const p of actorProfiles) map.set(p.id, p);
    if (ownProfile) map.set(ownProfile.id, ownProfile);
    return map;
  }, [actorProfiles, ownProfile]);

  async function handleSubmit() {
    if (!draft.trim() || submitting) return;
    setSubmitting(true);
    try {
      await addComment(draft);
      setDraft('');
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(entry: ActivityEntry) {
    setEditingId(entry.id);
    setEditDraft(typeof entry.payload.body === 'string' ? entry.payload.body : '');
  }

  async function handleSaveEdit(id: string) {
    if (!editDraft.trim()) return;
    await editComment({ id, body: editDraft });
    setEditingId(null);
  }

  function renderEntry(entry: ActivityEntry) {
    const actor = profileById.get(entry.actorId);
    const actorName = actor?.displayName ?? actor?.username ?? 'Unknown';
    const isOwn = entry.actorId === user?.id;
    const isDeleted = !!entry.deletedAt;

    return (
      <div key={entry.id} className="flex gap-2 py-2" style={{ borderBottom: '1px solid var(--surface-border)' }}>
        <Avatar image={actor?.avatarUrl ?? undefined} icon={actor?.avatarUrl ? undefined : 'pi pi-user'} shape="circle" size="normal" />
        <div className="flex-1">
          <div className="flex align-items-center gap-2">
            <span className="font-medium text-sm">{actorName}</span>
            <span className="text-color-secondary text-xs">{formatDateTime(entry.createdAt)}</span>
          </div>

          {entry.eventType === 'comment' ? (
            isDeleted ? (
              <p className="m-0 text-color-secondary text-sm italic">[deleted]</p>
            ) : editingId === entry.id ? (
              <div className="flex flex-column gap-1 mt-1">
                <InputTextarea
                  value={editDraft}
                  onChange={(e) => setEditDraft(e.target.value.slice(0, COMMENT_MAX_LENGTH))}
                  rows={2}
                  autoResize
                  className="w-full"
                />
                <div className="flex align-items-center justify-content-between">
                  <CharacterCount value={editDraft} maxLength={COMMENT_MAX_LENGTH} />
                  <div className="flex gap-1">
                    <Button label="Cancel" size="small" text onClick={() => setEditingId(null)} />
                    <Button label="Save" size="small" onClick={() => handleSaveEdit(entry.id)} />
                  </div>
                </div>
              </div>
            ) : (
              <p className="m-0 text-sm mt-1" style={{ whiteSpace: 'pre-wrap' }}>
                {typeof entry.payload.body === 'string' ? entry.payload.body : ''}
              </p>
            )
          ) : (
            <p className="m-0 text-sm mt-1 text-color-secondary">{describeSystemEvent(entry)}</p>
          )}

          {entry.eventType === 'comment' && !isDeleted && editingId !== entry.id && (
            <CommentAttachments projectId={projectId} commentId={entry.id} canManage={isOwn} />
          )}

          {entry.eventType === 'comment' && isOwn && !isDeleted && editingId !== entry.id && (
            <div className="flex gap-2 mt-1">
              <a className="entity-link text-xs" onClick={() => startEdit(entry)}>Edit</a>
              <a className="entity-link text-xs" onClick={() => deleteComment(entry.id)}>Delete</a>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!entityId) return null;

  return (
    <div>
      {loading && entries.length === 0 && <p className="text-color-secondary text-sm m-0">Loading activity...</p>}
      {!loading && entries.length === 0 && <p className="text-color-secondary text-sm m-0">No activity yet.</p>}
      {entries.map(renderEntry)}

      <div className="flex flex-column gap-2 mt-3">
        <InputTextarea
          value={draft}
          onChange={(e) => setDraft(e.target.value.slice(0, COMMENT_MAX_LENGTH))}
          rows={2}
          autoResize
          placeholder="Write a comment... use @username to mention someone"
          className="w-full"
        />
        <div className="flex align-items-center justify-content-between">
          <CharacterCount value={draft} maxLength={COMMENT_MAX_LENGTH} />
          <Button label="Comment" size="small" disabled={!draft.trim() || submitting} onClick={handleSubmit} />
        </div>
      </div>
    </div>
  );
}
