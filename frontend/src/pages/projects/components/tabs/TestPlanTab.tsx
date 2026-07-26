import { Button } from 'primereact/button';
import { DataTable, type DataTableStateEvent } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { MultiSelect } from 'primereact/multiselect';
import { Tag } from 'primereact/tag';
import SearchInput from '../../../../components/ui/SearchInput';
import { RowActionsMenu } from '../../../../components/ui/RowActionsMenu';
import { BulkActionsBar } from '../../../../components/ui/BulkActionsBar';
import type { TestPlan, TestPlanStatus } from '../../../../types/domain';
import { formatDateTime } from '../../../../helpers/dateFormatter';
import { TEST_PLAN_STATUS_LABEL, TEST_PLAN_STATUS_SEVERITY } from '../../../../helpers/statusLabels';

const TEST_PLAN_STATUS_OPTIONS: { label: string; value: TestPlanStatus }[] = (
  ['draft', 'active', 'completed', 'archived'] as const
).map((v) => ({ label: TEST_PLAN_STATUS_LABEL[v], value: v }));

type TestPlanTabProps = {
  plans: TestPlan[];
  loading: boolean;
  isMobile: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: TestPlanStatus[];
  onStatusFilterChange: (value: TestPlanStatus[]) => void;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  sortField: string;
  sortOrder: 1 | -1;
  onSort: (e: DataTableStateEvent) => void;
  selected: TestPlan[];
  onSelectedChange: (value: TestPlan[]) => void;
  canEditContent: boolean;
  canDeleteContent: boolean;
  onCreate: () => void;
  onEdit: (row: TestPlan) => void;
  onDuplicate: (row: TestPlan) => void;
  onDelete: (row: TestPlan) => void;
  onBulkDelete: () => void;
  onRowClick: (row: TestPlan) => void;
};

export function TestPlanTab({
  plans,
  loading,
  isMobile,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  hasActiveFilters,
  onClearFilters,
  sortField,
  sortOrder,
  onSort,
  selected,
  onSelectedChange,
  canEditContent,
  canDeleteContent,
  onCreate,
  onEdit,
  onDuplicate,
  onDelete,
  onBulkDelete,
  onRowClick,
}: TestPlanTabProps) {
  const mobilePlanBody = (row: TestPlan) => (
    <div className="flex flex-column gap-1">
      <div className="font-medium">{row.name}</div>
      <div className="flex gap-2 align-items-center text-sm flex-wrap">
        <span className="text-color-secondary">{row.code}</span>
        <Tag value={TEST_PLAN_STATUS_LABEL[row.status]} severity={TEST_PLAN_STATUS_SEVERITY[row.status]} />
        <span className="text-color-secondary">{formatDateTime(row.updatedAt)}</span>
      </div>
    </div>
  );

  return (
    <>
      <div className="flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
        <div className="flex align-items-center gap-2 flex-wrap">
          <SearchInput value={search} onChange={onSearchChange} placeholder="Search name/code..." />
          <MultiSelect
            value={statusFilter}
            options={TEST_PLAN_STATUS_OPTIONS}
            onChange={(e) => onStatusFilterChange(e.value)}
            placeholder="All Statuses"
            className="w-13rem"
            selectAll
            selectAllLabel="All"
          />
          <Button
            icon="pi pi-filter-slash"
            outlined
            severity="secondary"
            size="small"
            disabled={!hasActiveFilters}
            onClick={onClearFilters}
            tooltip="Reset filters"
            tooltipOptions={{ position: 'bottom' }}
          />
        </div>
        {canEditContent && <Button label="New Test Plan" icon="pi pi-plus" size="small" onClick={onCreate} />}
      </div>
      {canDeleteContent && (
        <BulkActionsBar
          selectedCount={selected.length}
          onClear={() => onSelectedChange([])}
          actions={<Button label="Delete Selected" icon="pi pi-trash" size="small" severity="danger" outlined onClick={onBulkDelete} />}
        />
      )}
      <DataTable
        value={plans}
        loading={loading}
        size="small"
        emptyMessage="No test plans yet"
        onRowClick={(e) => onRowClick(e.data as TestPlan)}
        rowHover
        className="cursor-pointer"
        paginator
        paginatorTemplate="CurrentPageReport FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
        currentPageReportTemplate="{totalRecords} records"
        rows={10} rowsPerPageOptions={[5, 10, 25, 50]}
        sortField={isMobile ? undefined : sortField}
        sortOrder={isMobile ? undefined : sortOrder}
        onSort={isMobile ? undefined : onSort}
        selection={selected}
        onSelectionChange={(e: any) => onSelectedChange(e.value as TestPlan[])}
        dataKey="id"
        selectionMode={isMobile ? null : 'checkbox'}
      >
        <Column selectionMode="multiple" style={{ width: '3rem' }} hidden={isMobile} />
        <Column field="code" header="Code" sortable style={{ width: '7rem' }} hidden={isMobile} />
        <Column field="name" header="Name" sortable={!isMobile} body={isMobile ? mobilePlanBody : undefined} />
        <Column
          field="status"
          header="Status"
          sortable
          hidden={isMobile}
          body={(row: TestPlan) => <Tag value={TEST_PLAN_STATUS_LABEL[row.status]} severity={TEST_PLAN_STATUS_SEVERITY[row.status]} />}
        />
        <Column field="updatedAt" header="Last Update" sortable hidden={isMobile} body={(row: TestPlan) => formatDateTime(row.updatedAt)} />
        <Column
          header=""
          style={{ width: '3.5rem' }}
          body={(row: TestPlan) => (
            <RowActionsMenu
              items={[
                ...(canEditContent ? [{ label: 'Duplicate', icon: 'pi pi-copy', command: () => onDuplicate(row) }] : []),
                ...(canEditContent ? [{ label: 'Edit', icon: 'pi pi-pencil', command: () => onEdit(row) }] : []),
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
