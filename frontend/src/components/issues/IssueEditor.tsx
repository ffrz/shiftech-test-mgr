import { useEffect, useRef, useState } from 'react';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { CharacterCount } from '../ui/CharacterCount';
import { Dropdown } from 'primereact/dropdown';
import { MultiSelect } from 'primereact/multiselect';
import { Button } from 'primereact/button';
import { FloatLabel } from 'primereact/floatlabel';
import { FileUpload, type FileUploadHandlerEvent } from 'primereact/fileupload';
import { Toast } from 'primereact/toast';
import type { Attachment, ExternalLink, IssuePriority, IssueStatus, IssueType, Module, Tag } from '../../types/domain';
import { ISSUE_PRIORITY_LABEL, ISSUE_STATUS_LABEL, ISSUE_TYPE_LABEL } from '../../helpers/statusLabels';
import { moduleService } from '../../services/moduleService';
import { tagService } from '../../services/tagService';
import { attachmentService } from '../../services/attachmentService';

export interface IssueFormData {
  code: string;
  title: string;
  type: IssueType;
  priority: IssuePriority;
  status: IssueStatus;
  moduleId: string | null;
  description: string;
  actualResult: string;
  expectedResult: string;
  tagNames: string[];
  externalLinks: ExternalLink[];
}

interface IssueEditorProps {
  visible: boolean;
  onHide: () => void;
  onSave: (data: IssueFormData) => Promise<void>;
  // Status changes are routed separately from onSave because they go through
  // issueService.changeStatus (activity log + assignee notification), which needs actor
  // info this component doesn't have. Omit in create mode — new issues always start Open.
  onStatusChange?: (status: IssueStatus) => Promise<void>;
  projectId: string;
  mode: 'create' | 'edit';
  initialData?: IssueFormData | null;
  issueId?: string | null;
  modules: Module[];
  tags: Tag[];
  onModulesChange?: (modules: Module[]) => void;
  onTagsChange?: (tags: Tag[]) => void;
  attachments?: Attachment[];
  onAttachmentsChange?: () => void;
}

const TYPE_OPTIONS = (['bug', 'feature', 'improvement', 'task'] as const).map((v) => ({ label: ISSUE_TYPE_LABEL[v], value: v }));
const PRIORITY_OPTIONS = (['low', 'medium', 'high', 'critical'] as const).map((v) => ({ label: ISSUE_PRIORITY_LABEL[v], value: v }));
const STATUS_OPTIONS = (['backlog', 'open', 'in_progress', 'resolved', 'verified', 'closed', 'rejected', 'duplicate'] as const).map((v) => ({ label: ISSUE_STATUS_LABEL[v], value: v }));

export function IssueEditor({
  visible,
  onHide,
  onSave,
  onStatusChange,
  projectId,
  mode,
  initialData,
  issueId,
  modules,
  tags,
  onModulesChange,
  onTagsChange,
  attachments,
  onAttachmentsChange,
}: IssueEditorProps) {
  const toast = useRef<Toast>(null);

  const [code, setCode] = useState('');
  const [title, setTitle] = useState('');
  const [type, setType] = useState<IssueType>('bug');
  const [priority, setPriority] = useState<IssuePriority>('medium');
  const [status, setStatus] = useState<IssueStatus>('open');
  const [moduleId, setModuleId] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [actualResult, setActualResult] = useState('');
  const [expectedResult, setExpectedResult] = useState('');
  const [tagNames, setTagNames] = useState<string[]>([]);
  const [externalLinks, setExternalLinks] = useState<ExternalLink[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (titleError && titleRef.current) {
      titleRef.current.focus();
      titleRef.current.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
    }
  }, [titleError]);

  const [newTagName, setNewTagName] = useState('');
  const [newModuleName, setNewModuleName] = useState('');
  const [quickAddTagVisible, setQuickAddTagVisible] = useState(false);
  const [quickAddModuleVisible, setQuickAddModuleVisible] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setCode(initialData?.code ?? '');
    setTitle(initialData?.title ?? '');
    setType(initialData?.type ?? 'bug');
    setPriority(initialData?.priority ?? 'medium');
    setStatus(initialData?.status ?? 'open');
    setModuleId(initialData?.moduleId ?? null);
    setDescription(initialData?.description ?? '');
    setActualResult(initialData?.actualResult ?? '');
    setExpectedResult(initialData?.expectedResult ?? '');
    setTagNames(initialData?.tagNames ?? []);
    setExternalLinks(initialData?.externalLinks?.length ? initialData.externalLinks : []);
    setError(null);
    setTitleError(null);
    setSaving(false);
    setNewTagName('');
    setNewModuleName('');
    setQuickAddTagVisible(false);
    setQuickAddModuleVisible(false);
  }, [visible, initialData]);

  async function handleSave() {
    setTitleError(null);
    if (!title.trim()) {
      setTitleError('Title cannot be empty');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await onSave({
        code: code.trim(),
        title: title.trim(),
        type,
        priority,
        status,
        moduleId,
        description: description.trim(),
        actualResult: actualResult.trim(),
        expectedResult: expectedResult.trim(),
        tagNames,
        externalLinks: externalLinks.filter((l) => l.url.trim()),
      });
      if (mode === 'edit' && onStatusChange && initialData && status !== initialData.status) {
        await onStatusChange(status);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save issue');
    } finally {
      setSaving(false);
    }
  }

  async function handleQuickAddTag() {
    const name = newTagName.trim();
    if (!name) return;
    try {
      const tag = await tagService.create(projectId, name);
      onTagsChange?.([...tags, tag]);
      setTagNames((prev) => [...prev, tag.name]);
      setNewTagName('');
      setQuickAddTagVisible(false);
      toast.current?.show({ severity: 'success', summary: `Tag "${tag.name}" created` });
    } catch (err) {
      toast.current?.show({ severity: 'error', summary: 'Failed to create tag', detail: err instanceof Error ? err.message : undefined });
    }
  }

  async function handleQuickAddModule() {
    const name = newModuleName.trim();
    if (!name) return;
    try {
      const mod = await moduleService.create({ projectId, name });
      onModulesChange?.([...modules, mod]);
      setModuleId(mod.id);
      setNewModuleName('');
      setQuickAddModuleVisible(false);
      toast.current?.show({ severity: 'success', summary: `Module "${mod.name}" created` });
    } catch (err) {
      toast.current?.show({ severity: 'error', summary: 'Failed to create module', detail: err instanceof Error ? err.message : undefined });
    }
  }

  async function handleUpload(event: FileUploadHandlerEvent) {
    if (!issueId) return;
    try {
      for (const file of event.files) {
        await attachmentService.upload(issueId, projectId, file);
      }
      onAttachmentsChange?.();
      toast.current?.show({ severity: 'success', summary: 'Attachment uploaded' });
    } catch (err) {
      toast.current?.show({ severity: 'error', summary: 'Upload failed', detail: err instanceof Error ? err.message : undefined });
    }
  }

  async function handleRemoveAttachment(attachment: Attachment) {
    if (!issueId) return;
    try {
      await attachmentService.remove(attachment.id, attachment.url);
      onAttachmentsChange?.();
    } catch (err) {
      toast.current?.show({ severity: 'error', summary: 'Failed to remove attachment', detail: err instanceof Error ? err.message : undefined });
    }
  }

  return (
    <>
      <Toast ref={toast} position="bottom-center" />
      <Dialog
        header={mode === 'create' ? 'Create Issue' : 'Edit Issue'}
        visible={visible}
        onHide={onHide}
        style={{ width: '36rem' }}
      >
        <div className="flex flex-column gap-2">
          <div className="grid">
            <div className="col-12 md:col-6 flex flex-column">
              <FloatLabel className="ifta-field">
                <InputText id="issue-code" value={code} onChange={(e) => setCode(e.target.value)} className="w-full" />
                <label htmlFor="issue-code">Code (automatic if empty)</label>
              </FloatLabel>
            </div>
            <div className="col-12 md:col-6 flex flex-column">
              <FloatLabel className="ifta-field">
                <Dropdown
                  id="issue-status"
                  value={status}
                  options={STATUS_OPTIONS}
                  onChange={(e) => setStatus(e.value)}
                  className="w-full"
                  disabled={mode === 'create' || !onStatusChange}
                />
                <label htmlFor="issue-status">Status</label>
              </FloatLabel>
            </div>
          </div>

          <div className="flex flex-column gap-1">
            <FloatLabel className="ifta-field">
              <InputText id="issue-title" ref={titleRef} value={title} onChange={(e) => { setTitle(e.target.value); setTitleError(null); }} className={titleError ? 'p-invalid w-full' : 'w-full'} autoFocus />
              <label htmlFor="issue-title" className={titleError ? 'p-error' : ''}>Title *</label>
            </FloatLabel>
            {titleError && <small className="p-error">{titleError}</small>}
          </div>

          <div className="grid">
            <div className="col-12 md:col-6 flex flex-column">
              <FloatLabel className="ifta-field">
                <Dropdown id="issue-type" value={type} options={TYPE_OPTIONS} onChange={(e) => setType(e.value)} className="w-full" />
                <label htmlFor="issue-type">Type</label>
              </FloatLabel>
            </div>
            <div className="col-12 md:col-6 flex flex-column">
              <FloatLabel className="ifta-field">
                <Dropdown id="issue-priority" value={priority} options={PRIORITY_OPTIONS} onChange={(e) => setPriority(e.value)} className="w-full" />
                <label htmlFor="issue-priority">Priority</label>
              </FloatLabel>
            </div>
          </div>

          <div className="flex flex-column">
            <div className="flex gap-2  align-items-center">
              <FloatLabel className="ifta-field flex-grow-1">
                <Dropdown
                  id="issue-module"
                  value={moduleId}
                  options={[...modules].sort((a, b) => a.name.localeCompare(b.name)).map((m) => ({ label: m.name, value: m.id }))}
                  onChange={(e) => setModuleId(e.value)}
                  editable
                  showClear
                  className="w-full"
                  virtualScrollerOptions={{ itemSize: 40 }}
                />
                <label htmlFor="issue-module">Module (optional)</label>
              </FloatLabel>
              <Button icon="pi pi-plus" size="small" className="btn-xs" rounded text onClick={() => setQuickAddModuleVisible(true)} tooltip="Add Module" />
            </div>
            {quickAddModuleVisible && (
              <div className="flex gap-2 mt-1 align-items-center">
                <InputText
                  value={newModuleName}
                  onChange={(e) => setNewModuleName(e.target.value)}
                  placeholder="Module name"
                  className="w-full"
                  onKeyDown={(e) => { if (e.key === 'Enter') handleQuickAddModule(); }}
                  autoFocus
                />
                <Button icon="pi pi-check" size="small" className="btn-xs" rounded text onClick={handleQuickAddModule} />
                <Button icon="pi pi-times" size="small" className="btn-xs" rounded text severity="danger" onClick={() => setQuickAddModuleVisible(false)} />
              </div>
            )}
          </div>

          <div className="flex flex-column">
            <div className="flex gap-2 align-items-center">
              <FloatLabel className="ifta-field flex-grow-1">
                <MultiSelect
                  id="issue-tags"
                  value={tagNames}
                  options={tags.map((t) => ({ label: t.name, value: t.name }))}
                  onChange={(e) => setTagNames(e.value ?? [])}
                  display="chip"
                  filter
                  className="w-full"
                  virtualScrollerOptions={{ itemSize: 40 }}
                />
                <label htmlFor="issue-tags">Tags</label>
              </FloatLabel>
              <Button icon="pi pi-plus" size="small" className="btn-xs" rounded text onClick={() => setQuickAddTagVisible(true)} tooltip="Add Tag" />
            </div>
            {quickAddTagVisible && (
              <div className="flex gap-2 mt-1  align-items-center">
                <InputText
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder="New tag name"
                  className="w-full"
                  onKeyDown={(e) => { if (e.key === 'Enter') handleQuickAddTag(); }}
                  autoFocus
                />
                <Button icon="pi pi-check" size="small" className="btn-xs" rounded text onClick={handleQuickAddTag} />
                <Button icon="pi pi-times" size="small" className="btn-xs" rounded text severity="danger" onClick={() => setQuickAddTagVisible(false)} />
              </div>
            )}
          </div>

          <div className="flex flex-column gap-1">
            <FloatLabel className="ifta-field">
              <InputTextarea id="issue-description" value={description} onChange={(e) => setDescription(e.target.value)} rows={1} autoResize maxLength={1000} className="w-full" />
              <label htmlFor="issue-description">Description</label>
            </FloatLabel>
            <CharacterCount value={description} maxLength={1000} />
          </div>

          <div className="flex flex-column gap-1">
            <FloatLabel className="ifta-field">
              <InputTextarea id="issue-actual" value={actualResult} onChange={(e) => setActualResult(e.target.value)} rows={1} autoResize maxLength={1000} className="w-full" />
              <label htmlFor="issue-actual">Actual Result</label>
            </FloatLabel>
            <CharacterCount value={actualResult} maxLength={1000} />
          </div>

          <div className="flex flex-column gap-1">
            <FloatLabel className="ifta-field">
              <InputTextarea id="issue-expected" value={expectedResult} onChange={(e) => setExpectedResult(e.target.value)} rows={1} autoResize maxLength={1000} className="w-full" />
              <label htmlFor="issue-expected">Expected Result</label>
            </FloatLabel>
            <CharacterCount value={expectedResult} maxLength={1000} />
          </div>

          <div className="flex flex-column gap-2">
            <label>Attachments</label>
            {mode === 'edit' && issueId ? (
              <>
                <div className="flex flex-wrap gap-2">
                  {(attachments ?? []).map((a) => (
                    <div key={a.id} className="flex align-items-center gap-1 p-2 border-round surface-100">
                      <a className="entity-link" href={a.url} target="_blank" rel="noreferrer">
                        <i className="pi pi-paperclip mr-2" />
                        {a.fileName}
                      </a>
                      <Button icon="pi pi-trash" size="small" text severity="danger" onClick={() => handleRemoveAttachment(a)} />
                    </div>
                  ))}
                </div>
                {(attachments?.length ?? 0) === 0 && <p className="text-color-secondary text-sm m-0">No attachments yet.</p>}
                <FileUpload mode="basic" chooseLabel="Upload File" customUpload uploadHandler={handleUpload} auto multiple />
              </>
            ) : (
              <p className="text-color-secondary text-sm m-0">Attachments can be added after the issue is created.</p>
            )}
          </div>

          <div className="flex flex-column gap-1">
            <label>External Links</label>
            {externalLinks.map((link, i) => (
              <div key={i} className="flex align-items-center gap-2">
                <InputText
                  placeholder="URL"
                  value={link.url}
                  onChange={(e) => setExternalLinks((prev) => prev.map((l, idx) => (idx === i ? { ...l, url: e.target.value } : l)))}
                  className="w-full"
                />
                <InputText
                  placeholder="Label (optional)"
                  value={link.label ?? ''}
                  onChange={(e) => setExternalLinks((prev) => prev.map((l, idx) => (idx === i ? { ...l, label: e.target.value } : l)))}
                  className="w-full"
                />
                <Button icon="pi pi-times" text size="small" rounded className="flex-shrink-0 btn-xs" severity="danger" onClick={() => setExternalLinks((prev) => prev.filter((_, idx) => idx !== i))} />
              </div>
            ))}
            <div className="my-2">
              <Button
                label="Add Link"
                icon="pi pi-plus"
                text
                size="small"
                onClick={() => setExternalLinks((prev) => [...prev, { url: '', label: '' }])}
              />
            </div>
          </div>

          {error && <small className="p-error">{error}</small>}
          <Button label={mode === 'create' ? 'Create' : 'Save'} size="small" onClick={handleSave} loading={saving} />
        </div>
      </Dialog>
    </>
  );
}
