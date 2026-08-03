import { useCallback, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Tag } from 'primereact/tag';
import { Dropdown } from 'primereact/dropdown';
import { Button } from 'primereact/button';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { useIssuesByTestRun } from '../../hooks/useIssues';
import { useScreenSize } from '../../hooks/useScreenSize';
import { issueService } from '../../services/issueService';
import { projectMemberService } from '../../services/projectMemberService';
import { moduleService } from '../../services/moduleService';
import { tagService } from '../../services/tagService';
import { testRoleService } from '../../services/testRoleService';
import type { IssueStatus, IssueWithDetails } from '../../types/domain';
import { PageHeader } from '../../components/ui/PageHeader';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import { RowActionsMenu } from '../../components/ui/RowActionsMenu';
import { dataTablePaginatorProps } from '../../components/ui/dataTablePaginator';
import { IssueEditor, type IssueFormData } from '../../components/issues/IssueEditor';
import { testRunService } from '../../services/testRunService';
import { testPlanService } from '../../services/testPlanService';
import { projectService } from '../../services/projectService';
import { useProjectRole } from '../../hooks/useProjectRole';
import { useAuthContext } from '../../hooks/useAuth';
import { queryKeys } from '../../hooks/queryKeys';
import { ISSUE_PRIORITY_LABEL, ISSUE_PRIORITY_SEVERITY, ISSUE_STATUS_LABEL } from '../../helpers/statusLabels';
import { toastHelper } from '../../helpers/toast';
import { memberSelectLabel } from '../../helpers/memberLabels';

const STATUS_OPTIONS: { label: string; value: IssueStatus }[] = (
  ['backlog', 'open', 'in_progress', 'resolved', 'verified', 'closed', 'rejected', 'duplicate'] as const
).map((value) => ({ label: ISSUE_STATUS_LABEL[value], value }));

export function TestRunIssuesPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const testResultId = searchParams.get('testResultId');
  const { user, profile } = useAuthContext();
  const actorName = profile?.displayName ?? profile?.username ?? null;
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
  const isRunCompleted = testRun?.status === 'completed';

  const { data: projectMembers = [] } = useQuery({
    queryKey: queryKeys.projectMembers(projectId ?? ''),
    queryFn: () => projectMemberService.listByProject(projectId!),
    enabled: !!projectId,
  });

  const { data: fetchedModules = [] } = useQuery({
    queryKey: queryKeys.modules(projectId ?? ''),
    queryFn: () => moduleService.listByProject(projectId!),
    enabled: !!projectId,
  });

  const { data: fetchedTags = [] } = useQuery({
    queryKey: queryKeys.tags(projectId ?? ''),
    queryFn: () => tagService.listByProject(projectId!),
    enabled: !!projectId,
  });

  const { data: fetchedTestRoles = [] } = useQuery({
    queryKey: queryKeys.testRoles(projectId ?? ''),
    queryFn: () => testRoleService.listByProject(projectId!),
    enabled: !!projectId,
  });

  // Mutable copies so IssueEditor's quick-add can extend them without cache invalidation.
  const [editableModules, setEditableModules] = useState<typeof fetchedModules>([]);
  const [editableTags, setEditableTags] = useState<typeof fetchedTags>([]);
  const [editableTestRoles, setEditableTestRoles] = useState<typeof fetchedTestRoles>([]);
  if (editableModules !== fetchedModules && fetchedModules.length > 0 && editableModules.length === 0) {
    setEditableModules(fetchedModules);
  }
  if (editableTags !== fetchedTags && fetchedTags.length > 0 && editableTags.length === 0) {
    setEditableTags(fetchedTags);
  }
  if (editableTestRoles !== fetchedTestRoles && fetchedTestRoles.length > 0 && editableTestRoles.length === 0) {
    setEditableTestRoles(fetchedTestRoles);
  }

  // --- Edit dialog ---
  const [editIssue, setEditIssue] = useState<IssueWithDetails | null>(null);

  function openEdit(row: IssueWithDetails) {
    setEditIssue(row);
  }

  function closeEdit() {
    setEditIssue(null);
  }

  async function handleSaveEdit(data: IssueFormData) {
    const issue = editIssue;
    if (!issue) return;
    await issueService.update(
      issue.id,
      issue.projectId,
      {
        code: data.code,
        title: data.title,
        description: data.description,
        actualResult: data.actualResult,
        expectedResult: data.expectedResult,
        priority: data.priority,
        type: data.type,
        moduleId: data.moduleId,
        targetRoleId: data.targetRoleId,
        externalLinks: data.externalLinks,
      },
      data.tagNames,
      user?.id ?? null,
    );
    closeEdit();
    await reload();
    await invalidateProjectIssues();
    toastHelper.success('Issue updated');
  }

  async function invalidateProjectIssues() {
    if (projectId) await queryClient.invalidateQueries({ queryKey: queryKeys.issuesByProject(projectId) });
  }

  async function handleChangeStatus(row: IssueWithDetails, status: IssueStatus) {
    if (!user) return;
    await issueService.changeStatus(row.id, status, { projectId: row.projectId, actorId: user.id, actorName });
    await reload();
    await invalidateProjectIssues();
  }

  async function handleAssign(row: IssueWithDetails, assignedTo: string | null | undefined) {
    if (!user) return;
    const assigneeName = assignedTo
      ? projectMembers.find((m) => m.userId === assignedTo)?.profile?.displayName ?? projectMembers.find((m) => m.userId === assignedTo)?.profile?.username
      : null;
    await issueService.assign(row.id, assignedTo ?? null, { projectId: row.projectId, actorId: user.id, actorName, assigneeName });
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
      targetRoleId: row.targetRoleId,
      externalLinks: row.externalLinks,
      tagNames: row.tags.map((t) => t.name),
      createdBy: user?.id ?? null,
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
        await issueService.remove(row.id, { actorId: user?.id });
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
        if (!user) return;
        await issueService.changeStatus(row.id, 'closed', { projectId: row.projectId, actorId: user.id, actorName });
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
      <ConfirmDialog />

      <Breadcrumb
        items={[
          { label: 'Projects', path: '/projects' },
          { label: testPlan ? (projectName ?? '') : '', path: testPlan ? `/projects/${testPlan.projectId}` : undefined },
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
        {...dataTablePaginatorProps}
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
                  disabled={!canManageIssues || isRunCompleted}
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
                  options={projectMembers.map((m) => ({ label: memberSelectLabel(m), value: m.userId }))}
                  onChange={(e) => handleAssign(row, e.value)}
                  placeholder="Unassigned"
                  showClear
                  disabled={!canManageIssues || isRunCompleted}
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
                ...(!isRunCompleted && canManageIssues ? [{ label: 'Edit', icon: 'pi pi-pencil', command: () => openEdit(row) }] : []),
                ...(!isRunCompleted && canManageIssues ? [{ label: 'Duplicate', icon: 'pi pi-copy', command: () => handleDuplicate(row) }] : []),
                ...(!isRunCompleted && canDeleteContent
                  ? [{ label: 'Delete', icon: 'pi pi-trash', className: 'p-error', command: () => handleDelete(row) }]
                  : !isRunCompleted && canManageIssues && row.status !== 'closed'
                    ? [{ label: 'Archive', icon: 'pi pi-inbox', command: () => handleArchive(row) }]
                    : []),
              ]}
            />
          )}
        />
      </DataTable>

      {/* --- Edit Issue Dialog (reusable IssueEditor) --- */}
      <IssueEditor
        visible={!!editIssue && !isRunCompleted}
        onHide={closeEdit}
        onSave={handleSaveEdit}
        onStatusChange={(status) => handleChangeStatus(editIssue!, status)}
        onAssigneeChange={(assignedTo) => handleAssign(editIssue!, assignedTo)}
        projectId={projectId ?? ''}
        mode="edit"
        issueId={editIssue?.id}
        projectMembers={projectMembers}
        initialData={editIssue ? {
          code: editIssue.code,
          title: editIssue.title,
          type: editIssue.type,
          priority: editIssue.priority,
          status: editIssue.status,
          moduleId: editIssue.moduleId,
          assignedTo: editIssue.assignedTo,
          targetRoleId: editIssue.targetRoleId,
          description: editIssue.description ?? '',
          actualResult: editIssue.actualResult ?? '',
          expectedResult: editIssue.expectedResult ?? '',
          tagNames: editIssue.tags.map((t) => t.name),
          externalLinks: editIssue.externalLinks,
        } : null}
        modules={editableModules}
        tags={editableTags}
        testRoles={editableTestRoles}
        onModulesChange={setEditableModules}
        onTagsChange={setEditableTags}
        onTestRolesChange={setEditableTestRoles}
      />
    </div>
  );
}
