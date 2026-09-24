import { Button } from 'primereact/button';
import { DataTable, type DataTableSortEvent } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { RowActionsMenu } from '../../../../components/ui/RowActionsMenu';
import SearchInput from '../../../../components/ui/SearchInput';
import { BulkActionsBar } from '../../../../components/ui/BulkActionsBar';
import { dataTablePaginatorProps } from '../../../../components/ui/dataTablePaginator';
import type { TestRole } from '../../../../types/domain';
import { useColumnPreferences, type ColumnDef } from '../../../../hooks/useColumnPreferences';
import { ColumnPickerButton } from '../../../../components/ui/ColumnPickerButton';

const TEST_ROLE_COLUMNS: ColumnDef[] = [
  { key: 'sel', label: 'Select', locked: true },
  { key: 'name', label: 'Name', locked: true, sortField: 'name' },
  { key: 'actions', label: 'Actions', locked: true },
];

type TestRolesTabProps = {
  testRoles: TestRole[];
  isMobile: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  sortField: string;
  sortOrder: 1 | -1;
  onSort: (e: DataTableSortEvent) => void;
  selected: TestRole[];
  onSelectedChange: (value: TestRole[]) => void;
  onCreate: () => void;
  onEdit: (row: TestRole) => void;
  onDelete: (row: TestRole) => void;
  onBulkDelete: () => void;
};

export function TestRolesTab({
  testRoles,
  isMobile,
  search,
  onSearchChange,
  sortField,
  sortOrder,
  onSort,
  selected,
  onSelectedChange,
  onCreate,
  onEdit,
  onDelete,
  onBulkDelete,
}: TestRolesTabProps) {
  const cp = useColumnPreferences('projectTestRoles', TEST_ROLE_COLUMNS);
  const handleSortFieldChange = (field: string) => onSort({ sortField: field, sortOrder } as DataTableSortEvent);
  const handleSortOrderChange = (order: 1 | -1) => onSort({ sortField, sortOrder: order } as DataTableSortEvent);
  const mobileBody = (row: TestRole) => (
    <div className="flex flex-column gap-2 py-1">
      <div className="font-medium">{row.name}</div>
    </div>
  );

  return (
    <>
      <p className="text-color-secondary text-sm mb-3">
        Roles within the app under test (e.g. Admin, Manager, Member) — different from a member's role on the "Project Members" tab.
        Used as the "Target Role" when creating a test case.
      </p>
      <div className="flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
        <SearchInput value={search} onChange={onSearchChange} placeholder="Search name..." />
        <Button label="Role Baru" icon="pi pi-plus" size="small" onClick={onCreate} />
      </div>
      <BulkActionsBar
        selectedCount={selected.length}
        onClear={() => onSelectedChange([])}
        actions={<Button label="Delete Selected" icon="pi pi-trash" size="small" severity="danger" outlined onClick={onBulkDelete} />}
      />
      <DataTable
        value={testRoles}
        size="small"
        emptyMessage="No roles yet"
        {...dataTablePaginatorProps}
        rows={10} rowsPerPageOptions={[5, 10, 25, 50]}
        sortField={sortField}
        sortOrder={sortOrder}
        onSort={onSort}
        selection={selected}
        onSelectionChange={(e: any) => onSelectedChange(e.value as TestRole[])}
        dataKey="id"
        selectionMode="checkbox"
      >
        {cp.arrange([
        ['sel', <Column key="sel" selectionMode="multiple" style={{ width: '3rem' }} hidden={isMobile} />],
        ['name', <Column key="name" field="name" header="Name" sortable={!isMobile} className="dt-title-fill" headerClassName="dt-title-fill" body={isMobile ? mobileBody : undefined} />],
        ['actions', <Column
          key="actions"
          style={{ width: '3.5rem' }}
          header={<ColumnPickerButton reorderableColumns={cp.reorderableColumns} order={cp.order} isVisible={cp.isVisible} setVisible={cp.setVisible} reset={cp.reset} canReorder={!isMobile} reorderColumn={cp.reorderColumn} sortableColumns={cp.sortableColumns} sortField={sortField} sortOrder={sortOrder} onSortFieldChange={handleSortFieldChange} onSortOrderChange={handleSortOrderChange} />}
          body={(row: TestRole) => (
            <RowActionsMenu
              items={[
                { label: 'Edit', icon: 'pi pi-pencil', command: () => onEdit(row) },
                { label: 'Delete', icon: 'pi pi-trash', className: 'p-error', command: () => onDelete(row) },
              ]}
            />
          )}
        />],
        ])}
      </DataTable>
    </>
  );
}
