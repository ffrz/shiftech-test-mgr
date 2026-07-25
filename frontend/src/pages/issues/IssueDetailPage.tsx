import { useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from 'primereact/card';
import { Tag } from 'primereact/tag';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { MultiSelect } from 'primereact/multiselect';
import { FileUpload, type FileUploadHandlerEvent } from 'primereact/fileupload';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Toast } from 'primereact/toast';
import { issueService } from '../../services/issueService';
import { attachmentService } from '../../services/attachmentService';
import { projectMemberService } from '../../services/projectMemberService';
import { projectService } from '../../services/projectService';
import { moduleService } from '../../services/moduleService';
import { tagService } from '../../services/tagService';
import { useProjectRole } from '../../hooks/useProjectRole';
import { queryKeys } from '../../hooks/queryKeys';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import type { BreadcrumbItem } from '../../components/ui/Breadcrumb';
import type { Attachment, GithubLink, IssuePriority, IssueStatus, IssueType } from '../../types/domain';
import { formatDateTime } from '../../helpers/dateFormatter';
import {
  ISSUE_PRIORITY_LABEL,
  ISSUE_PRIORITY_SEVERITY,
  ISSUE_STATUS_LABEL,
  ISSUE_TYPE_LABEL,
  ISSUE_TYPE_SEVERITY,
} from '../../helpers/statusLabels';

const STATUS_OPTIONS: { label: string; value: IssueStatus }[] = (
  ['open', 'in_progress', 'resolved', 'verified', 'closed'] as const
).map((v) => ({ label: ISSUE_STATUS_LABEL[v], value: v }));

const PRIORITY_OPTIONS: { label: string; value: IssuePriority }[] = (
  ['low', 'medium', 'high', 'critical'] as const
).map((v) => ({ label: ISSUE_PRIORITY_LABEL[v], value: v }));

const TYPE_OPTIONS: { label: string; value: IssueType }[] = (
  ['bug', 'feature', 'improvement', 'task'] as const
).map((v) => ({ label: ISSUE_TYPE_LABEL[v], value: v }));

export function IssueDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const testRunId = searchParams.get('testRunId');
  const toast = useRef<Toast>(null);

  const queryClient = useQueryClient();
  const { data: issue = null, isLoading: loading } = useQuery({
    queryKey: queryKeys.issue(id ?? ''),
    queryFn: () => issueService.getById(id!),
    enabled: !!id,
  });
  const { data: projectMembers = [] } = useQuery({
    queryKey: queryKeys.projectMembers(issue?.projectId ?? ''),
    queryFn: () => projectMemberService.listByProject(issue!.projectId),
    enabled: !!issue?.projectId,
  });
  const { data: attachments = [] } = useQuery({
    queryKey: queryKeys.attachmentsByIssue(id ?? ''),
    queryFn: () => attachmentService.listByIssue(id!),
    enabled: !!id,
  });
  const { canManageIssues, canDeleteContent } = useProjectRole(issue?.projectId);

  const { data: project } = useQuery({
    queryKey: queryKeys.project(issue?.projectId ?? ''),
    queryFn: () => projectService.getById(issue!.projectId),
    enabled: !!issue?.projectId,
  });
  const projectName = project?.name ?? null;

  const { data: modules = [] } = useQuery({
    queryKey: queryKeys.modules(issue?.projectId ?? ''),
    queryFn: () => moduleService.listByProject(issue!.projectId),
    enabled: !!issue?.projectId,
  });
  const { data: projectTags = [] } = useQuery({
    queryKey: queryKeys.tags(issue?.projectId ?? ''),
    queryFn: () => tagService.listByProject(issue!.projectId),
    enabled: !!issue?.projectId,
  });

  async function reload() {
    if (!id) return;
    await queryClient.invalidateQueries({ queryKey: queryKeys.issue(id) });
  }

  function handleBack() {
    if (testRunId) {
      navigate(`/test-runs/${testRunId}/issues`);
    } else if (issue?.projectId) {
      navigate(`/projects/${issue.projectId}`);
    } else {
      navigate('/projects');
    }
  }

  // --- Edit dialog ---
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editType, setEditType] = useState<IssueType>('bug');
  const [editModuleId, setEditModuleId] = useState<string | null>(null);
  const [editDescription, setEditDescription] = useState('');
  const [editActual, setEditActual] = useState('');
  const [editExpected, setEditExpected] = useState('');
  const [editPriority, setEditPriority] = useState<IssuePriority>('medium');
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editGithubLinks, setEditGithubLinks] = useState<GithubLink[]>([]);
  const [editError, setEditError] = useState<string | null>(null);

  function openEditDialog() {
    if (!issue) return;
    setEditTitle(issue.title);
    setEditType(issue.type);
    setEditModuleId(issue.moduleId);
    setEditDescription(issue.description ?? '');
    setEditActual(issue.actualResult ?? '');
    setEditExpected(issue.expectedResult ?? '');
    setEditPriority(issue.priority);
    setEditTags(issue.tags.map((t) => t.name));
    setEditGithubLinks(issue.githubLinks.length ? issue.githubLinks : []);
    setEditError(null);
    setEditDialogOpen(true);
  }

  async function handleSaveEdit() {
    if (!issue) return;
    setEditError(null);
    try {
      await issueService.update(
        issue.id,
        issue.projectId,
        {
          title: editTitle,
          description: editDescription,
          actualResult: editActual,
          expectedResult: editExpected,
          priority: editPriority,
          type: editType,
          moduleId: editModuleId,
          githubLinks: editGithubLinks.filter((l) => l.url.trim()),
        },
        editTags,
      );
      setEditDialogOpen(false);
      await reload();
      await queryClient.invalidateQueries({ queryKey: queryKeys.issuesByProject(issue.projectId) });
      toast.current?.show({ severity: 'success', summary: 'Issue updated' });
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to save issue');
    }
  }

  async function handleChangeStatus(status: IssueStatus) {
    if (!issue) return;
    await issueService.changeStatus(issue.id, status);
    await reload();
    await queryClient.invalidateQueries({ queryKey: queryKeys.issuesByProject(issue.projectId) });
  }

  async function handleAssign(assignedTo: string | null | undefined) {
    if (!issue) return;
    await issueService.assign(issue.id, assignedTo ?? null);
    await reload();
    await queryClient.invalidateQueries({ queryKey: queryKeys.issuesByProject(issue.projectId) });
  }

  // Full-fidelity duplicate (no dialog here, unlike ProjectDetailPage's "New Issue" dialog
  // which doesn't expose actualResult/expectedResult/githubLinks) — new issue always starts
  // open/unassigned, same as issueService.create's own defaults.
  async function handleDuplicate() {
    if (!issue) return;
    const created = await issueService.create({
      projectId: issue.projectId,
      moduleId: issue.moduleId,
      type: issue.type,
      title: `${issue.title} (Copy)`,
      description: issue.description ?? undefined,
      actualResult: issue.actualResult ?? undefined,
      expectedResult: issue.expectedResult ?? undefined,
      priority: issue.priority,
      githubLinks: issue.githubLinks,
      tagNames: issue.tags.map((t) => t.name),
    });
    await queryClient.invalidateQueries({ queryKey: queryKeys.issuesByProject(issue.projectId) });
    toast.current?.show({ severity: 'success', summary: 'Issue duplicated' });
    navigate(`/issues/${created.id}`);
  }

  function handleDelete() {
    if (!issue) return;
    confirmDialog({
      header: 'Delete Issue',
      message: `Issue "${issue.title}" will be permanently deleted. Continue?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        await issueService.remove(issue.id);
        await queryClient.invalidateQueries({ queryKey: queryKeys.issuesByProject(issue.projectId) });
        toast.current?.show({ severity: 'success', summary: 'Issue deleted' });
        handleBack();
      },
    });
  }

  function handleArchive() {
    if (!issue) return;
    confirmDialog({
      header: 'Archive Issue',
      message: `Issue "${issue.title}" will be archived (closed). Continue?`,
      icon: 'pi pi-info-circle',
      acceptLabel: 'Archive',
      rejectLabel: 'Cancel',
      accept: async () => {
        await issueService.changeStatus(issue.id, 'closed');
        await reload();
        await queryClient.invalidateQueries({ queryKey: queryKeys.issuesByProject(issue.projectId) });
        toast.current?.show({ severity: 'success', summary: 'Issue archived' });
      },
    });
  }

  async function handleUpload(event: FileUploadHandlerEvent) {
    if (!issue) return;
    try {
      for (const file of event.files) {
        await attachmentService.upload(issue.id, file);
      }
      await queryClient.invalidateQueries({ queryKey: queryKeys.attachmentsByIssue(issue.id) });
      toast.current?.show({ severity: 'success', summary: 'Attachment uploaded' });
    } catch (err) {
      toast.current?.show({ severity: 'error', summary: 'Upload failed', detail: err instanceof Error ? err.message : undefined });
    }
  }

  function handleRemoveAttachment(attachment: Attachment) {
    confirmDialog({
      header: 'Delete Attachment',
      message: `Attachment "${attachment.fileName}" will be deleted. Continue?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        if (!issue) return;
        await attachmentService.remove(attachment.id, attachment.url);
        await queryClient.invalidateQueries({ queryKey: queryKeys.attachmentsByIssue(issue.id) });
      },
    });
  }

  if (loading || !issue) {
    const breadcrumbItems: BreadcrumbItem[] = [
      { label: 'Projects', path: '/projects' },
      { label: issue ? (projectName ?? '…') : '…', path: issue?.projectId ? `/projects/${issue.projectId}` : undefined },
      { label: loading ? '…' : 'Issue not found' },
    ];
    return (
      <div>
        <Breadcrumb items={breadcrumbItems} />
        {!loading && <p>Issue not found.</p>}
      </div>
    );
  }

  const breadcrumbItems: BreadcrumbItem[] = [
    { label: 'Projects', path: '/projects' },
    { label: projectName ?? '…', path: `/projects/${issue.projectId}` },
    { label: issue.code, path: `/issues/${issue.id}` },
  ];

  return (
    <div>
      <Toast ref={toast} />
      <ConfirmDialog />

      <Breadcrumb items={breadcrumbItems} />

      <div className="flex justify-content-between align-items-center mb-3">
        <div>
          <h2>Issue Detail</h2>
        </div>
        <div className="flex gap-2">
          {canManageIssues && <Button label="Edit" icon="pi pi-pencil" size="small" outlined onClick={openEditDialog} />}
          {canManageIssues && <Button label="Duplicate" icon="pi pi-copy" size="small" outlined onClick={handleDuplicate} />}
          {canDeleteContent ? (
            <Button label="Delete" icon="pi pi-trash" size="small" severity="danger" outlined onClick={handleDelete} />
          ) : (
            canManageIssues &&
            issue.status !== 'closed' && (
              <Button label="Archive" icon="pi pi-inbox" size="small" outlined onClick={handleArchive} />
            )
          )}
        </div>
      </div>

      <Card className="mb-3">
        <div className="flex align-items-center gap-2 mb-1">
          <h2 className="m-0">{issue.code} — {issue.title}</h2>
          <Tag value={ISSUE_TYPE_LABEL[issue.type]} severity={ISSUE_TYPE_SEVERITY[issue.type]} />
          <Tag value={ISSUE_PRIORITY_LABEL[issue.priority]} severity={ISSUE_PRIORITY_SEVERITY[issue.priority]} />
        </div>

        <div className="flex flex-wrap gap-4 mt-3 text-sm">
          <span className="text-color-secondary">
            Module: <span className="text-color">{issue.module?.name ?? '-'}</span>
          </span>
          {issue.tags.length > 0 && (
            <span className="text-color-secondary flex align-items-center gap-2">
              Tags:
              <span className="flex flex-wrap gap-1">
                {issue.tags.map((tag) => (
                  <Tag key={tag.id} value={tag.name} severity="info" />
                ))}
              </span>
            </span>
          )}
          <span className="text-color-secondary">Created: <span className="text-color">{formatDateTime(issue.createdAt)}</span></span>
          <span className="text-color-secondary">Last Updated: <span className="text-color">{formatDateTime(issue.updatedAt)}</span></span>
        </div>

        {issue.linkedTestResults.length > 0 && (
          <div className="mt-2 text-sm">
            <span className="text-color-secondary">Linked to Test Result: </span>
            <span className="flex flex-wrap gap-2 mt-1">
              {issue.linkedTestResults.map((link) => (
                <a key={link.id} className="entity-link" onClick={() => navigate(`/test-runs/${link.testRunId}`)}>
                  {link.testCaseCode} - {link.testCaseTitle} ({link.testRun?.code})
                </a>
              ))}
            </span>
          </div>
        )}

        {issue.githubLinks.length > 0 && (
          <div className="mt-2 text-sm">
            <span className="text-color-secondary">GitHub: </span>
            <span className="flex flex-wrap gap-2 mt-1">
              {issue.githubLinks.map((link, i) => (
                <a key={i} className="entity-link" href={link.url} target="_blank" rel="noreferrer">
                  {link.label || link.url}
                </a>
              ))}
            </span>
          </div>
        )}

        <div className="grid mt-3">
          <div className="col-12 md:col-6 flex flex-column gap-1">
            <label className="text-color-secondary text-sm">Status</label>
            <Dropdown value={issue.status} options={STATUS_OPTIONS} onChange={(e) => handleChangeStatus(e.value)} disabled={!canManageIssues} className="w-full" />
          </div>
          <div className="col-12 md:col-6 flex flex-column gap-1">
            <label className="text-color-secondary text-sm">Assigned To</label>
            <Dropdown
              value={issue.assignedTo}
              options={projectMembers.map((m) => ({ label: m.profile.fullName ?? m.profile.email, value: m.userId }))}
              onChange={(e) => handleAssign(e.value)}
              placeholder="Unassigned"
              showClear
              disabled={!canManageIssues}
              className="w-full"
            />
          </div>
        </div>
      </Card>

      {issue.description && (
        <Card title="Description" className="mb-3">
          <p className="m-0" style={{ whiteSpace: 'pre-wrap' }}>{issue.description}</p>
        </Card>
      )}

      {issue.actualResult && (
        <Card title="Actual Result" className="mb-3">
          <p className="m-0" style={{ whiteSpace: 'pre-wrap' }}>{issue.actualResult}</p>
        </Card>
      )}

      {issue.expectedResult && (
        <Card title="Expected Result" className="mb-3">
          <p className="m-0" style={{ whiteSpace: 'pre-wrap' }}>{issue.expectedResult}</p>
        </Card>
      )}

      <Card title="Attachment" className="mb-3">
        <div className="flex flex-column gap-2">
          {attachments.map((a) => (
            <div key={a.id} className="flex align-items-center justify-content-between p-2 border-round surface-100">
              <a className="entity-link" href={a.url} target="_blank" rel="noreferrer">
                <i className="pi pi-paperclip mr-2" />
                {a.fileName}
              </a>
              {canManageIssues && (
                <Button icon="pi pi-trash" size="small" text severity="danger" onClick={() => handleRemoveAttachment(a)} />
              )}
            </div>
          ))}
          {attachments.length === 0 && <p className="text-color-secondary text-sm m-0">No attachments yet.</p>}
          {canManageIssues && (
            <FileUpload mode="basic" chooseLabel="Upload File" customUpload uploadHandler={handleUpload} auto multiple />
          )}
        </div>
      </Card>

      {/* --- Edit Dialog --- */}
      <Dialog header="Edit Issue" visible={editDialogOpen} onHide={() => setEditDialogOpen(false)} style={{ width: '34rem' }}>
        <div className="flex flex-column gap-3">
          {editError && <small className="p-error">{editError}</small>}
          <div className="flex flex-column gap-1">
            <label htmlFor="issue-edit-title">Title</label>
            <InputText id="issue-edit-title" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} autoFocus />
          </div>
          <div className="grid">
            <div className="col-12 md:col-6 flex flex-column gap-1">
              <label htmlFor="issue-edit-type">Type</label>
              <Dropdown id="issue-edit-type" value={editType} options={TYPE_OPTIONS} onChange={(e) => setEditType(e.value)} className="w-full" />
            </div>
            <div className="col-12 md:col-6 flex flex-column gap-1">
              <label htmlFor="issue-edit-priority">Priority</label>
              <Dropdown id="issue-edit-priority" value={editPriority} options={PRIORITY_OPTIONS} onChange={(e) => setEditPriority(e.value)} className="w-full" />
            </div>
          </div>
          <div className="flex flex-column gap-1">
            <label htmlFor="issue-edit-module">Module (optional)</label>
            <Dropdown
              id="issue-edit-module"
              value={editModuleId}
              options={modules.map((m) => ({ label: m.name, value: m.id }))}
              onChange={(e) => setEditModuleId(e.value)}
              showClear
              placeholder="Not tied to a module"
              className="w-full"
            />
          </div>
          <div className="flex flex-column gap-1">
            <label htmlFor="issue-edit-tags">Tags</label>
            <MultiSelect
              id="issue-edit-tags"
              value={editTags}
              options={projectTags.map((t) => ({ label: t.name, value: t.name }))}
              onChange={(e) => setEditTags(e.value ?? [])}
              placeholder="Select tags"
              display="chip"
              filter
              className="w-full"
            />
          </div>
          <div className="flex flex-column gap-1">
            <label htmlFor="issue-edit-description">Description</label>
            <InputTextarea id="issue-edit-description" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={2} />
          </div>
          <div className="flex flex-column gap-1">
            <label htmlFor="issue-edit-actual">Actual Result</label>
            <InputTextarea id="issue-edit-actual" value={editActual} onChange={(e) => setEditActual(e.target.value)} rows={2} />
          </div>
          <div className="flex flex-column gap-1">
            <label htmlFor="issue-edit-expected">Expected Result</label>
            <InputTextarea id="issue-edit-expected" value={editExpected} onChange={(e) => setEditExpected(e.target.value)} rows={2} />
          </div>
          <div className="flex flex-column gap-1">
            <label>GitHub Links</label>
            {editGithubLinks.map((link, i) => (
              <div key={i} className="flex gap-2">
                <InputText
                  placeholder="URL"
                  value={link.url}
                  onChange={(e) => setEditGithubLinks((prev) => prev.map((l, idx) => (idx === i ? { ...l, url: e.target.value } : l)))}
                  className="w-full"
                />
                <InputText
                  placeholder="Label (optional)"
                  value={link.label ?? ''}
                  onChange={(e) => setEditGithubLinks((prev) => prev.map((l, idx) => (idx === i ? { ...l, label: e.target.value } : l)))}
                  className="w-full"
                />
                <Button icon="pi pi-times" text size="small" onClick={() => setEditGithubLinks((prev) => prev.filter((_, idx) => idx !== i))} />
              </div>
            ))}
            <Button
              label="Add Link"
              icon="pi pi-plus"
              text
              size="small"
              onClick={() => setEditGithubLinks((prev) => [...prev, { url: '', label: '' }])}
            />
          </div>
          <Button label="Save" size="small" onClick={handleSaveEdit} />
        </div>
      </Dialog>
    </div>
  );
}
