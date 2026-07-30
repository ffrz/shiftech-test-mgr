import { useRef, useState } from 'react';
import { Button } from 'primereact/button';
import { FileUpload, type FileUploadHandlerEvent, type FileUploadSelectEvent } from 'primereact/fileupload';
import { MentionTextarea } from './MentionTextarea';
import { MarkdownPreview } from './MarkdownPreview';
import { CharacterCount } from './CharacterCount';
import type { Attachment } from '../../types/domain';

const COMMENT_MAX_LENGTH = 2000;

interface CommentEditorProps {
  projectId: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onCancel?: () => void;
  submitLabel?: string;
  placeholder?: string;
  submitting?: boolean;
  autoFocus?: boolean;
  rows?: number;
  // Files picked before the comment exists in the DB yet (new comment / reply — there's no
  // commentId to attach to until after submit) — staged in memory here, uploaded by the
  // caller once addComment() resolves with a real id. Omit both props to hide the "Attach
  // file" affordance entirely.
  pendingFiles?: File[];
  onPendingFilesChange?: (files: File[]) => void;
  // Already-uploaded attachments (edit mode only — the comment already exists, so files
  // upload directly instead of staging). Shown/managed only in Write mode, next to the
  // Write/Preview toggle — Preview is meant to show only what the saved comment will read
  // like, not editing chrome. Mutually exclusive with pendingFiles/onPendingFilesChange in
  // practice (a comment is either being newly composed or already exists, never both).
  existingAttachments?: Attachment[];
  onUploadAttachment?: (file: File) => void | Promise<void>;
  onRemoveAttachment?: (attachment: Attachment) => void | Promise<void>;
}

// Write/Preview comment box — @mention/#test-case/!issue autocomplete while writing (see
// MentionTextarea), GitHub-flavored Markdown preview via MarkdownPreview. Shared by the new
// comment box, comment edit, and reply forms in ActivityPanel so all three stay in sync
// (same char limit, same tab UI) instead of three divergent copies.
export function CommentEditor({
  projectId,
  value,
  onChange,
  onSubmit,
  onCancel,
  submitLabel = 'Comment',
  placeholder,
  submitting = false,
  autoFocus = false,
  rows = 2,
  pendingFiles,
  onPendingFilesChange,
  existingAttachments,
  onUploadAttachment,
  onRemoveAttachment,
}: CommentEditorProps) {
  const [mode, setMode] = useState<'write' | 'preview'>('write');
  const fileUploadRef = useRef<FileUpload>(null);
  const canAttach = !!onPendingFilesChange || !!onUploadAttachment;

  function handleSelect(event: FileUploadSelectEvent) {
    if (onUploadAttachment) {
      for (const file of event.files) onUploadAttachment(file);
    } else {
      onPendingFilesChange?.([...(pendingFiles ?? []), ...event.files]);
    }
    fileUploadRef.current?.clear();
  }

  function removePendingFile(index: number) {
    onPendingFilesChange?.((pendingFiles ?? []).filter((_, i) => i !== index));
  }

  return (
    <div className="comment-editor-card">
      <div className="comment-editor-tabs">
        <Button
          label="Write"
          size="small"
          className="comment-btn-sm"
          severity="secondary"
          text={mode !== 'write'}
          outlined={mode === 'write'}
          onClick={() => setMode('write')}
        />
        <Button
          label="Preview"
          size="small"
          className="comment-btn-sm"
          severity="secondary"
          text={mode !== 'preview'}
          outlined={mode === 'preview'}
          onClick={() => setMode('preview')}
        />
        {canAttach && (
          <FileUpload
            ref={fileUploadRef}
            mode="basic"
            chooseLabel="Attach file"
            chooseOptions={{ className: 'comment-btn-sm p-button-text p-button-secondary', style: { fontSize: '0.8rem', padding: '0.3rem 0.65rem' } }}
            // customUpload with a no-op uploadHandler: FileUpload's "auto" upload machinery
            // isn't used here — onSelect either stages the file (pendingFiles) or uploads it
            // immediately (onUploadAttachment), never FileUpload's own auto-upload path.
            customUpload
            uploadHandler={(e: FileUploadHandlerEvent) => e.options.clear()}
            onSelect={handleSelect}
            multiple
            auto={false}
          />
        )}
      </div>

      <div className="comment-editor-body flex flex-column gap-2">
        {mode === 'write' && !!pendingFiles?.length && (
          <div className="flex flex-wrap gap-1">
            {pendingFiles.map((file, i) => (
              <span key={`${file.name}-${i}`} className="flex align-items-center gap-1 px-2 py-1 border-round surface-100 text-xs">
                <i className="pi pi-paperclip" style={{ fontSize: '0.7rem' }} />
                {file.name}
                <i className="pi pi-times cursor-pointer" style={{ fontSize: '0.7rem' }} onClick={() => removePendingFile(i)} />
              </span>
            ))}
          </div>
        )}

        {mode === 'write' && !!existingAttachments?.length && (
          <div className="flex flex-wrap gap-1">
            {existingAttachments.map((a) => (
              <span key={a.id} className="flex align-items-center gap-1 px-2 py-1 border-round surface-100 text-xs">
                <a className="entity-link" href={a.url} target="_blank" rel="noreferrer">
                  <i className="pi pi-paperclip mr-1" style={{ fontSize: '0.7rem' }} />
                  {a.fileName}
                </a>
                {onRemoveAttachment && (
                  <i className="pi pi-times cursor-pointer" style={{ fontSize: '0.7rem' }} onClick={() => onRemoveAttachment(a)} />
                )}
              </span>
            ))}
          </div>
        )}

        {mode === 'write' ? (
          <MentionTextarea
            projectId={projectId}
            value={value}
            onChange={(v) => onChange(v.slice(0, COMMENT_MAX_LENGTH))}
            rows={rows}
            placeholder={placeholder}
            className="w-full"
            autoFocus={autoFocus}
            onSubmitShortcut={() => {
              if (value.trim() && !submitting) onSubmit();
            }}
          />
        ) : (
          <div style={{ minHeight: '4rem' }}>
            <MarkdownPreview value={value} />
          </div>
        )}

        <div className="flex justify-content-end">
          <CharacterCount value={value} maxLength={COMMENT_MAX_LENGTH} />
        </div>
      </div>

      <div className="comment-editor-footer">
        <Button label={submitLabel} size="small" className="comment-btn-sm" disabled={!value.trim() || submitting} onClick={onSubmit} />
        {onCancel ? <Button label="Cancel" size="small" className="comment-btn-sm" text severity="secondary" onClick={onCancel} /> : <span />}
      </div>
    </div>
  );
}
