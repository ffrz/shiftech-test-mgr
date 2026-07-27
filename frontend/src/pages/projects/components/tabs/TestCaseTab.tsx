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
import type { TestCase, TestCaseWithDetails, TestCasePriority, TestCaseStatus } from '../../../../types/domain';
import { testCaseService } from '../../../../services/testCaseService';
import { tagService } from '../../../../services/tagService';
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

type EditableField = 'title' | 'moduleId' | 'priority' | 'status' | 'targetRoleId' | 'tags';

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
  onPatchCase?: (_caseId: string, _changes: Partial<TestCaseWithDetails>) => void;
};

const UNDO_TIMEOUT_MS = 9000;

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
  onPatchCase,
}: TestCaseTabProps) {
  const navigate = useNavigate();
  const [filterVisible, setFilterVisible] = useState(true);
  const [editingCell, setEditingCell] = useState<{ caseId: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState<any>(null);
  const editRef = useRef<HTMLDivElement>(null);
  const cancelledRef = useRef(false);
  const undoToast = useRef<Toast>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (undoTimerRef.current) clearTimeout(undoTimerRef.current); }, []);

  const startEdit = useCallback((caseId: string, field: string, currentValue: any) => {
    cancelledRef.current = false;
    setEditingCell({ caseId, field });
    setEditValue(currentValue);
  }, []);

  const cancelEdit = useCallback(() => {
    cancelledRef.current = true;
    setEditingCell(null);
    setEditValue(null);
  }, []);

  const getFieldValue = useCallback((row: TestCaseWithDetails, field: EditableField): any => {
    if (field === 'moduleId') return row.moduleId;
    if (field === 'targetRoleId') return row.targetRoleId;
    if (field === 'tags') return row.tags.map((t) => t.name);
    return (row as any)[field] ?? null;
  }, []);

  const applyFieldChange = useCallback(async (caseId: string, projectId: string, field: EditableField, value: any) => {
    if (field === 'title') {
      const title = String(value ?? '').trim();
      if (!title) return;
      await testCaseService.update(caseId, projectId, { title });
      onPatchCase?.(caseId, { title } as any);
    } else if (field === 'moduleId') {
      const moduleId = value || null;
      await testCaseService.update(caseId, projectId, { moduleId });
      const module = moduleId ? { id: moduleId, name: moduleOptions.find((m) => m.value === moduleId)?.label ?? '' } : null;
      onPatchCase?.(caseId, { moduleId, module } as any);
    } else if (field === 'priority') {
      await testCaseService.update(caseId, projectId, { priority: value as TestCasePriority });
      onPatchCase?.(caseId, { priority: value as TestCasePriority } as any);
    } else if (field === 'status') {
      await testCaseService.update(caseId, projectId, { status: value as TestCaseStatus });
      onPatchCase?.(caseId, { status: value as TestCaseStatus } as any);
    } else if (field === 'targetRoleId') {
      const targetRoleId = value || null;
      await testCaseService.update(caseId, projectId, { targetRoleId });
      onPatchCase?.(caseId, { targetRoleId } as any);
    } else if (field === 'tags') {
      await tagService.saveTagsForTestCase(projectId, caseId, value as string[]);
      onPatchCase?.(caseId, { tags: value } as any);
    }
  }, [onPatchCase, moduleOptions]);

  const handleUndo = useCallback(async (caseId: string, projectId: string, field: EditableField, previousValue: any) => {
    if (undoTimerRef.current) { clearTimeout(undoTimerRef.current); undoTimerRef.current = null; }
    undoToast.current?.clear();
    try {
      await applyFieldChange(caseId, projectId, field, previousValue);
    } catch { /* parent will refetch */ }
  }, [applyFieldChange]);

  const scheduleUndoToast = useCallback((caseId: string, projectId: string, field: EditableField, previousValue: any, fieldLabel: string) => {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    undoToast.current?.clear();
    undoToast.current?.show({
      severity: 'info',
      content: (
        <div className="flex align-items-center justify-content-between gap-3 w-full">
          <span>{fieldLabel} updated</span>
          <Button label="Undo" text size="small" onClick={() => handleUndo(caseId, projectId, field, previousValue)} />
        </div>
      ),
      sticky: true,
    });
    undoTimerRef.current = setTimeout(() => {
      undoToast.current?.clear();
      undoTimerRef.current = null;
    }, UNDO_TIMEOUT_MS);
  }, [handleUndo]);

  const confirmEdit = useCallback(async (row: TestCaseWithDetails, field: EditableField, value: any) => {
    if (cancelledRef.current) return;
    setEditingCell(null);
    setEditValue(null);

    const previousValue = getFieldValue(row, field);
    const normalizedValue = field === 'title' ? String(value ?? '').trim() : value;
    const normalizedPrevious = field === 'title' ? String(previousValue ?? '').trim() : previousValue;
    if (field === 'title' && !normalizedValue) return;
    if (JSON.stringify(normalizedValue) === JSON.stringify(normalizedPrevious)) return;

    const fieldLabel: Record<string, string> = {
      title: 'Title', moduleId: 'Module', priority: 'Priority', status: 'Status', targetRoleId: 'Target Role', tags: 'Tags',
    };
    try {
      await applyFieldChange(row.id, row.projectId, field, value);
      scheduleUndoToast(row.id, row.projectId, field, previousValue, fieldLabel[field] ?? field);
    } catch { /* parent will refetch */ }
  }, [getFieldValue, applyFieldChange, scheduleUndoToast]);

  const handleCellKeyDown = useCallback((e: React.KeyboardEvent, row: TestCaseWithDetails, field: EditableField, value: any) => {
    if (e.key === 'Enter') { confirmEdit(row, field, value); }
    else if (e.key === 'Escape') { cancelEdit(); }
  }, [confirmEdit, cancelEdit]);

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
            <Button icon="pi pi-copy" size="small" text onClick={onImportTemplate} />
            <Button icon="pi pi-file-excel" size="small" text onClick={onImportExcel} tooltip="Import CSV" tooltipOptions={{ position: 'bottom' }} />
            <Button label="New Test Case" icon="pi pi-plus" size="small" onClick={onCreate} />
          </div>
        )}
      </div>
      {filterVisible && (
        <div className="grid mb-2 p-1">
          <div className="col-6 md:col-2 p-1">
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
          <div className="col-6 md:col-2 p-1">
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
          <div className="col-6 md:col-2 p-1">
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
          <div className="col-6 md:col-2 p-1">
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
          <div className="col-12 md:col-2 p-1">
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
          <div className="col-12 md:col p-1">
            <div className="flex gap-2">
              <SearchInput value={search} onChange={onSearchChange} placeholder="Search title/code..." className="flex-1" />
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
        value={cases}
        loading={loading}
        size="small"
        emptyMessage="No test cases yet"
        onRowClick={isMobile ? (e) => onRowClick(e.data as TestCaseWithDetails) : undefined}
        rowHover
        {...dataTablePaginatorProps}
        rows={10} rowsPerPageOptions={[5, 10, 25, 50]}
        sortField={isMobile ? undefined : sortField}
        sortOrder={isMobile ? undefined : sortOrder}
        onSort={isMobile ? undefined : onSort}
        selection={selected}
        onSelectionChange={(e: any) => onSelectedChange(e.value as TestCaseWithDetails[])}
        dataKey="id"
        selectionMode={isMobile ? null : 'checkbox'}
        cellMemo={false}
      >
        <Column selectionMode="multiple" style={{ width: '3rem' }} hidden={isMobile} />
        <Column field="code" header="Code" sortable style={{ width: '7rem' }} hidden={isMobile}
          body={(row: TestCaseWithDetails) => <a className="entity-link" href={`/test-cases/${row.id}`} onClick={(e) => { e.preventDefault(); navigate(`/test-cases/${row.id}`); }}>{row.code}</a>} />
        <Column field="title" header="Title" sortable={!isMobile} body={isMobile ? mobileCaseBody : (row: TestCaseWithDetails) => {
          const isEditing = editingCell?.caseId === row.id && editingCell?.field === 'title';
          if (isEditing && canEditContent) {
            return (
              <div ref={editRef} onKeyDown={(e) => handleCellKeyDown(e, row, 'title', editValue)}>
                <InputText value={editValue ?? ''} onChange={(e) => setEditValue(e.target.value)}
                  onBlur={() => confirmEdit(row, 'title', editValue)} autoFocus className="w-full" />
              </div>
            );
          }
          return <div onClick={(e) => { e.stopPropagation(); canEditContent && startEdit(row.id, 'title', row.title); }} style={{ cursor: canEditContent ? 'pointer' : undefined }}>{row.title}</div>;
        }} />
        <Column field="moduleName" header="Module" sortable hidden={isMobile} body={(row: TestCaseWithDetails) => {
          const isEditing = editingCell?.caseId === row.id && editingCell?.field === 'moduleId';
          if (isEditing && canEditContent) {
            return (
              <div ref={editRef} onKeyDown={(e) => handleCellKeyDown(e, row, 'moduleId', editValue)}>
                <Dropdown value={editValue} options={moduleOptions}
                  onChange={(e) => confirmEdit(row, 'moduleId', e.value ?? null)}
                  onHide={cancelEdit}
                  placeholder="None" showClear autoFocus className="w-10rem" />
              </div>
            );
          }
          return <div onClick={(e) => { e.stopPropagation(); canEditContent && startEdit(row.id, 'moduleId', row.moduleId); }} style={{ cursor: canEditContent ? 'pointer' : undefined }}>{row.module?.name ?? '-'}</div>;
        }} />
        <Column field="priority" header="Priority" sortable hidden={isMobile} body={(row: TestCaseWithDetails) => {
          const isEditing = editingCell?.caseId === row.id && editingCell?.field === 'priority';
          if (isEditing && canEditContent) {
            return (
              <div ref={editRef} onKeyDown={(e) => handleCellKeyDown(e, row, 'priority', editValue)}>
                <Dropdown value={editValue as TestCasePriority} options={PRIORITY_OPTIONS}
                  onChange={(e) => confirmEdit(row, 'priority', e.value)}
                  onHide={cancelEdit}
                  autoFocus className="w-10rem" />
              </div>
            );
          }
          return <div onClick={(e) => { e.stopPropagation(); canEditContent && startEdit(row.id, 'priority', row.priority); }} style={{ cursor: canEditContent ? 'pointer' : undefined }}>
            <Tag value={TEST_CASE_PRIORITY_LABEL[row.priority]} severity={TEST_CASE_PRIORITY_SEVERITY[row.priority]} />
          </div>;
        }} />
        <Column field="status" header="Status" sortable hidden={isMobile} body={(row: TestCaseWithDetails) => {
          const isEditing = editingCell?.caseId === row.id && editingCell?.field === 'status';
          if (isEditing && canEditContent) {
            return (
              <div ref={editRef} onKeyDown={(e) => handleCellKeyDown(e, row, 'status', editValue)}>
                <Dropdown value={editValue as TestCaseStatus} options={TEST_CASE_STATUS_OPTIONS}
                  onChange={(e) => confirmEdit(row, 'status', e.value)}
                  onHide={cancelEdit}
                  autoFocus className="w-10rem" />
              </div>
            );
          }
          return <div onClick={(e) => { e.stopPropagation(); canEditContent && startEdit(row.id, 'status', row.status); }} style={{ cursor: canEditContent ? 'pointer' : undefined }}>
            <Tag value={TEST_CASE_STATUS_LABEL[row.status]} severity={TEST_CASE_STATUS_SEVERITY[row.status]} />
          </div>;
        }} />
        <Column field="targetRoleName" header="Target Role" sortable hidden={isMobile} body={(row: TestCaseWithDetails) => {
          const isEditing = editingCell?.caseId === row.id && editingCell?.field === 'targetRoleId';
          if (isEditing && canEditContent) {
            return (
              <div ref={editRef} onKeyDown={(e) => handleCellKeyDown(e, row, 'targetRoleId', editValue)}>
                <Dropdown value={editValue} options={testRoleOptions}
                  onChange={(e) => confirmEdit(row, 'targetRoleId', e.value ?? null)}
                  onHide={cancelEdit}
                  placeholder="None" showClear autoFocus className="w-10rem" />
              </div>
            );
          }
          return <div onClick={(e) => { e.stopPropagation(); canEditContent && startEdit(row.id, 'targetRoleId', row.targetRoleId); }} style={{ cursor: canEditContent ? 'pointer' : undefined }}>
            {row.targetRole ? <Tag value={row.targetRole.name} severity="secondary" /> : '-'}
          </div>;
        }} />
        <Column field="tags" header="Tag" hidden={isMobile} body={(row: TestCaseWithDetails) => {
          const isEditing = editingCell?.caseId === row.id && editingCell?.field === 'tags';
          if (isEditing && canEditContent) {
            return (
              <div ref={editRef} onKeyDown={(e) => handleCellKeyDown(e, row, 'tags', editValue)}>
                <MultiSelect value={editValue ?? []} options={tagOptions}
                  onChange={(e) => confirmEdit(row, 'tags', e.value)}
                  onHide={cancelEdit}
                  autoFocus className="w-10rem" display="chip" />
              </div>
            );
          }
          return <div onClick={(e) => { e.stopPropagation(); canEditContent && startEdit(row.id, 'tags', row.tags.map((t) => t.name)); }} style={{ cursor: canEditContent ? 'pointer' : undefined }}>
            <div className="flex flex-wrap gap-1">
              {row.tags.map((t) => (<Tag key={t.id} value={t.name} severity="info" />))}
            </div>
          </div>;
        }} />
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
