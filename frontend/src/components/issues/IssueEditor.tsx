import { useEffect, useRef, useState } from 'react';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Dropdown } from 'primereact/dropdown';
import { MultiSelect } from 'primereact/multiselect';
import { Button } from 'primereact/button';
import { FileUpload, type FileUploadHandlerEvent } from 'primereact/fileupload';
import { Toast } from 'primereact/toast';
import type { Attachment, GithubLink, IssuePriority, IssueType, Module, Tag } from '../../types/domain';
import { ISSUE_PRIORITY_LABEL, ISSUE_TYPE_LABEL } from '../../helpers/statusLabels';
import { moduleService } from '../../services/moduleService';
import { tagService } from '../../services/tagService';
import { attachmentService } from '../../services/attachmentService';

export interface IssueFormData {
  title: string;
  type: IssueType;
  priority: IssuePriority;
  moduleId: string | null;
  description: string;
  actualResult: string;
  expectedResult: string;
  tagNames: string[];
  githubLinks: GithubLink[];
}

interface IssueEditorProps {
  visible: boolean;
  onHide: () => void;
  onSave: (data: IssueFormData) => Promise<void>;
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

export function IssueEditor({
  visible,
  onHide,
  onSave,
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

  const [title, setTitle] = useState('');
  const [type, setType] = useState<IssueType>('bug');
  const [priority, setPriority] = useState<IssuePriority>('medium');
  const [moduleId, setModuleId] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [actualResult, setActualResult] = useState('');
  const [expectedResult, setExpectedResult] = useState('');
  const [tagNames, setTagNames] = useState<string[]>([]);
  const [githubLinks, setGithubLinks] = useState<GithubLink[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [newTagName, setNewTagName] = useState('');
  const [newModuleName, setNewModuleName] = useState('');
  const [quickAddTagVisible, setQuickAddTagVisible] = useState(false);
  const [quickAddModuleVisible, setQuickAddModuleVisible] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setTitle(initialData?.title ?? '');
    setType(initialData?.type ?? 'bug');
    setPriority(initialData?.priority ?? 'medium');
    setModuleId(initialData?.moduleId ?? null);
    setDescription(initialData?.description ?? '');
    setActualResult(initialData?.actualResult ?? '');
    setExpectedResult(initialData?.expectedResult ?? '');
    setTagNames(initialData?.tagNames ?? []);
    setGithubLinks(initialData?.githubLinks?.length ? initialData.githubLinks : []);
    setError(null);
    setSaving(false);
    setNewTagName('');
    setNewModuleName('');
    setQuickAddTagVisible(false);
    setQuickAddModuleVisible(false);
  }, [visible, initialData]);

  async function handleSave() {
    if (!title.trim()) {
      setError('Title cannot be empty');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await onSave({
        title: title.trim(),
        type,
        priority,
        moduleId,
        description: description.trim(),
        actualResult: actualResult.trim(),
        expectedResult: expectedResult.trim(),
        tagNames,
        githubLinks: githubLinks.filter((l) => l.url.trim()),
      });
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
        await attachmentService.upload(issueId, file);
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
      <Toast ref={toast} position="top-center" />
      <Dialog
        header={mode === 'create' ? 'Create Issue' : 'Edit Issue'}
        visible={visible}
        onHide={onHide}
        style={{ width: '36rem' }}
      >
        <div className="flex flex-column gap-3">
          {error && <small className="p-error">{error}</small>}

          <div className="flex flex-column gap-1">
            <label htmlFor="issue-title">Title *</label>
            <InputText id="issue-title" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
          </div>

          <div className="grid">
            <div className="col-12 md:col-6 flex flex-column gap-1">
              <label htmlFor="issue-type">Type</label>
              <Dropdown id="issue-type" value={type} options={TYPE_OPTIONS} onChange={(e) => setType(e.value)} className="w-full" />
            </div>
            <div className="col-12 md:col-6 flex flex-column gap-1">
              <label htmlFor="issue-priority">Priority</label>
              <Dropdown id="issue-priority" value={priority} options={PRIORITY_OPTIONS} onChange={(e) => setPriority(e.value)} className="w-full" />
            </div>
          </div>

          <div className="flex flex-column gap-1">
            <label>Module</label>
            <div className="flex gap-2">
              <Dropdown
                value={moduleId}
                options={modules.map((m) => ({ label: m.name, value: m.id }))}
                onChange={(e) => setModuleId(e.value)}
                showClear
                placeholder="Not tied to a module"
                className="w-full"
              />
              <Button icon="pi pi-plus" size="small" text onClick={() => setQuickAddModuleVisible(true)} tooltip="Add Module" />
            </div>
            {quickAddModuleVisible && (
              <div className="flex gap-2 mt-1">
                <InputText
                  value={newModuleName}
                  onChange={(e) => setNewModuleName(e.target.value)}
                  placeholder="Module name"
                  className="w-full"
                  onKeyDown={(e) => { if (e.key === 'Enter') handleQuickAddModule(); }}
                  autoFocus
                />
                <Button icon="pi pi-check" size="small" onClick={handleQuickAddModule} />
                <Button icon="pi pi-times" size="small" text severity="secondary" onClick={() => setQuickAddModuleVisible(false)} />
              </div>
            )}
          </div>

          <div className="flex flex-column gap-1">
            <label>Tags</label>
            <div className="flex gap-2">
              <MultiSelect
                value={tagNames}
                options={tags.map((t) => ({ label: t.name, value: t.name }))}
                onChange={(e) => setTagNames(e.value ?? [])}
                placeholder="Select tags"
                display="chip"
                filter
                className="w-full"
              />
              <Button icon="pi pi-plus" size="small" text onClick={() => setQuickAddTagVisible(true)} tooltip="Add Tag" />
            </div>
            {quickAddTagVisible && (
              <div className="flex gap-2 mt-1">
                <InputText
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder="New tag name"
                  className="w-full"
                  onKeyDown={(e) => { if (e.key === 'Enter') handleQuickAddTag(); }}
                  autoFocus
                />
                <Button icon="pi pi-check" size="small" onClick={handleQuickAddTag} />
                <Button icon="pi pi-times" size="small" text severity="secondary" onClick={() => setQuickAddTagVisible(false)} />
              </div>
            )}
          </div>

          <div className="flex flex-column gap-1">
            <label htmlFor="issue-description">Description</label>
            <InputTextarea id="issue-description" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>

          <div className="flex flex-column gap-1">
            <label htmlFor="issue-actual">Actual Result</label>
            <InputTextarea id="issue-actual" value={actualResult} onChange={(e) => setActualResult(e.target.value)} rows={2} />
          </div>

          <div className="flex flex-column gap-1">
            <label htmlFor="issue-expected">Expected Result</label>
            <InputTextarea id="issue-expected" value={expectedResult} onChange={(e) => setExpectedResult(e.target.value)} rows={2} />
          </div>

          <div className="flex flex-column gap-1">
            <label>GitHub Links</label>
            {githubLinks.map((link, i) => (
              <div key={i} className="flex gap-2">
                <InputText
                  placeholder="URL"
                  value={link.url}
                  onChange={(e) => setGithubLinks((prev) => prev.map((l, idx) => (idx === i ? { ...l, url: e.target.value } : l)))}
                  className="w-full"
                />
                <InputText
                  placeholder="Label (optional)"
                  value={link.label ?? ''}
                  onChange={(e) => setGithubLinks((prev) => prev.map((l, idx) => (idx === i ? { ...l, label: e.target.value } : l)))}
                  className="w-full"
                />
                <Button icon="pi pi-times" text size="small" onClick={() => setGithubLinks((prev) => prev.filter((_, idx) => idx !== i))} />
              </div>
            ))}
            <Button
              label="Add Link"
              icon="pi pi-plus"
              text
              size="small"
              onClick={() => setGithubLinks((prev) => [...prev, { url: '', label: '' }])}
            />
          </div>

          <div className="flex flex-column gap-2">
            <label>Attachments</label>
            {mode === 'edit' && issueId ? (
              <>
                {(attachments ?? []).map((a) => (
                  <div key={a.id} className="flex align-items-center justify-content-between p-2 border-round surface-100">
                    <a className="entity-link" href={a.url} target="_blank" rel="noreferrer">
                      <i className="pi pi-paperclip mr-2" />
                      {a.fileName}
                    </a>
                    <Button icon="pi pi-trash" size="small" text severity="danger" onClick={() => handleRemoveAttachment(a)} />
                  </div>
                ))}
                {(attachments?.length ?? 0) === 0 && <p className="text-color-secondary text-sm m-0">No attachments yet.</p>}
                <FileUpload mode="basic" chooseLabel="Upload File" customUpload uploadHandler={handleUpload} auto multiple />
              </>
            ) : (
              <p className="text-color-secondary text-sm m-0">Attachments can be added after the issue is created.</p>
            )}
          </div>

          <Button label={mode === 'create' ? 'Create' : 'Save'} size="small" onClick={handleSave} loading={saving} />
        </div>
      </Dialog>
    </>
  );
}
