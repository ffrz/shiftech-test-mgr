import { Button } from 'primereact/button';
import { DataTable, type DataTableSortEvent } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { RowActionsMenu } from '../../../../components/ui/RowActionsMenu';
import SearchInput from '../../../../components/ui/SearchInput';
import { BulkActionsBar } from '../../../../components/ui/BulkActionsBar';
import { dataTablePaginatorProps } from '../../../../components/ui/dataTablePaginator';
import type { Module } from '../../../../types/domain';
import { useColumnPreferences, type ColumnDef } from '../../../../hooks/useColumnPreferences';
import { ColumnPickerButton } from '../../../../components/ui/ColumnPickerButton';

const MODULE_COLUMNS: ColumnDef[] = [
  { key: 'sel', label: 'Select', locked: true },
  { key: 'code', label: 'Code', fallbackWidth: '7rem', locked: true, sortField: 'code' },
  { key: 'name', label: 'Name', locked: true, sortField: 'name' },
  { key: 'actions', label: 'Actions', locked: true },
];

type ModulesTabProps = {
  modules: Module[];
  isMobile: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  sortField: string;
  sortOrder: 1 | -1;
  onSort: (e: DataTableSortEvent) => void;
  selected: Module[];
  onSelectedChange: (value: Module[]) => void;
  onCreate: () => void;
  onEdit: (row: Module) => void;
  onDelete: (row: Module) => void;
  onBulkDelete: () => void;
};

export function ModulesTab({
  modules,
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
}: ModulesTabProps) {
  const cp = useColumnPreferences('projectModules', MODULE_COLUMNS);
  const handleSortFieldChange = (field: string) => onSort({ sortField: field, sortOrder } as DataTableSortEvent);
  const handleSortOrderChange = (order: 1 | -1) => onSort({ sortField, sortOrder: order } as DataTableSortEvent);
  const mobileBody = (row: Module) => (
    <div className="flex flex-column gap-2 py-1">
      <div className="font-medium">{row.name}</div>
      <div className="text-sm text-color-secondary">Code: {row.code}</div>
    </div>
  );

  return (
    <>
      <p className="text-color-secondary text-sm mb-3">
        Modules group test cases by feature or component area (e.g. Login, Checkout, Dashboard). Manage modules here.
      </p>
      <div className="flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
        <SearchInput value={search} onChange={onSearchChange} placeholder="Search name/code..." />
        <Button label="New Module" icon="pi pi-plus" size="small" onClick={onCreate} />
      </div>
      <BulkActionsBar
        selectedCount={selected.length}
        onClear={() => onSelectedChange([])}
        actions={<Button label="Delete Selected" icon="pi pi-trash" size="small" severity="danger" outlined onClick={onBulkDelete} />}
      />
      <DataTable
        value={modules}
        size="small"
        emptyMessage="No modules yet"
        {...dataTablePaginatorProps}
        rows={10} rowsPerPageOptions={[5, 10, 25, 50]}
        sortField={sortField}
        sortOrder={sortOrder}
        onSort={onSort}
        selection={selected}
        onSelectionChange={(e: any) => onSelectedChange(e.value as Module[])}
        dataKey="id"
        selectionMode="checkbox"
        resizableColumns={!isMobile}
        columnResizeMode="expand"
        onColumnResizeEnd={cp.onColumnResizeEnd}
        tableStyle={isMobile ? undefined : cp.tableStyle}
        className={isMobile ? undefined : 'dt-resizable'}
      >
        {cp.arrange([
        ['sel', <Column key="sel" selectionMode="multiple" style={{ width: '3rem' }} hidden={isMobile} />],
        ['code', <Column key="code" field="code" header="Code" sortable style={{ width: cp.colWidth('code', '7rem') }} hidden={isMobile} className="dt-code-nowrap" headerClassName="dt-code-nowrap" />],
        ['name', <Column key="name" field="name" header="Name" sortable={!isMobile} className="dt-title-fill" headerClassName="dt-title-fill" body={isMobile ? mobileBody : undefined} />],
        ['actions', <Column
          key="actions"
          style={{ width: '3.5rem' }}
          header={ <ColumnPickerButton reorderableColumns={cp.reorderableColumns} order={cp.order} isVisible={cp.isVisible} setVisible={cp.setVisible} reset={cp.reset} canReorder={!isMobile} reorderColumn={cp.reorderColumn} sortableColumns={cp.sortableColumns} sortField={sortField} sortOrder={sortOrder} onSortFieldChange={handleSortFieldChange} onSortOrderChange={handleSortOrderChange} /> }
          body={(row: Module) => (
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
