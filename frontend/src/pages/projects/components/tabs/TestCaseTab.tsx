import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from 'primereact/button';
import { DataTable, type DataTableStateEvent } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Dropdown } from 'primereact/dropdown';
import { MultiSelect } from 'primereact/multiselect';
import { InputText } from 'primereact/inputtext';
import { Tag } from 'primereact/tag';
import SearchInput from '../../../../components/ui/SearchInput';
import { RowActionsMenu } from '../../../../components/ui/RowActionsMenu';
import { BulkActionsBar } from '../../../../components/ui/BulkActionsBar';
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
  onPatchCase?: (_caseId: string, _changes: Partial<TestCaseWithDetails>) => void;
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
  onPatchCase,
}: TestCaseTabProps) {
  const navigate = useNavigate();
  const [editingCell, setEditingCell] = useState<{ caseId: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState<any>(null);
  const editRef = useRef<HTMLDivElement>(null);

  const startEdit = useCallback((caseId: string, field: string, currentValue: any) => {
    setEditingCell({ caseId, field });
    setEditValue(currentValue);
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingCell(null);
    setEditValue(null);
  }, []);

  const confirmEdit = useCallback(async (row: TestCaseWithDetails, field: string) => {
    if (!editingCell || editValue === null) return;
    const id = row.id;
    try {
      if (field === 'title') {
        if (String(editValue).trim()) {
          await testCaseService.update(id, row.projectId, { title: String(editValue).trim() });
          onPatchCase?.(id, { title: String(editValue).trim() } as any);
        }
      } else if (field === 'moduleId') {
        await testCaseService.update(id, row.projectId, { moduleId: editValue || null });
        onPatchCase?.(id, { moduleId: editValue || null } as any);
      } else if (field === 'priority') {
        await testCaseService.update(id, row.projectId, { priority: editValue as TestCasePriority });
        onPatchCase?.(id, { priority: editValue as TestCasePriority } as any);
      } else if (field === 'status') {
        await testCaseService.update(id, row.projectId, { status: editValue as TestCaseStatus });
        onPatchCase?.(id, { status: editValue as TestCaseStatus } as any);
      } else if (field === 'targetRoleId') {
        await testCaseService.update(id, row.projectId, { targetRoleId: editValue || null });
        onPatchCase?.(id, { targetRoleId: editValue || null } as any);
      } else if (field === 'tags') {
        await tagService.saveTagsForTestCase(row.projectId, id, editValue as string[]);
        onPatchCase?.(id, { tags: editValue } as any);
      }
    } catch { /* parent will refetch */ }
    cancelEdit();
  }, [editingCell, editValue, onPatchCase, cancelEdit]);

  const handleCellKeyDown = useCallback((e: React.KeyboardEvent, row: TestCaseWithDetails, field: string) => {
    if (e.key === 'Enter') { confirmEdit(row, field); }
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
        rowHover
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
        <Column field="code" header="Code" sortable style={{ width: '7rem' }} hidden={isMobile}
          body={(row: TestCaseWithDetails) => <a className="entity-link" href={`/test-cases/${row.id}`} onClick={(e) => { e.preventDefault(); navigate(`/test-cases/${row.id}`); }}>{row.code}</a>} />
        <Column field="title" header="Title" sortable={!isMobile} body={isMobile ? mobileCaseBody : (row: TestCaseWithDetails) => {
          const isEditing = editingCell?.caseId === row.id && editingCell?.field === 'title';
          if (isEditing && canEditContent) {
            return (
              <div ref={editRef} onKeyDown={(e) => handleCellKeyDown(e, row, 'title')}>
                <InputText value={String(editValue ?? '')} onChange={(e) => setEditValue(e.target.value)}
                  onBlur={() => confirmEdit(row, 'title')} autoFocus className="w-full" />
              </div>
            );
          }
          return <div onClick={(e) => { e.stopPropagation(); canEditContent && startEdit(row.id, 'title', row.title); }} style={{ cursor: canEditContent ? 'pointer' : undefined }}>{row.title}</div>;
        }} />
        <Column field="moduleName" header="Module" sortable hidden={isMobile} body={(row: TestCaseWithDetails) => {
          const isEditing = editingCell?.caseId === row.id && editingCell?.field === 'moduleId';
          if (isEditing && canEditContent) {
            return (
              <div ref={editRef} onKeyDown={(e) => handleCellKeyDown(e, row, 'moduleId')}>
                <Dropdown value={editValue} options={moduleOptions} onChange={(e) => { setEditValue(e.value); }} placeholder="None"
                  onHide={() => confirmEdit(row, 'moduleId')} showClear autoFocus className="w-10rem" />
              </div>
            );
          }
          return <div onClick={(e) => { e.stopPropagation(); canEditContent && startEdit(row.id, 'moduleId', row.moduleId); }} style={{ cursor: canEditContent ? 'pointer' : undefined }}>{row.module?.name ?? '-'}</div>;
        }} />
        <Column field="priority" header="Priority" sortable hidden={isMobile} body={(row: TestCaseWithDetails) => {
          const isEditing = editingCell?.caseId === row.id && editingCell?.field === 'priority';
          if (isEditing && canEditContent) {
            return (
              <div ref={editRef} onKeyDown={(e) => handleCellKeyDown(e, row, 'priority')}>
                <Dropdown value={editValue as TestCasePriority} options={PRIORITY_OPTIONS} onChange={(e) => { setEditValue(e.value); }}
                  onHide={() => confirmEdit(row, 'priority')} autoFocus className="w-10rem" />
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
              <div ref={editRef} onKeyDown={(e) => handleCellKeyDown(e, row, 'status')}>
                <Dropdown value={editValue as TestCaseStatus} options={TEST_CASE_STATUS_OPTIONS} onChange={(e) => { setEditValue(e.value); }}
                  onHide={() => confirmEdit(row, 'status')} autoFocus className="w-10rem" />
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
              <div ref={editRef} onKeyDown={(e) => handleCellKeyDown(e, row, 'targetRoleId')}>
                <Dropdown value={editValue} options={testRoleOptions} onChange={(e) => { setEditValue(e.value); }} placeholder="None"
                  onHide={() => confirmEdit(row, 'targetRoleId')} showClear autoFocus className="w-10rem" />
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
              <div ref={editRef} onKeyDown={(e) => handleCellKeyDown(e, row, 'tags')}>
                <MultiSelect value={editValue ?? []} options={tagOptions} onChange={(e) => { setEditValue(e.value); }}
                  onHide={() => confirmEdit(row, 'tags')} autoFocus className="w-10rem" display="chip" />
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
