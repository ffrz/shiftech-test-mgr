import { useCallback, useMemo } from 'react';
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
import type { IssueStatus, IssueWithDetails } from '../../types/domain';
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
      <div className="text-sm text-color-secondary">Assigned to: {row.assignee?.fullName ?? row.assignee?.email ?? '-'}</div>
    </div>
  ), []);

  return (
    <div>
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
                  options={projectMembers.map((m) => ({ label: m.profile.fullName ?? m.profile.email, value: m.userId }))}
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
    </div>
  );
}
