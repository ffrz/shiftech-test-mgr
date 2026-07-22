import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Tag } from 'primereact/tag';
import { Dropdown } from 'primereact/dropdown';
import { Button } from 'primereact/button';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { useIssuesByTestRun } from '../../hooks/useIssues';
import { issueService } from '../../services/issueService';
import { profileService } from '../../services/profileService';
import type { IssueStatus, IssueWithDetails, Profile } from '../../types/domain';
import { PageHeader } from '../../components/ui/PageHeader';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import { RowActionsMenu } from '../../components/ui/RowActionsMenu';
import { testRunService } from '../../services/testRunService';
import { testPlanService } from '../../services/testPlanService';
import { projectService } from '../../services/projectService';
import { useProjectRole } from '../../hooks/useProjectRole';
import type { TestPlan, TestRun } from '../../types/domain';
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
  const [approvedUsers, setApprovedUsers] = useState<Profile[]>([]);
  const [testRun, setTestRun] = useState<TestRun | null>(null);
  const [testPlan, setTestPlan] = useState<TestPlan | null>(null);
  const [projectName, setProjectName] = useState<string | null>(null);
  const { canManageIssues, canDeleteContent } = useProjectRole(testPlan?.projectId);

  useEffect(() => {
    profileService.listAll().then((all) => setApprovedUsers(all.filter((p) => p.role === 'user' || p.role === 'admin')));
  }, []);

  useEffect(() => {
    if (id) testRunService.getById(id).then(setTestRun);
  }, [id]);

  useEffect(() => {
    if (testRun) testPlanService.getById(testRun.testPlanId).then(setTestPlan);
  }, [testRun]);

  useEffect(() => {
    if (testPlan) projectService.getById(testPlan.projectId).then((p) => setProjectName(p?.name ?? null));
  }, [testPlan]);

  async function handleChangeStatus(row: IssueWithDetails, status: IssueStatus) {
    await issueService.changeStatus(row.id, status);
    await reload();
  }

  async function handleAssign(row: IssueWithDetails, assignedTo: string | null | undefined) {
    await issueService.assign(row.id, assignedTo ?? null);
    await reload();
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
