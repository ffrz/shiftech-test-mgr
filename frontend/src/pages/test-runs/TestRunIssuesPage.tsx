import { useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Tag } from 'primereact/tag';
import { Dropdown } from 'primereact/dropdown';
import { Button } from 'primereact/button';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { useIssuesByTestRun } from '../../hooks/useIssues';
import { issueService } from '../../services/issueService';
import { profileService } from '../../services/profileService';
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

  const { data: approvedUsers = [] } = useQuery({
    queryKey: queryKeys.profiles(),
    queryFn: async () => (await profileService.listAll()).filter((p) => p.role === 'user' || p.role === 'admin'),
  });
  const { data: testRun = null } = useQuery({
    queryKey: queryKeys.testRun(id ?? ''),
    queryFn: () => testRunService.getById(id!),
    enabled: !!id,
  });
  const { data: testPlan = null } = useQuery({
    queryKey: queryKeys.testPlan(testRun?.testPlanId ?? ''),
    queryFn: () => testPlanService.getById(testRun!.testPlanId),
    enabled: !!testRun?.testPlanId,
  });
  const { data: project } = useQuery({
    queryKey: queryKeys.project(testPlan?.projectId ?? ''),
    queryFn: () => projectService.getById(testPlan!.projectId),
    enabled: !!testPlan?.projectId,
  });
  const projectName = project?.name ?? null;
  const { canManageIssues, canDeleteContent } = useProjectRole(testPlan?.projectId);

  async function invalidateProjectIssues() {
    if (testPlan) await queryClient.invalidateQueries({ queryKey: queryKeys.issuesByProject(testPlan.projectId) });
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

  function handleDelete(row: IssueWithDetails) {
    confirmDialog({
      header: 'Hapus Issue',
      message: `Issue "${row.title}" akan dihapus permanen. Lanjutkan?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Hapus',
      rejectLabel: 'Batal',
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
      header: 'Arsipkan Issue',
      message: `Issue "${row.title}" akan diarsipkan (ditutup). Lanjutkan?`,
      icon: 'pi pi-info-circle',
      acceptLabel: 'Arsipkan',
      rejectLabel: 'Batal',
      accept: async () => {
        await issueService.changeStatus(row.id, 'closed');
        await reload();
        await invalidateProjectIssues();
      },
    });
  }

  return (
    <div>
      <ConfirmDialog />

      <Breadcrumb
        items={[
          { label: 'Projects', path: '/' },
          { label: testPlan ? (projectName ?? '…') : '…', path: testPlan ? `/projects/${testPlan.projectId}` : undefined },
        ]}
      />

      <PageHeader
        title="Issues"
        actions={
          testResultId ? (
            <Button
              label="Hapus Filter Test Case"
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
        rows={10}
        emptyMessage="Belum ada issue"
        size="small"
        onRowClick={(e) => navigate(`/issues/${(e.data as IssueWithDetails).id}?testRunId=${id}`)}
        rowHover
        className="cursor-pointer"
      >
        <Column field="code" header="Kode" sortable style={{ width: '7rem' }} />
        <Column field="title" header="Judul" sortable />
        <Column field="priority" header="Prioritas" body={(row: IssueWithDetails) => <Tag value={ISSUE_PRIORITY_LABEL[row.priority]} severity={ISSUE_PRIORITY_SEVERITY[row.priority]} />} sortable />
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
        <Column
          field="assignee"
          header="Ditugaskan Ke"
          body={(row: IssueWithDetails) => (
            <div onClick={(e) => e.stopPropagation()}>
              <Dropdown
                value={row.assignedTo}
                options={approvedUsers.map((u) => ({ label: u.fullName ?? u.email, value: u.id }))}
                onChange={(e) => handleAssign(row, e.value)}
                placeholder="Belum ditugaskan"
                showClear
                disabled={!canManageIssues}
                className="w-12rem"
              />
            </div>
          )}
        />
        <Column
          header=""
          style={{ width: '3.5rem' }}
          body={(row: IssueWithDetails) => (
            <RowActionsMenu
              items={[
                { label: 'Buka Detail', icon: 'pi pi-external-link', command: () => navigate(`/issues/${row.id}?testRunId=${id}`) },
                ...(canDeleteContent
                  ? [{ label: 'Hapus', icon: 'pi pi-trash', className: 'p-error', command: () => handleDelete(row) }]
                  : canManageIssues && row.status !== 'closed'
                    ? [{ label: 'Arsipkan', icon: 'pi pi-inbox', command: () => handleArchive(row) }]
                    : []),
              ]}
            />
          )}
        />
      </DataTable>
    </div>
  );
}
