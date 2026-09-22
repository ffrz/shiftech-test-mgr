import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Tag } from 'primereact/tag';
import { Dropdown } from 'primereact/dropdown';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { useProjectRole } from '../../hooks/useProjectRole';
import { useAuthContext } from '../../hooks/useAuth';
import { projectService } from '../../services/projectService';
import { testPlanService } from '../../services/testPlanService';
import { queryKeys } from '../../hooks/queryKeys';
import type { TestPlan, TestPlanStatus } from '../../types/domain';
import { formatDate } from '../../helpers/dateFormatter';
import { useScreenSize } from '../../hooks/useScreenSize';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import { PageHeader } from '../../components/ui/PageHeader';
import { RowActionsMenu } from '../../components/ui/RowActionsMenu';
import { dataTablePaginatorProps } from '../../components/ui/dataTablePaginator';
import { useTableHeight } from '../../hooks/useTableHeight';
import { useColumnPreferences, type ColumnDef } from '../../hooks/useColumnPreferences';
import { ColumnPickerButton } from '../../components/ui/ColumnPickerButton';
import { TEST_PLAN_STATUS_LABEL, TEST_PLAN_STATUS_SEVERITY } from '../../helpers/statusLabels';
import { toastHelper } from '../../helpers/toast';

const TEST_PLAN_STATUS_OPTIONS: TestPlanStatus[] = ['draft', 'active', 'completed', 'archived'];

type TestPlanLastRun = { runAt: string; total: number; pass: number; fail: number } | null;
type TestPlanRow = TestPlan & { lastRun: TestPlanLastRun };

function formatLastRun(lastRun: TestPlanLastRun): string {
  if (!lastRun) return 'Never run';
  const pct = lastRun.total > 0 ? Math.round((lastRun.pass / lastRun.total) * 100) : 0;
  return `${formatDate(lastRun.runAt)} · ${pct}% pass`;
}

const TEST_PLANS_PAGE_COLUMNS: ColumnDef[] = [
  { key: 'code', label: 'Code', fallbackWidth: '7rem' },
  { key: 'name', label: 'Name' },
  { key: 'status', label: 'Status', fallbackWidth: '9rem' },
  { key: 'lastRun', label: 'Last Run', fallbackWidth: '13rem' },
  { key: 'updatedAt', label: 'Last Updated', fallbackWidth: '10rem' },
  { key: 'actions', label: 'Actions', locked: true },
];

export function TestPlansPage() {
  const navigate = useNavigate();
  const [projectId, setProjectId] = useState<string | null>(null);
  const { canEditContent } = useProjectRole(projectId ?? undefined);
  const { user } = useAuthContext();
  const queryClient = useQueryClient();

  const { data: testPlans = [], isLoading: loading } = useQuery({
    queryKey: queryKeys.testPlansWithRunStats(projectId ?? ''),
    queryFn: () => testPlanService.listByProjectWithRunStats(projectId!),
    enabled: !!projectId,
  });

  const reload = () => (projectId ? queryClient.invalidateQueries({ queryKey: queryKeys.testPlansWithRunStats(projectId) }) : Promise.resolve());

  const { lt } = useScreenSize();
  const isMobile = lt.sm;

  const { containerRef, tableHeight } = useTableHeight({ enabled: isMobile, deps: [isMobile] });
  const cp = useColumnPreferences('testPlansCrossProject', TEST_PLANS_PAGE_COLUMNS);

  const { data: projects = [] } = useQuery({
    queryKey: queryKeys.projects(),
    queryFn: () => projectService.list(),
  });

  async function handleChangeStatus(row: TestPlan, status: TestPlanStatus) {
    if (status === row.status || !projectId || !user) return;
    await testPlanService.changeStatus(row.id, status, { projectId, actorId: user.id });
    await reload();
    toastHelper.success(`Status changed to ${TEST_PLAN_STATUS_LABEL[status]}`);
  }

  // --- Duplicate: quick access from this cross-project list without opening the detail page ---
  const [duplicateRow, setDuplicateRow] = useState<TestPlan | null>(null);
  const [duplicateName, setDuplicateName] = useState('');
  const [duplicateError, setDuplicateError] = useState<string | null>(null);
  const duplicatePlanNameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (duplicateError && duplicatePlanNameRef.current) {
      duplicatePlanNameRef.current.focus();
      duplicatePlanNameRef.current.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
    }
  }, [duplicateError]);

  function openDuplicateDialog(row: TestPlan) {
    setDuplicateRow(row);
    setDuplicateName(`${row.name} (Copy)`);
    setDuplicateError(null);
  }

  async function handleDuplicate() {
    if (!duplicateRow) return;
    setDuplicateError(null);
    try {
      await testPlanService.duplicate(duplicateRow.id, duplicateName);
      setDuplicateRow(null);
      await reload();
      toastHelper.success('Test plan duplicated');
    } catch (err) {
      setDuplicateError(err instanceof Error ? err.message : 'Failed to duplicate test plan');
    }
  }

  const mobileCodeBody = useCallback((row: TestPlanRow) => (
    <div className="flex flex-column gap-2 py-1">
      <span className="font-medium">{row.code}</span>
      <span className="text-sm text-color-secondary">{row.name}</span>
      <span><Tag value={TEST_PLAN_STATUS_LABEL[row.status]} severity={TEST_PLAN_STATUS_SEVERITY[row.status]} /></span>
      <span className="text-sm text-color-secondary">{formatDate(row.updatedAt)}</span>
      <span className="text-sm text-color-secondary">{formatLastRun(row.lastRun)}</span>
    </div>
  ), []);

  const lastRunBody = useCallback((row: TestPlanRow) => (
    <span className="text-sm white-space-nowrap">{formatLastRun(row.lastRun)}</span>
  ), []);

  return (
    <div>
      <Breadcrumb items={[{ label: 'Test Plans' }]} />
      <PageHeader
        title="Test Plans"
        actions={
          <div className="flex align-items-center gap-2">
            <Dropdown
              value={projectId}
              options={projects.map((p) => ({ label: p.name, value: p.id }))}
              onChange={(e) => setProjectId(e.value)}
              placeholder="Select project"
              className="w-15rem"
              showClear
            />
          </div>
        }
      />

      {!projectId && (
        <p className="text-color-secondary">
          Select a project above to view its test plans. New test plans are created from the project detail page.
        </p>
      )}

      <div ref={containerRef}>
        <DataTable value={testPlans} loading={loading} {...dataTablePaginatorProps} scrollHeight={tableHeight} rows={10} rowsPerPageOptions={[5, 10, 25, 50]} emptyMessage="No test plans yet" size="small"
          selectionMode="single" onSelectionChange={(e) => navigate(`/test-plans/${(e.value as TestPlanRow).id}`)}
          resizableColumns={!isMobile} columnResizeMode="expand" onColumnResizeEnd={cp.onColumnResizeEnd} tableStyle={isMobile ? undefined : cp.tableStyle} className={isMobile ? undefined : 'dt-resizable'}>
        {isMobile
          ? <Column field="code" header="Code" sortable className="dt-code-nowrap" headerClassName="dt-code-nowrap" body={mobileCodeBody} />
          : cp.arrange([
            ['code', <Column key="code" field="code" header="Code" sortable style={{ width: cp.colWidth('code', '7rem') }} className="dt-code-nowrap" headerClassName="dt-code-nowrap" />],
            ['name', <Column key="name" field="name" header="Name" sortable className="dt-title-fill" headerClassName="dt-title-fill" style={{ width: cp.colWidth('name') }} />],
            ['status', <Column key="status" field="status" header="Status" style={{ width: cp.colWidth('status', '9rem') }} body={(row: TestPlanRow) => <Tag value={TEST_PLAN_STATUS_LABEL[row.status]} severity={TEST_PLAN_STATUS_SEVERITY[row.status]} />} />],
            ['lastRun', <Column key="lastRun" columnKey="lastRun" header="Last Run" style={{ width: cp.colWidth('lastRun', '13rem') }} bodyClassName="dt-cell-no-ellipsis" body={lastRunBody} />],
            ['updatedAt', <Column key="updatedAt" field="updatedAt" header="Last Updated" style={{ width: cp.colWidth('updatedAt', '10rem') }} body={(row: TestPlanRow) => formatDate(row.updatedAt)} sortable />],
            ...(canEditContent ? [['actions', <Column
              key="actions"
              columnKey="actions"
              header={(
                <ColumnPickerButton
                  reorderableColumns={cp.reorderableColumns}
                  order={cp.order}
                  isVisible={cp.isVisible}
                  setVisible={cp.setVisible}
                  reset={cp.reset}
                />
              )}
              resizeable={false}
              className="dt-col-actions"
              headerClassName="dt-col-actions"
              style={{ width: '4rem', minWidth: '4rem' }}
              body={(row: TestPlanRow) => (
                <RowActionsMenu
                  items={[
                    { label: 'Duplicate', icon: 'pi pi-copy', command: () => openDuplicateDialog(row) },
                    ...TEST_PLAN_STATUS_OPTIONS.filter((s) => s !== row.status).map((status) => ({
                      label: `Change to ${TEST_PLAN_STATUS_LABEL[status]}`,
                      command: () => handleChangeStatus(row, status),
                    })),
                  ]}
                />
              )}
            />] as [string, React.ReactElement]] : []),
          ])}
      </DataTable>
      </div>

      <Dialog header="Duplicate Test Plan" visible={!!duplicateRow} onHide={() => setDuplicateRow(null)} style={{ width: '28rem' }}>
        <div className="flex flex-column gap-3">
          <div className="flex flex-column gap-1">
            <label htmlFor="duplicate-plan-name" className={duplicateError ? 'p-error' : ''}>New Test Plan Name</label>
            <InputText id="duplicate-plan-name" ref={duplicatePlanNameRef} value={duplicateName} onChange={(e) => setDuplicateName(e.target.value)} className={duplicateError ? 'p-invalid' : ''} autoFocus />
            {duplicateError && <small className="p-error">{duplicateError}</small>}
          </div>
          <Button label="Duplicate" size="small" onClick={handleDuplicate} />
        </div>
      </Dialog>
    </div>
  );
}
