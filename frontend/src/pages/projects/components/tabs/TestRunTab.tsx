import { Button } from 'primereact/button';
import { DataTable, type DataTableStateEvent } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { IconField } from 'primereact/iconfield';
import { InputIcon } from 'primereact/inputicon';
import { Tag } from 'primereact/tag';
import { RowActionsMenu } from '../../../../components/ui/RowActionsMenu';
import { BulkActionsBar } from '../../../../components/ui/BulkActionsBar';
import type { TestRun, TestRunStatus } from '../../../../types/domain';
import { formatDateTime } from '../../../../helpers/dateFormatter';
import { TEST_RUN_STATUS_LABEL, TEST_RUN_STATUS_SEVERITY, TEST_RESULT_STATUS_SEVERITY } from '../../../../helpers/statusLabels';

const TEST_RUN_STATUS_OPTIONS: { label: string; value: TestRunStatus }[] = (
  ['in_progress', 'completed'] as const
).map((v) => ({ label: TEST_RUN_STATUS_LABEL[v], value: v }));

export type TestRunWithSummary = TestRun & {
  testPlanName: string | null;
  total: number;
  pass: number;
  fail: number;
  testers: { id: string; fullName: string | null }[];
};

type TestRunTabProps = {
  runs: TestRunWithSummary[];
  loading: boolean;
  isMobile: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: TestRunStatus | null;
  onStatusFilterChange: (value: TestRunStatus | null) => void;
  sortField: string;
  sortOrder: 1 | -1;
  onSort: (e: DataTableStateEvent) => void;
  selected: TestRunWithSummary[];
  onSelectedChange: (value: TestRunWithSummary[]) => void;
  canRunTests: boolean;
  canDeleteContent: boolean;
  onCreate: () => void;
  onDelete: (row: TestRunWithSummary) => void;
  onBulkDelete: () => void;
  onRowClick: (row: TestRunWithSummary) => void;
  onPlanLinkClick: (planId: string) => void;
};

export function TestRunTab({
  runs,
  loading,
  isMobile,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  sortField,
  sortOrder,
  onSort,
  selected,
  onSelectedChange,
  canRunTests,
  canDeleteContent,
  onCreate,
  onDelete,
  onBulkDelete,
  onRowClick,
  onPlanLinkClick,
}: TestRunTabProps) {
  const mobileRunBody = (row: TestRunWithSummary) => (
    <div className="flex flex-column gap-1">
      <div className="font-medium">{row.name}</div>
      <div className="text-sm text-color-secondary">{row.code}</div>
      <div className="flex gap-1 align-items-center text-sm">
        <Tag value={TEST_RUN_STATUS_LABEL[row.status]} severity={TEST_RUN_STATUS_SEVERITY[row.status]} />
      </div>
      <div className="text-sm text-color-secondary">{row.pass} passed / {row.fail} failed</div>
      <div className="text-sm text-color-secondary">
        Tester: {row.testers.length > 0 ? row.testers.map((t) => t.fullName ?? t.id).join(', ') : '-'}
      </div>
      <div className="text-sm text-color-secondary">
        {row.completedAt ? formatDateTime(row.completedAt) : '-'}
      </div>
    </div>
  );

  return (
    <>
      <div className="flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
        <div className="flex align-items-center gap-2 flex-wrap">
          <IconField iconPosition="left">
            <InputIcon className="pi pi-search" />
            <InputText value={search} onChange={(e) => onSearchChange(e.target.value)} placeholder="Search name/code..." />
          </IconField>
          <Dropdown
            value={statusFilter}
            options={TEST_RUN_STATUS_OPTIONS}
            onChange={(e) => onStatusFilterChange(e.value)}
            placeholder="All Statuses"
            showClear
            className="w-12rem"
          />
        </div>
        {canRunTests && <Button label="Create Test Run" icon="pi pi-plus" size="small" onClick={onCreate} />}
      </div>
      {canDeleteContent && (
        <BulkActionsBar
          selectedCount={selected.length}
          onClear={() => onSelectedChange([])}
          actions={<Button label="Delete Selected" icon="pi pi-trash" size="small" severity="danger" outlined onClick={onBulkDelete} />}
        />
      )}
      <DataTable
        value={runs}
        loading={loading}
        size="small"
        emptyMessage="No test runs yet"
        onRowClick={(e) => onRowClick(e.data as TestRunWithSummary)}
        rowHover
        className="cursor-pointer"
        paginator
        rows={10} rowsPerPageOptions={[5, 10, 25, 50]}
        sortField={isMobile ? undefined : sortField}
        sortOrder={isMobile ? undefined : sortOrder}
        onSort={isMobile ? undefined : onSort}
        selection={selected}
        onSelectionChange={(e: any) => onSelectedChange(e.value as TestRunWithSummary[])}
        dataKey="id"
        selectionMode={isMobile ? null : 'checkbox'}
      >
        <Column selectionMode="multiple" style={{ width: '3rem' }} hidden={isMobile} />
        <Column field="code" header="Code" sortable style={{ width: '7rem' }} hidden={isMobile} />
        <Column field="name" header="Name" sortable={!isMobile} body={isMobile ? mobileRunBody : undefined} />
        <Column
          header="Test Plan"
          field="testPlanName"
          sortable
          hidden={isMobile}
          body={(row: TestRunWithSummary) =>
            row.testPlanId ? (
              <a
                className="entity-link"
                onClick={(e) => {
                  e.stopPropagation();
                  onPlanLinkClick(row.testPlanId!);
                }}
              >
                {row.testPlanName}
              </a>
            ) : (
              <Tag value="Unplanned" severity="secondary" />
            )
          }
        />
        <Column field="status" header="Status" sortable hidden={isMobile} body={(row: TestRun) => <Tag value={TEST_RUN_STATUS_LABEL[row.status]} severity={TEST_RUN_STATUS_SEVERITY[row.status]} />} />
        <Column
          header="Result"
          hidden={isMobile}
          body={(row: TestRunWithSummary) => (
            <div className="flex gap-1 align-items-center">
              <Tag value={String(row.pass)} severity={TEST_RESULT_STATUS_SEVERITY.pass} />
              <Tag value={String(row.fail)} severity={TEST_RESULT_STATUS_SEVERITY.fail} />
              <span className="text-color-secondary text-sm">/{row.total}</span>
            </div>
          )}
        />
        <Column
          header="Tester"
          hidden={isMobile}
          body={(row: TestRunWithSummary) => (row.testers.length > 0 ? row.testers.map((t) => t.fullName ?? t.id).join(', ') : '-')}
        />
        <Column field="completedAt" header="Completed" sortable hidden={isMobile} body={(row: TestRun) => (row.completedAt ? formatDateTime(row.completedAt) : '-')} />
        <Column
          header=""
          style={{ width: '3.5rem' }}
          body={(row: TestRunWithSummary) => (
            <RowActionsMenu
              items={[
                { label: 'Detail', icon: 'pi pi-eye', command: () => onRowClick(row) },
                ...(canDeleteContent
                  ? [{ label: 'Delete', icon: 'pi pi-trash', className: 'p-error', command: () => onDelete(row) }]
                  : []),
              ]}
            />
          )}
        />
      </DataTable>
    </>
  );
}
