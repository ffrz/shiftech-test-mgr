import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from 'primereact/button';
import { DataTable, type DataTablePageEvent, type DataTableStateEvent } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { MultiSelect } from 'primereact/multiselect';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';
import { Dialog } from 'primereact/dialog';
import { FloatLabel } from 'primereact/floatlabel';
import SearchInput from '../../../../components/ui/SearchInput';
import { FilterToolbar } from '../../../../components/ui/FilterToolbar';
import { confirmDialog } from 'primereact/confirmdialog';
import { RowActionsMenu } from '../../../../components/ui/RowActionsMenu';
import { BulkActionsBar } from '../../../../components/ui/BulkActionsBar';
import { dataTablePaginatorProps } from '../../../../components/ui/dataTablePaginator';
import type { IssueWithDetails, IssueStatus, IssuePriority, IssueType, ProjectMemberWithProfile } from '../../../../types/domain';
import { issueService } from '../../../../services/issueService';
import { useAuthContext } from '../../../../hooks/useAuth';

const UNDO_TIMEOUT_MS = 9000;
type EditableField = 'status' | 'assignedTo' | 'title' | 'type' | 'priority' | 'moduleId' | 'targetRoleId';
import {
  ISSUE_PRIORITY_LABEL,
  ISSUE_PRIORITY_SEVERITY,
  ISSUE_STATUS_LABEL,
  ISSUE_STATUS_SEVERITY,
  ISSUE_TYPE_LABEL,
  ISSUE_TYPE_SEVERITY,
} from '../../../../helpers/statusLabels';

const ISSUE_STATUS_OPTIONS: { label: string; value: IssueStatus }[] = (
  ['backlog', 'open', 'in_progress', 'resolved', 'verified', 'closed', 'rejected', 'duplicate'] as const
).map((v) => ({ label: ISSUE_STATUS_LABEL[v], value: v }));

const ISSUE_PRIORITY_OPTIONS: { label: string; value: IssuePriority }[] = (
  ['low', 'medium', 'high', 'critical'] as const
).map((v) => ({ label: ISSUE_PRIORITY_LABEL[v], value: v }));

type IssueTabProps = {
  issues: IssueWithDetails[];
  loading: boolean;
  isMobile: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: IssueStatus[];
  onStatusFilterChange: (value: IssueStatus[]) => void;
  priorityFilter: IssuePriority[];
  onPriorityFilterChange: (value: IssuePriority[]) => void;
  moduleFilter: string[];
  onModuleFilterChange: (value: string[]) => void;
  tagFilter: string[];
  onTagFilterChange: (value: string[]) => void;
  typeFilter: IssueType[];
  onTypeFilterChange: (value: IssueType[]) => void;
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
  selected: IssueWithDetails[];
  onSelectedChange: (value: IssueWithDetails[]) => void;
  projectMembers: ProjectMemberWithProfile[];
  canManageIssues: boolean;
  canDeleteContent: boolean;
  onCreate: () => void;
  onEdit: (row: IssueWithDetails) => void;
  onDuplicate: (row: IssueWithDetails) => void;
  onBulkDelete: () => void;
  onBulkEdit: (changes: { status?: IssueStatus; assignedTo?: string | null }) => void;
  onRowClick: (row: IssueWithDetails) => void;
  onPatchIssue: (_issueId: string, _changes: Partial<IssueWithDetails>) => void;
  onReload: () => Promise<void>;
  onToastSuccess: (summary: string) => void;
  lazy?: boolean;
  totalRecords?: number;
  first?: number;
  rows?: number;
  onPage?: (e: DataTablePageEvent) => void;
};

export function IssueTab({
  issues,
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
  typeFilter,
  onTypeFilterChange,
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
  projectMembers,
  canManageIssues,
  canDeleteContent,
  onCreate,
  onEdit,
  onDuplicate,
  onBulkDelete,
  onBulkEdit,
  onRowClick,
  onPatchIssue,
  onReload,
  onToastSuccess,
  lazy,
  totalRecords,
  first,
  rows,
  onPage,
}: IssueTabProps) {
  const navigate = useNavigate();
  const { user, profile } = useAuthContext();
  const actorName = profile?.displayName ?? profile?.username ?? null;
  const [editingCell, setEditingCell] = useState<{ issueId: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState<string | null>(null);
  const editRef = useRef<HTMLDivElement>(null);
  const cancelledRef = useRef(false);
  const undoToast = useRef<Toast>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Bulk-edit dialog: UNSET (untouched, excluded from the update) until the user picks
  // something. `null` is itself a meaningful choice for assignedTo (unassign, via the
  // Dropdown's showClear) so a plain `null` sentinel can't distinguish "clear" from
  // "didn't touch" — same pattern as TestCaseTab's bulk-edit dialog.
  const UNSET = Symbol('unset');
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [bulkStatus, setBulkStatus] = useState<IssueStatus | typeof UNSET>(UNSET);
  const [bulkAssignedTo, setBulkAssignedTo] = useState<string | null | typeof UNSET>(UNSET);

  function openBulkEdit() {
    setBulkStatus(UNSET);
    setBulkAssignedTo(UNSET);
    setBulkEditOpen(true);
  }

  function applyBulkEdit() {
    const changes: Parameters<typeof onBulkEdit>[0] = {};
    if (bulkStatus !== UNSET) changes.status = bulkStatus;
    if (bulkAssignedTo !== UNSET) changes.assignedTo = bulkAssignedTo;
    onBulkEdit(changes);
    setBulkEditOpen(false);
  }

  useEffect(() => () => { if (undoTimerRef.current) clearTimeout(undoTimerRef.current); }, []);

  const startEdit = useCallback((issueId: string, field: string, currentValue: string | null) => {
    cancelledRef.current = false;
    setEditingCell({ issueId, field });
    setEditValue(currentValue);
  }, []);

  const cancelEdit = useCallback(() => {
    cancelledRef.current = true;
    setEditingCell(null);
    setEditValue(null);
  }, []);

  const getFieldValue = useCallback((row: IssueWithDetails, field: EditableField): string | null => {
    if (field === 'moduleId') return row.moduleId;
    return row[field] as string | null;
  }, []);

  // Persists `value` for `field` on the issue and reflects it optimistically via onPatchIssue.
  // Shared by both the cell-edit confirm path and the undo action so they stay consistent.
  const applyFieldChange = useCallback(async (issueId: string, projectId: string, field: EditableField, value: string | null) => {
    if (field === 'status') {
      if (!user) return;
      await issueService.changeStatus(issueId, value as IssueStatus, { projectId, actorId: user.id, actorName });
      onPatchIssue(issueId, { status: value as IssueStatus });
    } else if (field === 'assignedTo') {
      if (!user) return;
      const assigneeName = value ? projectMembers.find((m) => m.userId === value)?.profile?.displayName ?? projectMembers.find((m) => m.userId === value)?.profile?.username : null;
      await issueService.assign(issueId, value || null, { projectId, actorId: user.id, actorName, assigneeName });
      onPatchIssue(issueId, { assignedTo: value || null });
    } else if (field === 'title') {
      const title = (value ?? '').trim();
      await issueService.patchField(issueId, { title });
      onPatchIssue(issueId, { title });
    } else if (field === 'type') {
      await issueService.patchField(issueId, { type: value as IssueType });
      onPatchIssue(issueId, { type: value as IssueType });
    } else if (field === 'priority') {
      await issueService.patchField(issueId, { priority: value as IssuePriority });
      onPatchIssue(issueId, { priority: value as IssuePriority });
    } else if (field === 'moduleId') {
      const moduleId = value || null;
      await issueService.patchField(issueId, { moduleId });
      const module = moduleId ? { id: moduleId, name: moduleOptions.find((m) => m.value === moduleId)?.label ?? '' } : null;
      onPatchIssue(issueId, { moduleId, module } as Partial<IssueWithDetails>);
    } else if (field === 'targetRoleId') {
      const targetRoleId = value || null;
      await issueService.patchField(issueId, { targetRoleId });
      const targetRole = targetRoleId ? { id: targetRoleId, name: testRoleOptions.find((r) => r.value === targetRoleId)?.label ?? '' } : null;
      onPatchIssue(issueId, { targetRoleId, targetRole } as any);
    }
  }, [onPatchIssue, moduleOptions, testRoleOptions, user, actorName, projectMembers]);

  const handleUndo = useCallback(async (issueId: string, projectId: string, field: EditableField, previousValue: string | null) => {
    if (undoTimerRef.current) { clearTimeout(undoTimerRef.current); undoTimerRef.current = null; }
    undoToast.current?.clear();
    try {
      await applyFieldChange(issueId, projectId, field, previousValue);
    } catch { /* parent will refetch */ }
  }, [applyFieldChange]);

  const scheduleUndoToast = useCallback((issueId: string, projectId: string, field: EditableField, previousValue: string | null, fieldLabel: string) => {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    undoToast.current?.clear();
    undoToast.current?.show({
      severity: 'info',
      content: (
        <div className="flex align-items-center justify-content-between gap-3 w-full">
          <span>{fieldLabel} updated</span>
          <Button label="Undo" text size="small" className="toast-undo-btn" onClick={() => handleUndo(issueId, projectId, field, previousValue)} />
        </div>
      ),
      sticky: true,
    });
    undoTimerRef.current = setTimeout(() => {
      undoToast.current?.clear();
      undoTimerRef.current = null;
    }, UNDO_TIMEOUT_MS);
  }, [handleUndo]);

  // Takes the new value explicitly (instead of reading state) because PrimeReact's Dropdown
  // fires onHide synchronously after onChange, in the same tick as the setEditValue update —
  // reading editValue from the closure would see the stale pre-selection value.
  const confirmEdit = useCallback(async (row: IssueWithDetails, field: EditableField, value: string | null) => {
    if (cancelledRef.current) return;
    setEditingCell(null);
    setEditValue(null);

    const previousValue = getFieldValue(row, field);
    const normalizedValue = field === 'title' ? (value ?? '').trim() : (value || null);
    const normalizedPrevious = field === 'title' ? (previousValue ?? '').trim() : previousValue;
    if (field === 'title' && !normalizedValue) return;
    if (normalizedValue === normalizedPrevious) return;

    const fieldLabel: Record<EditableField, string> = {
      status: 'Status', assignedTo: 'Assignee', title: 'Title', type: 'Type', priority: 'Priority', moduleId: 'Module', targetRoleId: 'Target Role',
    };
    try {
      await applyFieldChange(row.id, row.projectId, field, value);
      scheduleUndoToast(row.id, row.projectId, field, previousValue, fieldLabel[field]);
    } catch { /* parent will refetch */ }
  }, [getFieldValue, applyFieldChange, scheduleUndoToast]);

  const handleCellKeyDown = useCallback((e: React.KeyboardEvent, row: IssueWithDetails, field: EditableField, value: string | null) => {
    if (e.key === 'Enter') { confirmEdit(row, field, value); }
    else if (e.key === 'Escape') { cancelEdit(); }
  }, [confirmEdit, cancelEdit]);

  const mobileIssueBody = (row: IssueWithDetails) => (
    <div className="flex flex-column gap-1">
      <div className="font-medium">{row.title}</div>
      <div className="flex gap-2 align-items-center text-sm flex-wrap">
        <span className="text-color-secondary">{row.code}</span>
        <Tag value={ISSUE_PRIORITY_LABEL[row.priority]} severity={ISSUE_PRIORITY_SEVERITY[row.priority]} />
        <Tag value={ISSUE_STATUS_LABEL[row.status]} severity={ISSUE_STATUS_SEVERITY[row.status]} />
        <Tag value={ISSUE_TYPE_LABEL[row.type]} severity={ISSUE_TYPE_SEVERITY[row.type]} />
      </div>
      <div className="text-sm text-color-secondary flex gap-2">
        <span>Assignee: {row.assignee?.displayName ?? row.assignedTo ?? '-'}</span>
      </div>
    </div>
  );

  return (
    <>
      <Toast ref={undoToast} position="bottom-center" />
      <FilterToolbar
        primaryAction={canManageIssues && <Button label="New Issue" icon="pi pi-plus" size="small" onClick={onCreate} />}
      >
        <div className="col-6 md:col-2 p-1">
          <MultiSelect
            value={statusFilter}
            options={ISSUE_STATUS_OPTIONS}
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
            options={ISSUE_PRIORITY_OPTIONS}
            onChange={(e) => onPriorityFilterChange(e.value)}
            placeholder="All Priorities"
            className="w-full"
            selectAll
            selectAllLabel="All"
          />
        </div>
        <div className="col-12 md:col-2 p-1">
          <MultiSelect
            value={typeFilter}
            options={(['bug', 'feature', 'improvement', 'task'] as const).map((v) => ({ label: ISSUE_TYPE_LABEL[v], value: v }))}
            onChange={(e) => onTypeFilterChange(e.value)}
            placeholder="All Types"
            className="w-full"
            selectAll
            selectAllLabel="All"
          />
        </div>
        <div className="col-12 md:col-2 p-1">
          <MultiSelect
            value={moduleFilter}
            options={moduleOptions}
            onChange={(e) => onModuleFilterChange(e.value)}
            placeholder="All Modules"
            className="w-full"
            selectAll
            selectAllLabel="All"
            filter
            virtualScrollerOptions={{ itemSize: 40 }}
          />
        </div>
        <div className="col-12 md:col-2 p-1">
          <MultiSelect
            value={testRoleFilter}
            options={testRoleOptions}
            onChange={(e) => onTestRoleFilterChange(e.value)}
            placeholder="All Roles"
            className="w-full"
            selectAll
            selectAllLabel="All"
            filter
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
            filter
            virtualScrollerOptions={{ itemSize: 40 }}
          />
        </div>
        <div className="col-12 md:col p-1">
          <div className="flex gap-2">
            <SearchInput value={search} onChange={onSearchChange} placeholder="Search title..." className="flex-1" />
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
      </FilterToolbar>
      {(canManageIssues || canDeleteContent) && (
        <BulkActionsBar
          selectedCount={selected.length}
          onClear={() => onSelectedChange([])}
          actions={
            <>
              {canManageIssues && (
                <Button label="Bulk Edit" icon="pi pi-pencil" size="small" outlined onClick={openBulkEdit} />
              )}
              {canDeleteContent && (
                <Button label="Delete Selected" icon="pi pi-trash" size="small" severity="danger" outlined onClick={onBulkDelete} />
              )}
            </>
          }
        />
      )}
      <DataTable
        value={issues}
        loading={loading}
        size="small"
        emptyMessage="No issues yet"
        onRowClick={isMobile ? (e) => onRowClick(e.data as IssueWithDetails) : undefined}
        rowHover
        lazy={lazy}
        totalRecords={lazy ? totalRecords : undefined}
        first={lazy ? first : undefined}
        onPage={lazy ? onPage : undefined}
        {...dataTablePaginatorProps}
        rows={rows ?? 10} rowsPerPageOptions={[5, 10, 25, 50]}
        sortField={isMobile ? undefined : sortField}
        sortOrder={isMobile ? undefined : sortOrder}
        onSort={isMobile ? undefined : onSort}
        selection={selected}
        onSelectionChange={(e: any) => onSelectedChange(e.value as IssueWithDetails[])}
        dataKey="id"
        selectionMode={isMobile ? null : 'checkbox'}
        cellMemo={false}
      >
        <Column selectionMode="multiple" style={{ width: '3rem' }} hidden={isMobile} />
        <Column field="code" header="Code" sortable style={{ width: '7rem' }} hidden={isMobile}
          body={(row: IssueWithDetails) => <a className="entity-link" href={`/issues/${row.id}`} onClick={(e) => { e.preventDefault(); navigate(`/issues/${row.id}`); }}>{row.code}</a>} />
        <Column
          field="title"
          header="Title"
          sortable={!isMobile}
          body={isMobile ? mobileIssueBody : (row: IssueWithDetails) => {
            const canEdit = canManageIssues && row.status !== 'closed';
            const isEditing = editingCell?.issueId === row.id && editingCell?.field === 'title';
            if (isEditing && canEdit) {
              return (
                <div ref={editRef} onKeyDown={(e) => handleCellKeyDown(e, row, 'title', editValue)}>
                  <InputText
                    value={editValue ?? ''}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={() => confirmEdit(row, 'title', editValue)}
                    autoFocus
                    className="w-full"
                  />
                </div>
              );
            }
            return (
              <div onClick={(e) => { e.stopPropagation(); canEdit && startEdit(row.id, 'title', row.title); }} style={{ cursor: canEdit ? 'pointer' : undefined }}>
                {row.title}
              </div>
            );
          }}
        />
        <Column
          field="type"
          header="Type"
          sortable
          hidden={isMobile}
          body={(row: IssueWithDetails) => {
            const canEdit = canManageIssues && row.status !== 'closed';
            const isEditing = editingCell?.issueId === row.id && editingCell?.field === 'type';
            if (isEditing && canEdit) {
              return (
                <div ref={editRef} onKeyDown={(e) => handleCellKeyDown(e, row, 'type', editValue)}>
                  <Dropdown value={editValue as IssueType} options={(['bug', 'feature', 'improvement', 'task'] as const).map((v) => ({ label: ISSUE_TYPE_LABEL[v], value: v }))}
                    onChange={(e) => confirmEdit(row, 'type', e.value)}
                    onHide={cancelEdit}
                    autoFocus className="w-10rem" />
                </div>
              );
            }
            return (
              <div onClick={(e) => { e.stopPropagation(); canEdit && startEdit(row.id, 'type', row.type); }} style={{ cursor: canEdit ? 'pointer' : undefined }}>
                <Tag value={ISSUE_TYPE_LABEL[row.type]} severity={ISSUE_TYPE_SEVERITY[row.type]} />
              </div>
            );
          }}
        />
        <Column
          field="moduleName"
          header="Module"
          sortable
          hidden={isMobile}
          body={(row: IssueWithDetails) => {
            const canEdit = canManageIssues && row.status !== 'closed';
            const isEditing = editingCell?.issueId === row.id && editingCell?.field === 'moduleId';
            if (isEditing && canEdit) {
              return (
                <div ref={editRef} onKeyDown={(e) => handleCellKeyDown(e, row, 'moduleId', editValue)}>
                  <Dropdown value={editValue} options={moduleOptions}
                    onChange={(e) => confirmEdit(row, 'moduleId', e.value ?? null)}
                    onHide={cancelEdit}
                    placeholder="No module" showClear autoFocus className="w-10rem" virtualScrollerOptions={{ itemSize: 40 }} />
                </div>
              );
            }
            return (
              <div onClick={(e) => { e.stopPropagation(); canEdit && startEdit(row.id, 'moduleId', row.moduleId); }} style={{ cursor: canEdit ? 'pointer' : undefined }}>
                {row.module?.name ?? '-'}
              </div>
            );
          }}
        />
        <Column
          field="targetRoleName"
          header="Target Role"
          sortable
          hidden={isMobile}
          body={(row: IssueWithDetails) => {
            const canEdit = canManageIssues && row.status !== 'closed';
            const isEditing = editingCell?.issueId === row.id && editingCell?.field === 'targetRoleId';
            if (isEditing && canEdit) {
              return (
                <div ref={editRef} onKeyDown={(e) => handleCellKeyDown(e, row, 'targetRoleId', editValue)}>
                  <Dropdown value={editValue} options={testRoleOptions}
                    onChange={(e) => confirmEdit(row, 'targetRoleId', e.value ?? null)}
                    onHide={cancelEdit}
                    placeholder="None" showClear autoFocus className="w-10rem" />
                </div>
              );
            }
            return (
              <div onClick={(e) => { e.stopPropagation(); canEdit && startEdit(row.id, 'targetRoleId', row.targetRoleId); }} style={{ cursor: canEdit ? 'pointer' : undefined }}>
                {row.targetRole ? <Tag value={row.targetRole.name} severity="secondary" /> : '-'}
              </div>
            );
          }}
        />
        <Column
          header="Tag"
          hidden={isMobile}
          body={(row: IssueWithDetails) => (
            <div className="flex flex-wrap gap-1">
              {row.tags.length > 0 ? row.tags.map((t) => <Tag key={t.id} value={t.name} severity="info" />) : '-'}
            </div>
          )}
        />
        <Column
          header="Linked"
          hidden={isMobile}
          body={(row: IssueWithDetails) =>
            row.linkedTestResults.length > 0 ? (
              <span className="text-sm">{row.linkedTestResults.length} Test Result</span>
            ) : (
              '-'
            )
          }
        />
        <Column
          field="priority"
          header="Priority"
          sortable
          hidden={isMobile}
          body={(row: IssueWithDetails) => {
            const canEdit = canManageIssues && row.status !== 'closed';
            const isEditing = editingCell?.issueId === row.id && editingCell?.field === 'priority';
            if (isEditing && canEdit) {
              return (
                <div ref={editRef} onKeyDown={(e) => handleCellKeyDown(e, row, 'priority', editValue)}>
                  <Dropdown value={editValue as IssuePriority} options={ISSUE_PRIORITY_OPTIONS}
                    onChange={(e) => confirmEdit(row, 'priority', e.value)}
                    onHide={cancelEdit}
                    autoFocus className="w-10rem" />
                </div>
              );
            }
            return (
              <div onClick={(e) => { e.stopPropagation(); canEdit && startEdit(row.id, 'priority', row.priority); }} style={{ cursor: canEdit ? 'pointer' : undefined }}>
                <Tag value={ISSUE_PRIORITY_LABEL[row.priority]} severity={ISSUE_PRIORITY_SEVERITY[row.priority]} />
              </div>
            );
          }}
        />
        <Column
          field="status"
          header="Status"
          sortable
          hidden={isMobile}
          body={(row: IssueWithDetails) => {
            const isEditing = editingCell?.issueId === row.id && editingCell?.field === 'status';
            if (isEditing && canManageIssues) {
              return (
                <div ref={editRef} onKeyDown={(e) => handleCellKeyDown(e, row, 'status', editValue)}>
                  <Dropdown value={editValue as IssueStatus} options={ISSUE_STATUS_OPTIONS}
                    onChange={(e) => confirmEdit(row, 'status', e.value)}
                    onHide={cancelEdit}
                    autoFocus className="w-10rem" />
                </div>
              );
            }
            return (
              <div onClick={(e) => { e.stopPropagation(); canManageIssues && startEdit(row.id, 'status', row.status); }} style={{ cursor: canManageIssues ? 'pointer' : undefined }}>
                <Tag value={ISSUE_STATUS_LABEL[row.status]} severity={ISSUE_STATUS_SEVERITY[row.status]} />
              </div>
            );
          }}
        />
        <Column
          field="assignedTo"
          header="Assigned To"
          sortable
          hidden={isMobile}
          body={(row: IssueWithDetails) => {
            const canEdit = canManageIssues && row.status !== 'closed';
            const isEditing = editingCell?.issueId === row.id && editingCell?.field === 'assignedTo';
            if (isEditing && canEdit) {
              return (
                <div ref={editRef} onKeyDown={(e) => handleCellKeyDown(e, row, 'assignedTo', editValue)}>
                  <Dropdown value={editValue} options={projectMembers.map((m) => ({ label: m.profile?.displayName ?? m.profile?.username ?? m.email, value: m.userId }))}
                    onChange={(e) => confirmEdit(row, 'assignedTo', e.value ?? null)}
                    onHide={cancelEdit}
                    placeholder="Unassigned" showClear autoFocus className="w-10rem" />
                </div>
              );
            }
            const display = row.assignee?.displayName ?? row.assignedTo ?? '-';
            return (
              <div onClick={(e) => { e.stopPropagation(); canEdit && startEdit(row.id, 'assignedTo', row.assignedTo); }} style={{ cursor: canEdit ? 'pointer' : undefined }}>
                {display}
              </div>
            );
          }}
        />
        <Column
          header=""
          style={{ width: '3.5rem' }}
          body={(row: IssueWithDetails) => (
            <RowActionsMenu
              items={[
                { label: 'Detail', icon: 'pi pi-external-link', command: () => onRowClick(row) },
                ...(canManageIssues && row.status !== 'closed'
                  ? [{ label: 'Edit', icon: 'pi pi-pencil', command: () => onEdit(row) }]
                  : []),
                ...(canManageIssues
                  ? [{ label: 'Duplicate', icon: 'pi pi-copy', command: () => onDuplicate(row) }]
                  : []),
                ...(canManageIssues && row.status !== 'closed'
                  ? [
                    {
                      label: 'Archive',
                      icon: 'pi pi-inbox',
                      command: () => {
                        confirmDialog({
                          header: 'Archive Issue',
                          message: `Issue "${row.title}" will be archived (closed). Continue?`,
                          icon: 'pi pi-info-circle',
                          acceptLabel: 'Archive',
                          rejectLabel: 'Cancel',
                          accept: async () => {
                            if (!user) return;
                            await issueService.changeStatus(row.id, 'closed', { projectId: row.projectId, actorId: user.id, actorName });
                            onPatchIssue(row.id, { status: 'closed' });
                            onToastSuccess('Issue archived');
                          },
                        });
                      },
                    },
                  ]
                  : []),
                ...(canDeleteContent
                  ? [
                    {
                      label: 'Delete',
                      icon: 'pi pi-trash',
                      className: 'p-error',
                      command: () => {
                        confirmDialog({
                          header: 'Delete Issue',
                          message: `Issue "${row.title}" will be permanently deleted. Continue?`,
                          icon: 'pi pi-exclamation-triangle',
                          acceptLabel: 'Delete',
                          rejectLabel: 'Cancel',
                          acceptClassName: 'p-button-danger',
                          accept: async () => {
                            await issueService.remove(row.id);
                            await onReload();
                            onToastSuccess('Issue deleted');
                          },
                        });
                      },
                    },
                  ]
                  : []),
              ]}
            />
          )}
        />
      </DataTable>

      <Dialog header={`Bulk Edit (${selected.length} selected)`} visible={bulkEditOpen} onHide={() => setBulkEditOpen(false)} style={{ width: '28rem' }}>
        <div className="flex flex-column gap-3">
          <p className="text-color-secondary text-sm m-0">Only fields you set below will be changed. Leave a field unset to keep it unchanged on every selected issue.</p>
          <div className="flex flex-column">
            <FloatLabel className="ifta-field">
              <Dropdown
                id="bulk-issue-status"
                value={bulkStatus === UNSET ? null : bulkStatus}
                options={ISSUE_STATUS_OPTIONS}
                onChange={(e) => setBulkStatus(e.value)}
                className="w-full"
              />
              <label htmlFor="bulk-issue-status">Status (unchanged if empty)</label>
            </FloatLabel>
          </div>
          <div className="flex flex-column">
            <FloatLabel className="ifta-field">
              <Dropdown
                id="bulk-issue-assigned"
                value={bulkAssignedTo === UNSET ? null : bulkAssignedTo}
                options={projectMembers.map((m) => ({ label: m.profile?.displayName ?? m.profile?.username ?? m.email, value: m.userId }))}
                onChange={(e) => setBulkAssignedTo(e.value)}
                showClear
                className="w-full"
              />
              <label htmlFor="bulk-issue-assigned">Assigned To (unchanged if empty)</label>
            </FloatLabel>
          </div>
          <Button
            label="Apply"
            size="small"
            disabled={bulkStatus === UNSET && bulkAssignedTo === UNSET}
            onClick={applyBulkEdit}
          />
        </div>
      </Dialog>
    </>
  );
}
