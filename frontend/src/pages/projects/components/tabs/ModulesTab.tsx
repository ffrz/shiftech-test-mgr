import { Button } from 'primereact/button';
import { DataTable, type DataTableSortEvent } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { RowActionsMenu } from '../../../../components/ui/RowActionsMenu';
import SearchInput from '../../../../components/ui/SearchInput';
import { BulkActionsBar } from '../../../../components/ui/BulkActionsBar';
import { dataTablePaginatorProps } from '../../../../components/ui/dataTablePaginator';
import type { Module } from '../../../../types/domain';

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
  const mobileBody = (row: Module) => (
    <div className="flex flex-column gap-2 py-1">
      <div className="font-medium">{row.name}</div>
      <div className="text-sm text-color-secondary">Code: {row.code}</div>
    </div>
  );

  return (
    <>
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
      >
        {!isMobile && <Column selectionMode="multiple" style={{ width: '3rem' }} />}
        {isMobile
          ? <Column header="Nama" body={mobileBody} />
          : <Column field="code" header="Code" sortable style={{ width: '7rem' }} />
        }
        {!isMobile && <Column field="name" header="Nama" sortable />}
        <Column
          header=""
          style={{ width: '3.5rem' }}
          body={(row: Module) => (
            <RowActionsMenu
              items={[
                { label: 'Edit', icon: 'pi pi-pencil', command: () => onEdit(row) },
                { label: 'Delete', icon: 'pi pi-trash', className: 'p-error', command: () => onDelete(row) },
              ]}
            />
          )}
        />
      </DataTable>
    </>
  );
}
