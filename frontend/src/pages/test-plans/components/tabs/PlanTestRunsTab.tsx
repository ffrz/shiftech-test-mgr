import { useNavigate } from 'react-router-dom';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Tag } from 'primereact/tag';
import { Button } from 'primereact/button';
import { MultiSelect } from 'primereact/multiselect';
import SearchInput from '../../../../components/ui/SearchInput';
import { FilterToolbar } from '../../../../components/ui/FilterToolbar';
import { dataTablePaginatorProps } from '../../../../components/ui/dataTablePaginator';
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

type PlanTestRunsTabProps = {
  testRuns: TestRunWithSummary[];
  total: number;
  loading: boolean;
  isMobile: boolean;
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
      <DataTable
        value={testRuns}
        loading={loading}
        lazy
        {...dataTablePaginatorProps}
        totalRecords={total}
        first={first}
        rows={rows}
        onPage={(e) => onPage(e.first, e.rows)}
        rowsPerPageOptions={[5, 10, 25, 50]}
        emptyMessage="No test runs yet"
        onRowClick={(e) => navigate(`/test-runs/${(e.data as TestRun).id}`)}
        rowHover
        className="cursor-pointer"
        size="small"
      >
        {!isMobile && <Column field="code" header="Code" style={{ width: '7rem' }} />}
        <Column field="name" header="Run Name" body={isMobile ? mobileRunNameBody : undefined} />
        {!isMobile && <Column field="status" header="Status" body={(row: TestRun) => <Tag value={TEST_RUN_STATUS_LABEL[row.status]} severity={TEST_RUN_STATUS_SEVERITY[row.status]} />} />}
        {!isMobile && (
          <Column
            header="Results"
            body={(row: TestRunWithSummary) => (
              <div className="flex gap-1 align-items-center">
                <Tag value={String(row.pass)} severity={TEST_RESULT_STATUS_SEVERITY.pass} />
                <Tag value={String(row.fail)} severity={TEST_RESULT_STATUS_SEVERITY.fail} />
                <span className="text-color-secondary text-sm">/{row.total}</span>
              </div>
            )}
            sortable
            sortField="pass"
          />
        )}
        {!isMobile && (
          <Column
            header="Tester"
            body={(row: TestRunWithSummary) =>
              row.testers.length > 0
                ? row.testers.map((t) => t.fullName ?? t.id).join(', ')
                : '-'
            }
          />
        )}
        {!isMobile && <Column field="completedAt" header="Completed" body={(row: TestRun) => (row.completedAt ? formatDateTime(row.completedAt) : '-')} />}
        {canDeleteContent && (
          <Column
            header=""
            style={{ width: '4rem' }}
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
          />
        )}
      </DataTable>
    </>
  );
}
