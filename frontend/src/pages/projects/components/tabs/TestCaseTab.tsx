import { Button } from 'primereact/button';
import { DataTable, type DataTableStateEvent } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { MultiSelect } from 'primereact/multiselect';
import { Tag } from 'primereact/tag';
import SearchInput from '../../../../components/ui/SearchInput';
import { RowActionsMenu } from '../../../../components/ui/RowActionsMenu';
import { BulkActionsBar } from '../../../../components/ui/BulkActionsBar';
import type { TestCase, TestCaseWithDetails, TestCasePriority, TestCaseStatus } from '../../../../types/domain';
import {
  TEST_CASE_PRIORITY_LABEL,
  TEST_CASE_PRIORITY_SEVERITY,
  TEST_CASE_STATUS_LABEL,
  TEST_CASE_STATUS_SEVERITY,
} from '../../../../helpers/statusLabels';

const PRIORITY_OPTIONS: { label: string; value: TestCasePriority }[] = [
  { label: TEST_CASE_PRIORITY_LABEL.low, value: 'low' },
  { label: TEST_CASE_PRIORITY_LABEL.medium, value: 'medium' },
  { label: TEST_CASE_PRIORITY_LABEL.high, value: 'high' },
  { label: TEST_CASE_PRIORITY_LABEL.critical, value: 'critical' },
];

const TEST_CASE_STATUS_OPTIONS: { label: string; value: TestCaseStatus }[] = (
  ['active', 'archived'] as const
).map((v) => ({ label: TEST_CASE_STATUS_LABEL[v], value: v }));

type TestCaseTabProps = {
  cases: TestCaseWithDetails[];
  loading: boolean;
  isMobile: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: TestCaseStatus[];
  onStatusFilterChange: (value: TestCaseStatus[]) => void;
  priorityFilter: TestCasePriority[];
  onPriorityFilterChange: (value: TestCasePriority[]) => void;
  moduleFilter: string[];
  onModuleFilterChange: (value: string[]) => void;
  tagFilter: string[];
  onTagFilterChange: (value: string[]) => void;
  testRoleFilter: string[];
  onTestRoleFilterChange: (value: string[]) => void;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  moduleOptions: { label: string; value: string }[];
  tagOptions: { label: string; value: string }[];
  testRoleOptions: { label: string; value: string }[];
  sortField: string;
  sortOrder: 1 | -1;
  onSort: (e: DataTableStateEvent) => void;
  selected: TestCaseWithDetails[];
  onSelectedChange: (value: TestCaseWithDetails[]) => void;
  canEditContent: boolean;
  canDeleteContent: boolean;
  onCreate: () => void;
  onImportTemplate: () => void;
  onImportExcel: () => void;
  onEdit: (row: TestCaseWithDetails) => void;
  onDuplicate: (row: TestCaseWithDetails) => void;
  onArchive: (row: TestCase) => void;
  onDelete: (row: TestCase) => void;
  onBulkDelete: () => void;
  onRowClick: (row: TestCaseWithDetails) => void;
};

export function TestCaseTab({
  cases,
  loading,
  isMobile,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  priorityFilter,
  onPriorityFilterChange,
  moduleFilter,
  onModuleFilterChange,
  tagFilter,
  onTagFilterChange,
  testRoleFilter,
  onTestRoleFilterChange,
  hasActiveFilters,
  onClearFilters,
  moduleOptions,
  tagOptions,
  testRoleOptions,
  sortField,
  sortOrder,
  onSort,
  selected,
  onSelectedChange,
  canEditContent,
  canDeleteContent,
  onCreate,
  onImportTemplate,
  onImportExcel,
  onEdit,
  onDuplicate,
  onArchive,
  onDelete,
  onBulkDelete,
  onRowClick,
}: TestCaseTabProps) {
  const mobileCaseBody = (row: TestCaseWithDetails) => (
    <div className="flex flex-column gap-1">
      <div className="font-medium">{row.title}</div>
      <div className="flex gap-2 align-items-center text-sm flex-wrap">
        <span className="text-color-secondary">{row.code}</span>
        <Tag value={TEST_CASE_PRIORITY_LABEL[row.priority]} severity={TEST_CASE_PRIORITY_SEVERITY[row.priority]} />
        <Tag value={TEST_CASE_STATUS_LABEL[row.status]} severity={TEST_CASE_STATUS_SEVERITY[row.status]} />
        {row.module && <span className="text-color-secondary">{row.module.name}</span>}
      </div>
    </div>
  );

  return (
    <>
      <div className="grid mb-2">
        <div className="col-12 md:col-3">
          <MultiSelect
            value={statusFilter}
            options={TEST_CASE_STATUS_OPTIONS}
            onChange={(e) => onStatusFilterChange(e.value)}
            placeholder="All Statuses"
            className="w-full"
            selectAll
            selectAllLabel="All"
          />
        </div>
        <div className="col-12 md:col-3">
          <MultiSelect
            value={priorityFilter}
            options={PRIORITY_OPTIONS}
            onChange={(e) => onPriorityFilterChange(e.value)}
            placeholder="All Priorities"
            className="w-full"
            selectAll
            selectAllLabel="All"
          />
        </div>
        <div className="col-12 md:col-3">
          <MultiSelect
            value={moduleFilter}
            options={moduleOptions}
            onChange={(e) => onModuleFilterChange(e.value)}
            placeholder="All Modules"
            className="w-full"
            selectAll
            selectAllLabel="All"
          />
        </div>
        <div className="col-12 md:col-3">
          <MultiSelect
            value={tagFilter}
            options={tagOptions}
            onChange={(e) => onTagFilterChange(e.value)}
            placeholder="All Tags"
            className="w-full"
            selectAll
            selectAllLabel="All"
          />
        </div>
        <div className="col-12 md:col-3">
          <MultiSelect
            value={testRoleFilter}
            options={testRoleOptions}
            onChange={(e) => onTestRoleFilterChange(e.value)}
            placeholder="All Roles"
            className="w-full"
            selectAll
            selectAllLabel="All"
          />
        </div>
        <div className="col-12 md:col">
          <div className="flex gap-2">
            <SearchInput value={search} onChange={onSearchChange} placeholder="Search title/code..." className="flex-1" />
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
        </div>
        {canEditContent && (
          <div className="col-12 md:col-fixed">
            <div className="flex gap-1">
              <Button icon="pi pi-copy" size="small" text onClick={onImportTemplate} />
              <Button icon="pi pi-file-excel" size="small" text onClick={onImportExcel} />
              <Button label="New Test Case" icon="pi pi-plus" size="small" onClick={onCreate} />
            </div>
          </div>
        )}
      </div>
      {canDeleteContent && (
        <BulkActionsBar
          selectedCount={selected.length}
          onClear={() => onSelectedChange([])}
          actions={<Button label="Delete Selected" icon="pi pi-trash" size="small" severity="danger" outlined onClick={onBulkDelete} />}
        />
      )}
      <DataTable
        value={cases}
        loading={loading}
        size="small"
        emptyMessage="No test cases yet"
        onRowClick={(e) => onRowClick(e.data as TestCaseWithDetails)}
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
        onSelectionChange={(e: any) => onSelectedChange(e.value as TestCaseWithDetails[])}
        dataKey="id"
        selectionMode={isMobile ? null : 'checkbox'}
      >
        <Column selectionMode="multiple" style={{ width: '3rem' }} hidden={isMobile} />
        <Column field="code" header="Code" sortable style={{ width: '7rem' }} hidden={isMobile} />
        <Column field="title" header="Title" sortable={!isMobile} body={isMobile ? mobileCaseBody : undefined} />
        <Column field="module.name" header="Module" sortable body={(row: TestCaseWithDetails) => row.module?.name ?? '-'} hidden={isMobile} />
        <Column
          field="priority"
          header="Priority"
          sortable
          hidden={isMobile}
          body={(row: TestCaseWithDetails) => <Tag value={TEST_CASE_PRIORITY_LABEL[row.priority]} severity={TEST_CASE_PRIORITY_SEVERITY[row.priority]} />}
        />
        <Column
          field="status"
          header="Status"
          sortable
          hidden={isMobile}
          body={(row: TestCaseWithDetails) => (
            <Tag value={TEST_CASE_STATUS_LABEL[row.status]} severity={TEST_CASE_STATUS_SEVERITY[row.status]} />
          )}
        />
        <Column
          field="targetRole.name"
          header="Target Role"
          sortable
          hidden={isMobile}
          body={(row: TestCaseWithDetails) => (row.targetRole ? <Tag value={row.targetRole.name} severity="secondary" /> : '-')}
        />
        <Column
          field="tags"
          header="Tag"
          hidden={isMobile}
          body={(row: TestCaseWithDetails) => (
            <div className="flex flex-wrap gap-1">
              {row.tags.map((t) => (
                <Tag key={t.id} value={t.name} severity="info" />
              ))}
            </div>
          )}
        />
        <Column
          header=""
          style={{ width: '3.5rem' }}
          body={(row: TestCaseWithDetails) => (
            <RowActionsMenu
              items={[
                ...(canEditContent
                  ? [
                    { label: 'Edit', icon: 'pi pi-pencil', command: () => onEdit(row) },
                    { label: 'Duplicate', icon: 'pi pi-copy', command: () => onDuplicate(row) },
                    {
                      label: row.status === 'active' ? 'Archive' : 'Activate',
                      icon: row.status === 'active' ? 'pi pi-inbox' : 'pi pi-refresh',
                      command: () => onArchive(row),
                    },
                  ]
                  : []),
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
