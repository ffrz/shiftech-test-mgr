import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Avatar } from 'primereact/avatar';
import { confirmDialog } from 'primereact/confirmdialog';
import type { MenuItem } from 'primereact/menuitem';
import { RowActionsMenu } from './RowActionsMenu';
import { UserHoverCard } from './UserHoverCard';
import { profileRepository } from '../../repositories/profileRepository';
import { testCaseRepository } from '../../repositories/testCaseRepository';
import { issueRepository } from '../../repositories/issueRepository';
import { attachmentService } from '../../services/attachmentService';
import { useActivity } from '../../hooks/useActivity';
import { useAuthContext } from '../../hooks/useAuth';
import { queryKeys } from '../../hooks/queryKeys';
import { describeSystemEvent } from '../../helpers/activityDescribe';
import { extractMentionUsernames, extractTestCaseCodes, extractIssueCodes, linkifyMentionsMarkdown } from '../../helpers/renderMentions';
import { CommentEditor } from './CommentEditor';
import { MarkdownPreview } from './MarkdownPreview';
import { ActivityPanelSkeleton } from './ActivityPanelSkeleton';
import { RelativeTime } from './RelativeTime';
import type { ActivityEntityType, ActivityEntry, Attachment, Profile } from '../../types/domain';

// One comment's attachments, read-only display (view mode only) — its own query, scoped by
// entity_type='comment' + entity_id=commentId (see 20260730000003 migration). Split out from
// renderEntry so each comment's attachment list only re-renders/re-queries independently of
// the others. Upload/remove happens inside CommentEditor's edit mode instead (see
// existingAttachments/onUploadAttachment/onRemoveAttachment in renderCommentBody) so the
// delete affordance only shows up while actually editing, not on every comment at rest.
function CommentAttachments({ commentId }: { commentId: string }) {
  const { data: attachments = [] } = useQuery({
    queryKey: queryKeys.entityAttachments('comment', commentId),
    queryFn: () => attachmentService.listForEntity('comment', commentId),
  });

  if (attachments.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1 mt-2">
      {attachments.map((a) => (
        <div key={a.id} className="flex align-items-center gap-1 p-1 border-round surface-100 text-sm">
          <a className="entity-link flex align-items-center gap-1" href={a.url} target="_blank" rel="noreferrer">
            <i className="pi pi-paperclip flex-shrink-0" style={{ fontSize: '0.8rem' }} />
            <span>{a.fileName}</span>
          </a>
        </div>
      ))}
    </div>
  );
}

// Edit form for an existing comment — a real component (not inlined in renderCommentBody)
// because it needs its own useQuery for the comment's existing attachments, wired into
// CommentEditor's existingAttachments/onUploadAttachment/onRemoveAttachment so the upload
// control stays in the Write/Preview bar and the list only shows in Write mode.
function EditCommentForm({
  projectId,
  commentId,
  value,
  onChange,
  onSubmit,
  onCancel,
}: {
  projectId: string;
  commentId: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  const queryClient = useQueryClient();
  const { data: attachments = [] } = useQuery({
    queryKey: queryKeys.entityAttachments('comment', commentId),
    queryFn: () => attachmentService.listForEntity('comment', commentId),
  });

  function invalidate() {
    return queryClient.invalidateQueries({ queryKey: queryKeys.entityAttachments('comment', commentId) });
  }

  async function handleUpload(file: File) {
    await attachmentService.uploadForEntity('comment', commentId, projectId, file);
    await invalidate();
  }

  async function handleRemove(attachment: Attachment) {
    await attachmentService.removeForEntity(attachment.id, attachment.url);
    await invalidate();
  }

  return (
    <CommentEditor
      projectId={projectId}
      value={value}
      onChange={onChange}
      onSubmit={onSubmit}
      onCancel={onCancel}
      submitLabel="Save"
      autoFocus
      existingAttachments={attachments}
      onUploadAttachment={handleUpload}
      onRemoveAttachment={handleRemove}
    />
  );
}

interface ActivityPanelProps {
  projectId: string;
  entityType: ActivityEntityType;
  entityId: string | null;
}

// Universal Comment + Activity Timeline — one panel, both concerns, since a comment is
// just one event_type in the same entity_activity stream (see ROADMAP_V2 Phase 8). System
// event rendering (status_change, assignment, ...) is added incrementally in ROADMAP_V2
// Phase 8 T05 as each producer starts writing them; unknown event_type falls back to a
// generic line so this component doesn't need to change when a new producer lands.
export function ActivityPanel({ projectId, entityType, entityId }: ActivityPanelProps) {
  const { user, profile: ownProfile } = useAuthContext();
  const { entries, loading, addComment, editComment, deleteComment } = useActivity(projectId, entityType, entityId);
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState('');
  const [draftFiles, setDraftFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState('');
  const [replyFiles, setReplyFiles] = useState<File[]>([]);
  const [replySubmitting, setReplySubmitting] = useState(false);

  // Staged files (see CommentEditor's pendingFiles) have no commentId yet — uploaded here
  // right after the comment is created, then the new comment's own attachment list is
  // invalidated so it shows up without a page reload.
  async function uploadPendingFiles(commentId: string, files: File[]) {
    for (const file of files) {
      await attachmentService.uploadForEntity('comment', commentId, projectId, file);
    }
    if (files.length > 0) {
      await queryClient.invalidateQueries({ queryKey: queryKeys.entityAttachments('comment', commentId) });
    }
  }

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

  // Resolves every @handle/#code/!code referenced across all comments in this thread in one
  // batch, so linkifyMentionsMarkdown can tell a real reference (rendered as a link) from
  // stray text.
  const referencedUsernames = useMemo(() => {
    const handles = new Set<string>();
    for (const entry of entries) {
      if (entry.eventType !== 'comment' || typeof entry.payload.body !== 'string') continue;
      for (const handle of extractMentionUsernames(entry.payload.body)) handles.add(handle.toLowerCase());
    }
    return [...handles];
  }, [entries]);
  const referencedTestCaseCodes = useMemo(() => {
    const codes = new Set<string>();
    for (const entry of entries) {
      if (entry.eventType !== 'comment' || typeof entry.payload.body !== 'string') continue;
      for (const code of extractTestCaseCodes(entry.payload.body)) codes.add(code);
    }
    return [...codes];
  }, [entries]);
  const referencedIssueCodes = useMemo(() => {
    const codes = new Set<string>();
    for (const entry of entries) {
      if (entry.eventType !== 'comment' || typeof entry.payload.body !== 'string') continue;
      for (const code of extractIssueCodes(entry.payload.body)) codes.add(code);
    }
    return [...codes];
  }, [entries]);

  const { data: mentionedProfiles = [] } = useQuery({
    queryKey: ['profiles', 'byUsernames', ...referencedUsernames.sort()],
    queryFn: () => Promise.all(referencedUsernames.map((u) => profileRepository.findByUsername(u))),
    enabled: referencedUsernames.length > 0,
  });
  const { data: referencedTestCases = [] } = useQuery({
    queryKey: ['testCases', 'byCodes', projectId, ...referencedTestCaseCodes.sort()],
    queryFn: () => Promise.all(referencedTestCaseCodes.map((c) => testCaseRepository.findByCode(projectId, c))),
    enabled: referencedTestCaseCodes.length > 0,
  });
  const { data: referencedIssues = [] } = useQuery({
    queryKey: ['issues', 'byCodes', projectId, ...referencedIssueCodes.sort()],
    queryFn: () => Promise.all(referencedIssueCodes.map((c) => issueRepository.findByCode(projectId, c))),
    enabled: referencedIssueCodes.length > 0,
  });

  const knownRefs = useMemo(
    () => ({
      usernames: new Set(mentionedProfiles.filter((p): p is Profile => p !== null).map((p) => p.username.toLowerCase())),
      testCaseCodes: new Map(referencedTestCases.filter((tc): tc is NonNullable<typeof tc> => tc !== null).map((tc) => [tc.code, tc.id])),
      issueCodes: new Map(referencedIssues.filter((i): i is NonNullable<typeof i> => i !== null).map((i) => [i.code, i.id])),
    }),
    [mentionedProfiles, referencedTestCases, referencedIssues],
  );

  // Top-level comments in order, each carrying its replies (flat, one level of nesting —
  // parent_comment_id always points at a top-level comment, see the domain type comment).
  const threads = useMemo(() => {
    const replies = new Map<string, ActivityEntry[]>();
    for (const entry of entries) {
      if (entry.eventType === 'comment' && entry.parentCommentId) {
        const list = replies.get(entry.parentCommentId) ?? [];
        list.push(entry);
        replies.set(entry.parentCommentId, list);
      }
    }
    return entries
      .filter((e) => !(e.eventType === 'comment' && e.parentCommentId))
      .map((entry) => ({ entry, replies: entry.eventType === 'comment' ? replies.get(entry.id) ?? [] : [] }));
  }, [entries]);

  async function handleSubmit() {
    if (!draft.trim() || submitting) return;
    setSubmitting(true);
    try {
      const created = await addComment({ body: draft });
      await uploadPendingFiles(created.id, draftFiles);
      setDraft('');
      setDraftFiles([]);
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

  function confirmDeleteComment(id: string) {
    confirmDialog({
      header: 'Delete Comment',
      message: 'This comment will be deleted. Continue?',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      acceptClassName: 'p-button-danger',
      accept: () => deleteComment(id),
    });
  }

  function startReply(id: string, initialDraft = '') {
    setReplyingToId(id);
    setReplyDraft(initialDraft);
    setReplyFiles([]);
  }

  // Quotes the comment's raw body as a markdown blockquote with an attribution line, then
  // opens the reply box on its thread (pre-filled, so the user just adds their own text
  // below it) — replies only nest one level, so quoting a reply targets the same top-level
  // parent the reply itself belongs to, same as the plain "Reply" action.
  function startQuoteReply(entry: ActivityEntry) {
    const actor = profileById.get(entry.actorId);
    const authorLabel = actor?.username ? `@${actor.username}` : 'Unknown';
    const body = typeof entry.payload.body === 'string' ? entry.payload.body : '';
    const quoted = body
      .split('\n')
      .map((line) => `> ${line}`)
      .join('\n');
    const parentId = entry.parentCommentId ?? entry.id;
    startReply(parentId, `${authorLabel} wrote:\n${quoted}\n\n`);
  }

  async function handleSubmitReply(parentId: string) {
    if (!replyDraft.trim() || replySubmitting) return;
    setReplySubmitting(true);
    try {
      const created = await addComment({ body: replyDraft, parentCommentId: parentId });
      await uploadPendingFiles(created.id, replyFiles);
      setReplyingToId(null);
      setReplyDraft('');
      setReplyFiles([]);
    } finally {
      setReplySubmitting(false);
    }
  }

  function renderCommentBody(entry: ActivityEntry) {
    const isEditing = editingId === entry.id;
    const isDeleted = !!entry.deletedAt;

    if (isDeleted) {
      return <p className="m-0 text-color-secondary text-sm italic">[deleted]</p>;
    }
    if (isEditing) {
      return (
        <div className="mt-1">
          <EditCommentForm
            projectId={projectId}
            commentId={entry.id}
            value={editDraft}
            onChange={setEditDraft}
            onSubmit={() => handleSaveEdit(entry.id)}
            onCancel={() => setEditingId(null)}
          />
        </div>
      );
    }
    const body = typeof entry.payload.body === 'string' ? entry.payload.body : '';
    return (
      <div className="mt-1">
        <MarkdownPreview value={linkifyMentionsMarkdown(body, knownRefs)} />
      </div>
    );
  }

  function renderCommentActions(entry: ActivityEntry, { allowReply }: { allowReply: boolean }) {
    const isDeleted = !!entry.deletedAt;
    if (isDeleted || editingId === entry.id || !allowReply) return null;

    return (
      <div className="flex gap-2 mt-1">
        <a className="comment-action-link text-xs" onClick={() => startReply(entry.id)}>Reply</a>
      </div>
    );
  }

  function commentMenuItems(entry: ActivityEntry, { isOwn, allowReply }: { isOwn: boolean; allowReply: boolean }): MenuItem[] {
    const items: MenuItem[] = [];
    if (allowReply) {
      items.push({ label: 'Quote Reply', icon: 'pi pi-comment', command: () => startQuoteReply(entry) });
    }
    if (isOwn) {
      items.push(
        { label: 'Edit', icon: 'pi pi-pencil', command: () => startEdit(entry) },
        { label: 'Delete', icon: 'pi pi-trash', command: () => confirmDeleteComment(entry.id) },
      );
    }
    return items;
  }

  function renderCommentEntry(entry: ActivityEntry, { allowReply }: { allowReply: boolean }) {
    const actor = profileById.get(entry.actorId);
    const isOwn = entry.actorId === user?.id;
    const isDeleted = !!entry.deletedAt;
    const isEditing = editingId === entry.id;
    const actions = renderCommentActions(entry, { allowReply });
    const menuItems = commentMenuItems(entry, { isOwn, allowReply });

    return (
      <div className="comment-card">
        <div className="comment-card-header">
          <div className="comment-card-header-meta">
            <Avatar image={actor?.avatarUrl ?? undefined} icon={actor?.avatarUrl ? undefined : 'pi pi-user'} shape="circle" size="normal" />
            {actor?.username ? (
              <UserHoverCard userId={entry.actorId}>
                <span className="font-bold username-text cursor-pointer">{actor.username}</span>
              </UserHoverCard>
            ) : (
              <span className="font-bold">Unknown</span>
            )}
            <span className="text-color-secondary">
              commented <RelativeTime value={entry.createdAt} />
            </span>
            {entry.updatedAt && !isDeleted && (
              <span className="text-color-secondary font-italic">
                &middot; edited <RelativeTime value={entry.updatedAt} />
              </span>
            )}
          </div>
          {!isDeleted && !isEditing && menuItems.length > 0 && (
            <div className="flex-shrink-0">
              <RowActionsMenu items={menuItems} />
            </div>
          )}
        </div>

        <div className="comment-card-body">
          {renderCommentBody(entry)}
          {!isDeleted && !isEditing && <CommentAttachments commentId={entry.id} />}
        </div>

        {actions && <div className="comment-card-actions">{actions}</div>}
      </div>
    );
  }

  // System events (status_change/assignment/...) render as a single timeline line with an
  // icon bubble on the rail instead of a full comment card — matches GitHub issue's "moved
  // this to..."/"changed the status..." rows, which don't get their own card chrome.
  function timelineEventIcon(eventType: string): string {
    switch (eventType) {
      case 'created':
        return 'pi pi-plus';
      case 'updated':
        return 'pi pi-pencil';
      case 'deleted':
        return 'pi pi-trash';
      case 'status_change':
        return 'pi pi-refresh';
      case 'assignment':
        return 'pi pi-user-edit';
      case 'attachment_added':
        return 'pi pi-paperclip';
      default:
        return 'pi pi-bolt';
    }
  }

  // connectToPrevious: only true when the immediately preceding thread entry was also a
  // timeline event (not a comment) — draws a short connecting line above this row's icon so
  // consecutive system events read as one continuous timeline, without a full-thread rail
  // that would otherwise run behind comment cards too.
  function renderTimelineEvent(entry: ActivityEntry, connectToPrevious: boolean) {
    const actor = profileById.get(entry.actorId);

    return (
      <div className={connectToPrevious ? 'timeline-event-row timeline-event-connected' : 'timeline-event-row'}>
        <div className="timeline-event-icon">
          <i className={timelineEventIcon(entry.eventType)} />
        </div>
        <span className="timeline-event-text">
          {actor?.username ? (
            <UserHoverCard userId={entry.actorId}>
              <span className="font-bold username-text cursor-pointer">{actor.username}</span>
            </UserHoverCard>
          ) : (
            <span className="font-medium text-color">Unknown</span>
          )}{' '}
          {describeSystemEvent(entry)} &middot; <RelativeTime value={entry.createdAt} />
        </span>
      </div>
    );
  }

  function renderEntry(entry: ActivityEntry, replies: ActivityEntry[], previousEntry: ActivityEntry | undefined) {
    if (entry.eventType !== 'comment') {
      const connectToPrevious = !!previousEntry && previousEntry.eventType !== 'comment';
      return (
        <div key={entry.id}>
          {renderTimelineEvent(entry, connectToPrevious)}
        </div>
      );
    }

    return (
      <div key={entry.id} className="comment-row">
        {renderCommentEntry(entry, { allowReply: true })}

        {replies.length > 0 && (
          <div className="flex flex-column gap-3 mt-3" style={{ marginLeft: '1.5rem' }}>
            {replies.map((reply) => (
              <div key={reply.id}>{renderCommentEntry(reply, { allowReply: false })}</div>
            ))}
          </div>
        )}

        {!entry.deletedAt && replyingToId === entry.id && (
          <div className="mt-3" style={{ marginLeft: '1.5rem' }}>
            <CommentEditor
              projectId={projectId}
              value={replyDraft}
              onChange={setReplyDraft}
              onSubmit={() => handleSubmitReply(entry.id)}
              onCancel={() => setReplyingToId(null)}
              submitLabel="Reply"
              placeholder="Write a reply..."
              submitting={replySubmitting}
              autoFocus
              pendingFiles={replyFiles}
              onPendingFilesChange={setReplyFiles}
            />
          </div>
        )}
      </div>
    );
  }

  if (!entityId) return null;

  return (
    <div>
      {loading && entries.length === 0 && <ActivityPanelSkeleton />}
      {!loading && entries.length === 0 && <p className="text-color-secondary text-sm m-0">No activity yet.</p>}

      <div className="comment-thread mt-3">
        {threads.map(({ entry, replies }, i) => renderEntry(entry, replies, threads[i - 1]?.entry))}

        <div className="comment-row">
          <CommentEditor
            projectId={projectId}
            value={draft}
            onChange={setDraft}
            onSubmit={handleSubmit}
            submitLabel="Comment"
            placeholder="Write a comment... @user to mention, #code for test case, !code for issue"
            submitting={submitting}
            pendingFiles={draftFiles}
            onPendingFilesChange={setDraftFiles}
          />
        </div>
      </div>
    </div>
  );
}
