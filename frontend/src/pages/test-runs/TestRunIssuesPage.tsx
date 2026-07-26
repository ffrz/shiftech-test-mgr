import { useCallback, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Tag } from 'primereact/tag';
import { Dropdown } from 'primereact/dropdown';
import { MultiSelect } from 'primereact/multiselect';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Toast } from 'primereact/toast';
import { useIssuesByTestRun } from '../../hooks/useIssues';
import { useScreenSize } from '../../hooks/useScreenSize';
import { issueService } from '../../services/issueService';
import { projectMemberService } from '../../services/projectMemberService';
import { moduleService } from '../../services/moduleService';
import { tagService } from '../../services/tagService';
import type { GithubLink, IssuePriority, IssueStatus, IssueType, IssueWithDetails } from '../../types/domain';
import { PageHeader } from '../../components/ui/PageHeader';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import { RowActionsMenu } from '../../components/ui/RowActionsMenu';
import { testRunService } from '../../services/testRunService';
import { testPlanService } from '../../services/testPlanService';
import { projectService } from '../../services/projectService';
import { useProjectRole } from '../../hooks/useProjectRole';
import { queryKeys } from '../../hooks/queryKeys';
import { ISSUE_PRIORITY_LABEL, ISSUE_PRIORITY_SEVERITY, ISSUE_STATUS_LABEL } from '../../helpers/statusLabels';

const STATUS_OPTIONS: { label: string; value: IssueStatus }[] = (
  ['open', 'in_progress', 'resolved', 'verified', 'closed'] as const
).map((value) => ({ label: ISSUE_STATUS_LABEL[value], value }));

export function TestRunIssuesPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const testResultId = searchParams.get('testResultId');
  const { issues: allIssues, loading, reload } = useIssuesByTestRun(id ?? null);
  const issues = useMemo(
    () => (testResultId ? allIssues.filter((i) => i.linkedTestResults.some((r) => r.id === testResultId)) : allIssues),
    [allIssues, testResultId],
  );
  const queryClient = useQueryClient();
  const { lt } = useScreenSize();
  const isMobile = lt.sm;

  const { data: testRun = null } = useQuery({
    queryKey: queryKeys.testRun(id ?? ''),
    queryFn: () => testRunService.getById(id!),
    enabled: !!id,
  });
  // Project comes straight off the run itself (test_runs.project_id, E16) — not through
  // testPlan, since a custom/unplanned run has no test_plan_id and therefore no testPlan.
  const projectId = testRun?.projectId;
  const { data: testPlan = null } = useQuery({
    queryKey: queryKeys.testPlan(testRun?.testPlanId ?? ''),
    queryFn: () => testPlanService.getById(testRun!.testPlanId!),
    enabled: !!testRun?.testPlanId,
  });
  const { data: project } = useQuery({
    queryKey: queryKeys.project(projectId ?? ''),
    queryFn: () => projectService.getById(projectId!),
    enabled: !!projectId,
  });
  const projectName = project?.name ?? null;
  const { canManageIssues, canDeleteContent } = useProjectRole(projectId);

  const { data: projectMembers = [] } = useQuery({
    queryKey: queryKeys.projectMembers(projectId ?? ''),
    queryFn: () => projectMemberService.listByProject(projectId!),
    enabled: !!projectId,
  });

  const { data: modules = [] } = useQuery({
    queryKey: queryKeys.modules(projectId ?? ''),
    queryFn: () => moduleService.listByProject(projectId!),
    enabled: !!projectId,
  });

  const { data: allTags = [] } = useQuery({
    queryKey: queryKeys.tags(projectId ?? ''),
    queryFn: () => tagService.listByProject(projectId!),
    enabled: !!projectId,
  });

  // --- Edit dialog ---
  const toast = useRef<Toast>(null);
  const [editIssue, setEditIssue] = useState<IssueWithDetails | null>(null);
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

  function openEdit(row: IssueWithDetails) {
    setEditIssue(row);
    setEditTitle(row.title);
    setEditType(row.type);
    setEditModuleId(row.moduleId);
    setEditDescription(row.description ?? '');
    setEditActual(row.actualResult ?? '');
    setEditExpected(row.expectedResult ?? '');
    setEditPriority(row.priority);
    setEditTags(row.tags.map((t) => t.name));
    setEditGithubLinks(row.githubLinks.length ? row.githubLinks : []);
    setEditError(null);
  }

  function closeEdit() {
    setEditIssue(null);
    setEditError(null);
  }

  async function handleSaveEdit() {
    const issue = editIssue;
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
      closeEdit();
      await reload();
      await invalidateProjectIssues();
      toast.current?.show({ severity: 'success', summary: 'Issue updated' });
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to save issue');
    }
  }

  async function invalidateProjectIssues() {
    if (projectId) await queryClient.invalidateQueries({ queryKey: queryKeys.issuesByProject(projectId) });
  }

  async function handleChangeStatus(row: IssueWithDetails, status: IssueStatus) {
    await issueService.changeStatus(row.id, status);
    await reload();
    await invalidateProjectIssues();
  }

  async function handleAssign(row: IssueWithDetails, assignedTo: string | null | undefined) {
    await issueService.assign(row.id, assignedTo ?? null);
    await reload();
    await invalidateProjectIssues();
  }

  async function handleDuplicate(row: IssueWithDetails) {
    const created = await issueService.create({
      projectId: row.projectId,
      moduleId: row.moduleId,
      type: row.type,
      title: `${row.title} (Copy)`,
      description: row.description ?? undefined,
      actualResult: row.actualResult ?? undefined,
      expectedResult: row.expectedResult ?? undefined,
      priority: row.priority,
      githubLinks: row.githubLinks,
      tagNames: row.tags.map((t) => t.name),
    });
    await invalidateProjectIssues();
    navigate(`/issues/${created.id}`);
  }

  function handleDelete(row: IssueWithDetails) {
    confirmDialog({
      header: 'Delete Issue',
      message: `Issue "${row.title}" will be permanently deleted. Continue?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        await issueService.remove(row.id);
        await reload();
        await invalidateProjectIssues();
      },
    });
  }

  function handleArchive(row: IssueWithDetails) {
    confirmDialog({
      header: 'Archive Issue',
      message: `Issue "${row.title}" will be archived (closed). Continue?`,
      icon: 'pi pi-info-circle',
      acceptLabel: 'Archive',
      rejectLabel: 'Cancel',
      accept: async () => {
        await issueService.changeStatus(row.id, 'closed');
        await reload();
        await invalidateProjectIssues();
      },
    });
  }

  const mobileBodyTemplate = useCallback((row: IssueWithDetails) => (
    <div className="flex flex-column gap-2 py-1">
      <div className="font-medium">{row.code}</div>
      <div className="text-sm text-color-secondary">{row.title}</div>
      <div className="text-sm text-color-secondary">
        Priority: <Tag value={ISSUE_PRIORITY_LABEL[row.priority]} severity={ISSUE_PRIORITY_SEVERITY[row.priority]} />
      </div>
      <div className="text-sm text-color-secondary">Status: {ISSUE_STATUS_LABEL[row.status]}</div>
      <div className="text-sm text-color-secondary">Assigned to: {row.assignee?.displayName ?? row.assignee?.username ?? '-'}</div>
    </div>
  ), []);

  return (
    <div>
      <Toast ref={toast} />
      <ConfirmDialog />

      <Breadcrumb
        items={[
          { label: 'Projects', path: '/projects' },
          { label: testPlan ? (projectName ?? '…') : '…', path: testPlan ? `/projects/${testPlan.projectId}` : undefined },
        ]}
      />

      <PageHeader
        title="Issues"
        actions={
          testResultId ? (
            <Button
              label="Clear Test Case Filter"
              icon="pi pi-times"
              size="small"
              text
              onClick={() => setSearchParams((prev) => { const next = new URLSearchParams(prev); next.delete('testResultId'); return next; })}
            />
          ) : undefined
        }
      />

      <DataTable
        value={issues}
        loading={loading}
        paginator
        rows={10} rowsPerPageOptions={[5, 10, 25, 50]}
        emptyMessage="No issues yet"
        size="small"
        onRowClick={(e) => navigate(`/issues/${(e.data as IssueWithDetails).id}?testRunId=${id}`)}
        rowHover
        className="cursor-pointer"
      >
        {isMobile
          ? <Column header="Code" body={mobileBodyTemplate} />
          : <Column field="code" header="Code" sortable style={{ width: '7rem' }} />
        }
        {!isMobile && <Column field="title" header="Title" sortable />}
        {!isMobile && <Column field="priority" header="Priority" body={(row: IssueWithDetails) => <Tag value={ISSUE_PRIORITY_LABEL[row.priority]} severity={ISSUE_PRIORITY_SEVERITY[row.priority]} />} sortable />}
        {!isMobile && (
          <Column
            field="status"
            header="Status"
            body={(row: IssueWithDetails) => (
              <div onClick={(e) => e.stopPropagation()}>
                <Dropdown
                  value={row.status}
                  options={STATUS_OPTIONS}
                  onChange={(e) => handleChangeStatus(row, e.value)}
                  disabled={!canManageIssues}
                  className="w-12rem"
                />
              </div>
            )}
          />
        )}
        {!isMobile && (
          <Column
            field="assignee"
            header="Assigned To"
            body={(row: IssueWithDetails) => (
              <div onClick={(e) => e.stopPropagation()}>
                <Dropdown
                  value={row.assignedTo}
                  options={projectMembers.map((m) => ({ label: m.profile.displayName ?? m.profile.username, value: m.userId }))}
                  onChange={(e) => handleAssign(row, e.value)}
                  placeholder="Unassigned"
                  showClear
                  disabled={!canManageIssues}
                  className="w-12rem"
                />
              </div>
            )}
          />
        )}
        <Column
          header=""
          style={{ width: '3.5rem' }}
          body={(row: IssueWithDetails) => (
            <RowActionsMenu
              items={[
                { label: 'View Details', icon: 'pi pi-external-link', command: () => navigate(`/issues/${row.id}?testRunId=${id}`) },
                ...(canManageIssues ? [{ label: 'Edit', icon: 'pi pi-pencil', command: () => openEdit(row) }] : []),
                ...(canManageIssues ? [{ label: 'Duplicate', icon: 'pi pi-copy', command: () => handleDuplicate(row) }] : []),
                ...(canDeleteContent
                  ? [{ label: 'Delete', icon: 'pi pi-trash', className: 'p-error', command: () => handleDelete(row) }]
                  : canManageIssues && row.status !== 'closed'
                    ? [{ label: 'Archive', icon: 'pi pi-inbox', command: () => handleArchive(row) }]
                    : []),
              ]}
            />
          )}
        />
      </DataTable>

      {/* --- Edit Issue Dialog --- */}
      <Dialog
        header="Edit Issue"
        visible={!!editIssue}
        onHide={closeEdit}
        style={{ width: '34rem' }}
      >
        <div className="flex flex-column gap-3">
          {editError && <small className="p-error">{editError}</small>}
          <div className="flex flex-column gap-1">
            <label htmlFor="edit-title">Title</label>
            <InputText id="edit-title" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} autoFocus />
          </div>
          <div className="flex gap-2">
            <div className="flex flex-column gap-1 flex-1">
              <label htmlFor="edit-type">Type</label>
              <Dropdown
                id="edit-type"
                value={editType}
                options={[
                  { label: 'Bug', value: 'bug' },
                  { label: 'Feature', value: 'feature' },
                  { label: 'Improvement', value: 'improvement' },
                  { label: 'Task', value: 'task' },
                ]}
                onChange={(e) => setEditType(e.value)}
                className="w-full"
              />
            </div>
            <div className="flex flex-column gap-1 flex-1">
              <label htmlFor="edit-priority">Priority</label>
              <Dropdown
                id="edit-priority"
                value={editPriority}
                options={[
                  { label: 'Low', value: 'low' },
                  { label: 'Medium', value: 'medium' },
                  { label: 'High', value: 'high' },
                  { label: 'Critical', value: 'critical' },
                ]}
                onChange={(e) => setEditPriority(e.value)}
                className="w-full"
              />
            </div>
          </div>
          {projectId && (
            <div className="flex gap-2">
              <div className="flex flex-column gap-1 flex-1">
                <label htmlFor="edit-module">Module</label>
                <Dropdown
                  id="edit-module"
                  value={editModuleId}
                  options={modules.map((m) => ({ label: m.name, value: m.id }))}
                  onChange={(e) => setEditModuleId(e.value)}
                  placeholder="No module"
                  showClear
                  className="w-full"
                />
              </div>
              <div className="flex flex-column gap-1 flex-1">
                <label htmlFor="edit-tags">Tags</label>
                <MultiSelect
                  id="edit-tags"
                  value={editTags}
                  options={allTags.map((t) => ({ label: t.name, value: t.name }))}
                  onChange={(e) => setEditTags(e.value ?? [])}
                  placeholder="Select tags"
                  className="w-full"
                  showClear
                />
              </div>
            </div>
          )}
          <div className="flex flex-column gap-1">
            <label htmlFor="edit-description">Description</label>
            <InputTextarea id="edit-description" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={2} />
          </div>
          <div className="flex gap-2">
            <div className="flex flex-column gap-1 flex-1">
              <label htmlFor="edit-actual">Actual Result</label>
              <InputTextarea id="edit-actual" value={editActual} onChange={(e) => setEditActual(e.target.value)} rows={2} />
            </div>
            <div className="flex flex-column gap-1 flex-1">
              <label htmlFor="edit-expected">Expected Result</label>
              <InputTextarea id="edit-expected" value={editExpected} onChange={(e) => setEditExpected(e.target.value)} rows={2} />
            </div>
          </div>
          <Button label="Save" size="small" onClick={handleSaveEdit} />
        </div>
      </Dialog>
    </div>
  );
}
