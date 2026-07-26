import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from 'primereact/button';
import { DataTable, type DataTableStateEvent } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Dropdown } from 'primereact/dropdown';
import { MultiSelect } from 'primereact/multiselect';
import { InputText } from 'primereact/inputtext';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';
import SearchInput from '../../../../components/ui/SearchInput';
import { RowActionsMenu } from '../../../../components/ui/RowActionsMenu';
import { BulkActionsBar } from '../../../../components/ui/BulkActionsBar';
import { dataTablePaginatorProps } from '../../../../components/ui/dataTablePaginator';
import { testPlanService } from '../../../../services/testPlanService';
import type { TestPlan, TestPlanStatus } from '../../../../types/domain';
import { formatDateTime } from '../../../../helpers/dateFormatter';
import { TEST_PLAN_STATUS_LABEL, TEST_PLAN_STATUS_SEVERITY } from '../../../../helpers/statusLabels';

const TEST_PLAN_STATUS_OPTIONS: { label: string; value: TestPlanStatus }[] = (
  ['draft', 'active', 'completed', 'archived'] as const
).map((v) => ({ label: TEST_PLAN_STATUS_LABEL[v], value: v }));

const UNDO_TIMEOUT_MS = 9000;

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
  onPatchPlan?: (_planId: string, _changes: Partial<TestPlan>) => void;
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
  onPatchPlan,
}: TestPlanTabProps) {
  const navigate = useNavigate();
  const [filterVisible, setFilterVisible] = useState(true);
  const [editingCell, setEditingCell] = useState<{ planId: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState<any>(null);
  const editRef = useRef<HTMLDivElement>(null);
  const cancelledRef = useRef(false);
  const undoToast = useRef<Toast>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (undoTimerRef.current) clearTimeout(undoTimerRef.current); }, []);

  const startEdit = useCallback((planId: string, field: string, currentValue: any) => {
    cancelledRef.current = false;
    setEditingCell({ planId, field });
    setEditValue(currentValue);
  }, []);

  const cancelEdit = useCallback(() => {
    cancelledRef.current = true;
    setEditingCell(null);
    setEditValue(null);
  }, []);

  async function commitChange(planId: string, field: string, value: any) {
    if (field === 'name') {
      const name = String(value ?? '').trim();
      if (!name) return;
      await testPlanService.rename(planId, name);
      onPatchPlan?.(planId, { name } as Partial<TestPlan>);
    } else if (field === 'status') {
      await testPlanService.changeStatus(planId, value as TestPlanStatus);
      onPatchPlan?.(planId, { status: value as TestPlanStatus } as Partial<TestPlan>);
    }
  }

  const handleUndo = useCallback(async (planId: string, field: string, previousValue: any) => {
    if (undoTimerRef.current) { clearTimeout(undoTimerRef.current); undoTimerRef.current = null; }
    undoToast.current?.clear();
    try {
      await commitChange(planId, field, previousValue);
    } catch { /* ignore */ }
  }, []);

  const scheduleUndoToast = useCallback((planId: string, field: string, previousValue: any, fieldLabel: string) => {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    undoToast.current?.clear();
    undoToast.current?.show({
      severity: 'info',
      content: (
        <div className="flex align-items-center justify-content-between gap-3 w-full">
          <span>{fieldLabel} updated</span>
          <Button label="Undo" text size="small" onClick={() => handleUndo(planId, field, previousValue)} />
        </div>
      ),
      sticky: true,
    });
    undoTimerRef.current = setTimeout(() => {
      undoToast.current?.clear();
      undoTimerRef.current = null;
    }, UNDO_TIMEOUT_MS);
  }, [handleUndo]);

  const confirmEdit = useCallback(async (row: TestPlan, field: string, value: any) => {
    if (cancelledRef.current) return;
    setEditingCell(null);
    setEditValue(null);

    const normalizedValue = field === 'name' ? String(value ?? '').trim() : value;
    const normalizedPrevious = field === 'name' ? String((row as any)[field] ?? '').trim() : (row as any)[field];
    if (field === 'name' && !normalizedValue) return;
    if (normalizedValue === normalizedPrevious) return;

    const previousValue = (row as any)[field];
    const fieldLabel: Record<string, string> = { name: 'Name', status: 'Status' };
    try {
      await commitChange(row.id, field, value);
      scheduleUndoToast(row.id, field, previousValue, fieldLabel[field] ?? field);
    } catch { /* ignore */ }
  }, [scheduleUndoToast]);

  const handleCellKeyDown = useCallback((e: React.KeyboardEvent, row: TestPlan, field: string, value: any) => {
    if (e.key === 'Enter') { confirmEdit(row, field, value); }
    else if (e.key === 'Escape') { cancelEdit(); }
  }, [confirmEdit, cancelEdit]);

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
      <Toast ref={undoToast} position="bottom-center" />
      <div className="flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
        <div />
        {canEditContent && (
          <div className="flex gap-2">
            <Button
              icon={filterVisible ? "pi pi-filter-fill" : "pi pi-filter"}
              text
              rounded
              size="small"
              severity={filterVisible ? "warning" : "secondary"}
              onClick={() => setFilterVisible(!filterVisible)}
              tooltip={filterVisible ? "Hide filters" : "Show filters"}
              tooltipOptions={{ position: 'bottom' }}
            />
            <Button label="New Test Plan" icon="pi pi-plus" size="small" onClick={onCreate} />
          </div>
        )}
      </div>
      {filterVisible && (
        <div className="grid mb-2 p-1">
          <div className="col-12 md:col-2 p-1">
            <MultiSelect
              value={statusFilter}
              options={TEST_PLAN_STATUS_OPTIONS}
              onChange={(e) => onStatusFilterChange(e.value)}
              placeholder="All Statuses"
              className="w-full"
              selectAll
              selectAllLabel="All"
            />
          </div>
          <div className="col-12 md:col p-1">
            <div className="flex gap-2">
              <SearchInput value={search} onChange={onSearchChange} placeholder="Search name/code..." className="flex-1" />
              <Button
                icon="pi pi-refresh"
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
        </div>
      )}
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
        onRowClick={isMobile ? (e) => onRowClick(e.data as TestPlan) : undefined}
        rowHover
        {...dataTablePaginatorProps}
        rows={10} rowsPerPageOptions={[5, 10, 25, 50]}
        sortField={isMobile ? undefined : sortField}
        sortOrder={isMobile ? undefined : sortOrder}
        onSort={isMobile ? undefined : onSort}
        selection={selected}
        onSelectionChange={(e: any) => onSelectedChange(e.value as TestPlan[])}
        dataKey="id"
        selectionMode={isMobile ? null : 'checkbox'}
        cellMemo={false}
      >
        <Column selectionMode="multiple" style={{ width: '3rem' }} hidden={isMobile} />
        <Column field="code" header="Code" sortable style={{ width: '7rem' }} hidden={isMobile}
          body={(row: TestPlan) => <a className="entity-link" href={`/test-plans/${row.id}`} onClick={(e) => { e.preventDefault(); navigate(`/test-plans/${row.id}`); }}>{row.code}</a>} />
        <Column field="name" header="Name" sortable={!isMobile} body={isMobile ? mobilePlanBody : (row: TestPlan) => {
          const isEditing = editingCell?.planId === row.id && editingCell?.field === 'name';
          if (isEditing && canEditContent) {
            return (
              <div ref={editRef} onKeyDown={(e) => handleCellKeyDown(e, row, 'name', editValue)}>
                <InputText value={editValue ?? ''} onChange={(e) => setEditValue(e.target.value)}
                  onBlur={() => confirmEdit(row, 'name', editValue)} autoFocus className="w-full" />
              </div>
            );
          }
          return <div onClick={(e) => { e.stopPropagation(); canEditContent && startEdit(row.id, 'name', row.name); }} style={{ cursor: canEditContent ? 'pointer' : undefined }}>{row.name}</div>;
        }} />
        <Column field="status" header="Status" sortable hidden={isMobile} body={(row: TestPlan) => {
          const isEditing = editingCell?.planId === row.id && editingCell?.field === 'status';
          if (isEditing && canEditContent) {
            return (
              <div ref={editRef} onKeyDown={(e) => handleCellKeyDown(e, row, 'status', editValue)}>
                <Dropdown value={editValue as TestPlanStatus} options={TEST_PLAN_STATUS_OPTIONS}
                  onChange={(e) => confirmEdit(row, 'status', e.value)}
                  onHide={cancelEdit}
                  autoFocus className="w-10rem" />
              </div>
            );
          }
          return <div onClick={(e) => { e.stopPropagation(); canEditContent && startEdit(row.id, 'status', row.status); }} style={{ cursor: canEditContent ? 'pointer' : undefined }}>
            <Tag value={TEST_PLAN_STATUS_LABEL[row.status]} severity={TEST_PLAN_STATUS_SEVERITY[row.status]} />
          </div>;
        }} />
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
