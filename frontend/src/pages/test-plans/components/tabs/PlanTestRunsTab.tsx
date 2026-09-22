import { useNavigate } from 'react-router-dom';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Tag } from 'primereact/tag';
import { Button } from 'primereact/button';
import { MultiSelect } from 'primereact/multiselect';
import SearchInput from '../../../../components/ui/SearchInput';
import { FilterToolbar } from '../../../../components/ui/FilterToolbar';
import { dataTablePaginatorProps } from '../../../../components/ui/dataTablePaginator';
import { useTableHeight } from '../../../../hooks/useTableHeight';
import { useColumnPreferences, type ColumnDef } from '../../../../hooks/useColumnPreferences';
import { ColumnPickerButton } from '../../../../components/ui/ColumnPickerButton';
import type { TestRun, TestRunStatus } from '../../../../types/domain';
import { formatDateTime } from '../../../../helpers/dateFormatter';
import {
  TEST_RUN_STATUS_LABEL,
  TEST_RUN_STATUS_SEVERITY,
  TEST_RESULT_STATUS_SEVERITY,
} from '../../../../helpers/statusLabels';
import type { TestRunWithSummary } from '../../../../hooks/useTestRuns';

const TEST_RUN_STATUS_OPTIONS: { label: string; value: TestRunStatus }[] = (
  ['in_progress', 'completed'] as const
).map((v) => ({ label: TEST_RUN_STATUS_LABEL[v], value: v }));

const PLAN_TEST_RUNS_COLUMNS: ColumnDef[] = [
  { key: 'code', label: 'Code', fallbackWidth: '7rem' },
  { key: 'name', label: 'Run Name' },
  { key: 'status', label: 'Status', fallbackWidth: '7rem' },
  { key: 'results', label: 'Results', fallbackWidth: '8rem' },
  { key: 'tester', label: 'Tester', fallbackWidth: '11rem' },
  { key: 'completedAt', label: 'Completed', fallbackWidth: '11rem' },
  { key: 'actions', label: 'Actions', locked: true },
];

type PlanTestRunsTabProps = {
  testRuns: TestRunWithSummary[];
  total: number;
  loading: boolean;
  isMobile: boolean;
  /** True while this tab's TabView panel is the active one — hidden panels are kept
   * mounted by PrimeReact, so table-height measurement must be skipped until visible. */
  visible: boolean;
  /** Test plan detail section collapsed state (mobile-first collapse) — feeds table-height re-measure. */
  detailCollapsed: boolean;
  canRunTests: boolean;
  canDeleteContent: boolean;
  filterVisible: boolean;
  onToggleFilterVisible: () => void;
  search: string;
  onSearchChange: (value: string) => void;
  statusFilters: TestRunStatus[];
  onStatusFiltersChange: (value: TestRunStatus[]) => void;
  onResetFilters: () => void;
  first: number;
  rows: number;
  onPage: (first: number, rows: number) => void;
  onStartRun: () => void;
  onDeleteRun: (row: TestRun) => void;
};

export function PlanTestRunsTab({
  testRuns,
  total,
  loading,
  isMobile,
  visible,
  detailCollapsed,
  canRunTests,
  canDeleteContent,
  filterVisible,
  onToggleFilterVisible,
  search,
  onSearchChange,
  statusFilters,
  onStatusFiltersChange,
  onResetFilters,
  first,
  rows,
  onPage,
  onStartRun,
  onDeleteRun,
}: PlanTestRunsTabProps) {
  const navigate = useNavigate();

  // Mirrors the parent-controlled filter visibility and drives table re-measurement.
  const { containerRef, tableHeight } = useTableHeight({
    enabled: isMobile,
    deps: [isMobile, visible, detailCollapsed, filterVisible],
  });
  const cp = useColumnPreferences('planTestRuns', PLAN_TEST_RUNS_COLUMNS);

  const mobileRunNameBody = (row: TestRunWithSummary) => (
    <div className="flex flex-column gap-2 py-1">
      <span className="font-medium">{row.name}</span>
      <span className="text-sm text-color-secondary">{row.code}</span>
      <span><Tag value={TEST_RUN_STATUS_LABEL[row.status]} severity={TEST_RUN_STATUS_SEVERITY[row.status]} /></span>
      <div className="flex gap-1 align-items-center">
        <Tag value={String(row.pass)} severity={TEST_RESULT_STATUS_SEVERITY.pass} />
        <Tag value={String(row.fail)} severity={TEST_RESULT_STATUS_SEVERITY.fail} />
        <span className="text-color-secondary text-sm">/{row.total}</span>
      </div>
      <span className="text-sm text-color-secondary">
        Tester: {row.testers.length > 0 ? row.testers.map((t) => t.fullName ?? t.id).join(', ') : '-'}
      </span>
      <span className="text-sm text-color-secondary">
        Completed: {row.completedAt ? formatDateTime(row.completedAt) : '-'}
      </span>
    </div>
  );

  return (
    <>
      <FilterToolbar
        visible={canRunTests}
        filterVisible={filterVisible}
        onToggleFilterVisible={onToggleFilterVisible}
        primaryAction={<Button label="Start Test Run" icon="pi pi-play" size="small" onClick={onStartRun} />}
      >
        <div className="col-12 md:col-2 p-1">
          <MultiSelect
            value={statusFilters}
            options={TEST_RUN_STATUS_OPTIONS}
            onChange={(e) => onStatusFiltersChange(e.value)}
            placeholder="All Statuses"
            className="w-full"
            display="chip"
            selectAllLabel="All"
          />
        </div>
        <div className="col-12 md:col p-1">
          <div className="flex gap-2">
            <SearchInput value={search} onChange={onSearchChange} placeholder="Search name/code..." className="flex-1" />
            <Button icon="pi pi-refresh" outlined size="small" severity="secondary" onClick={onResetFilters} tooltip="Reset filters" tooltipOptions={{ position: 'bottom' }} />
          </div>
        </div>
      </FilterToolbar>
      <div ref={containerRef}>
      <DataTable
        value={testRuns}
        loading={loading}
        lazy
        {...dataTablePaginatorProps}
        scrollHeight={tableHeight}
        totalRecords={total}
        first={first}
        rows={rows}
        onPage={(e) => onPage(e.first, e.rows)}
        rowsPerPageOptions={[5, 10, 25, 50]}
        emptyMessage="No test runs yet"
        onRowClick={(e) => navigate(`/test-runs/${(e.data as TestRun).id}`)}
        rowHover
        className={isMobile ? 'cursor-pointer' : 'cursor-pointer dt-resizable'}
        size="small"
        resizableColumns={!isMobile}
        columnResizeMode="expand"
        onColumnResizeEnd={cp.onColumnResizeEnd}
        tableStyle={isMobile ? undefined : cp.tableStyle}
      >
        {isMobile
          ? <Column field="name" header="Run Name" className="dt-title-fill" headerClassName="dt-title-fill" body={mobileRunNameBody} />
          : cp.arrange([
            ['code', <Column key="code" field="code" header="Code" style={{ width: cp.colWidth('code', '7rem') }} className="dt-code-nowrap" headerClassName="dt-code-nowrap" />],
            ['name', <Column key="name" field="name" header="Run Name" className="dt-title-fill" headerClassName="dt-title-fill" style={{ width: cp.colWidth('name') }} />],
            ['status', <Column key="status" field="status" header="Status" style={{ width: cp.colWidth('status', '7rem') }} body={(row: TestRun) => <Tag value={TEST_RUN_STATUS_LABEL[row.status]} severity={TEST_RUN_STATUS_SEVERITY[row.status]} />} />],
            ['results', <Column
              key="results"
              columnKey="results"
              header="Results"
              style={{ width: cp.colWidth('results', '8rem') }}
              body={(row: TestRunWithSummary) => (
                <div className="flex gap-1 align-items-center">
                  <Tag value={String(row.pass)} severity={TEST_RESULT_STATUS_SEVERITY.pass} />
                  <Tag value={String(row.fail)} severity={TEST_RESULT_STATUS_SEVERITY.fail} />
                  <span className="text-color-secondary text-sm">/{row.total}</span>
                </div>
              )}
              sortable
              sortField="pass"
            />],
            ['tester', <Column
              key="tester"
              columnKey="tester"
              header="Tester"
              style={{ width: cp.colWidth('tester', '11rem') }}
              body={(row: TestRunWithSummary) => (row.testers.length > 0 ? row.testers.map((t) => t.fullName ?? t.id).join(', ') : '-')}
            />],
            ['completedAt', <Column key="completedAt" field="completedAt" header="Completed" style={{ width: cp.colWidth('completedAt', '11rem') }} body={(row: TestRun) => (row.completedAt ? formatDateTime(row.completedAt) : '-')} />],
            ...(canDeleteContent ? [['actions', <Column
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
              body={(row: TestRun) => (
                <Button
                  icon="pi pi-trash"
                  text
                  rounded
                  size="small"
                  severity="danger"
                  aria-label="Delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteRun(row);
                  }}
                />
              )}
            />] as [string, React.ReactElement]] : []),
          ])}
      </DataTable>
      </div>
    </>
  );
}
