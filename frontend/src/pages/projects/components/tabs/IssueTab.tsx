import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from 'primereact/button';
import { DataTable, type DataTablePageEvent, type DataTableStateEvent } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Dropdown } from 'primereact/dropdown';
import { MultiSelect } from 'primereact/multiselect';
import { Tag } from 'primereact/tag';
import SearchInput from '../../../../components/ui/SearchInput';
import { confirmDialog } from 'primereact/confirmdialog';
import { RowActionsMenu } from '../../../../components/ui/RowActionsMenu';
import { BulkActionsBar } from '../../../../components/ui/BulkActionsBar';
import type { IssueWithDetails, IssueStatus, IssuePriority, IssueType, ProjectMemberWithProfile } from '../../../../types/domain';
import { issueService } from '../../../../services/issueService';
import {
  ISSUE_PRIORITY_LABEL,
  ISSUE_PRIORITY_SEVERITY,
  ISSUE_STATUS_LABEL,
  ISSUE_STATUS_SEVERITY,
  ISSUE_TYPE_LABEL,
  ISSUE_TYPE_SEVERITY,
} from '../../../../helpers/statusLabels';

const ISSUE_STATUS_OPTIONS: { label: string; value: IssueStatus }[] = (
  ['open', 'in_progress', 'resolved', 'verified', 'closed'] as const
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
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  moduleOptions: { label: string; value: string }[];
  tagOptions: { label: string; value: string }[];
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
  onRowClick: (row: IssueWithDetails) => void;
  onPatchIssue: (_issueId: string, _changes: Partial<IssueWithDetails>) => void;
  onReload: () => Promise<void>;
  onToastSuccess: (summary: string) => void;
  lazy?: boolean;
  totalRecords?: number;
  first?: number;
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
  hasActiveFilters,
  onClearFilters,
  moduleOptions,
  tagOptions,
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
  onRowClick,
  onPatchIssue,
  onReload,
  onToastSuccess,
  lazy,
  totalRecords,
  first,
  onPage,
}: IssueTabProps) {
  const navigate = useNavigate();
  const [editingCell, setEditingCell] = useState<{ issueId: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState<string | null>(null);
  const editRef = useRef<HTMLDivElement>(null);

  const startEdit = useCallback((issueId: string, field: string, currentValue: string | null) => {
    setEditingCell({ issueId, field });
    setEditValue(currentValue);
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingCell(null);
    setEditValue(null);
  }, []);

  const confirmEdit = useCallback(async (row: IssueWithDetails, field: string) => {
    if (!editingCell || editValue === null) return;
    try {
      if (field === 'status') {
        await issueService.changeStatus(row.id, editValue as IssueStatus);
        onPatchIssue(row.id, { status: editValue as IssueStatus });
      } else if (field === 'assignedTo') {
        await issueService.assign(row.id, editValue || null);
        onPatchIssue(row.id, { assignedTo: editValue || null });
      }
    } catch { /* parent will refetch */ }
    cancelEdit();
  }, [editingCell, editValue, onPatchIssue, cancelEdit]);

  const handleCellKeyDown = useCallback((e: React.KeyboardEvent, row: IssueWithDetails, field: string) => {
    if (e.key === 'Enter') { confirmEdit(row, field); }
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
      <div className="grid mb-2">
        <div className="col-12 md:col-3">
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
        <div className="col-12 md:col-3">
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
            value={typeFilter}
            options={(['bug', 'feature', 'improvement', 'task'] as const).map((v) => ({ label: ISSUE_TYPE_LABEL[v], value: v }))}
            onChange={(e) => onTypeFilterChange(e.value)}
            placeholder="All Types"
            className="w-full"
            selectAll
            selectAllLabel="All"
          />
        </div>
        <div className="col-12 md:col">
          <div className="flex gap-2">
            <SearchInput value={search} onChange={onSearchChange} placeholder="Search title..." className="flex-1" />
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
        {canManageIssues && (
          <div className="col-12 md:col-fixed">
            <Button label="New Issue" icon="pi pi-plus" size="small" className="w-full md:w-auto" onClick={onCreate} />
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
        value={issues}
        loading={loading}
        size="small"
        emptyMessage="No issues yet"
        rowHover
        lazy={lazy}
        totalRecords={lazy ? totalRecords : undefined}
        first={lazy ? first : undefined}
        onPage={lazy ? onPage : undefined}
        paginator
        paginatorTemplate="CurrentPageReport FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
        currentPageReportTemplate="{totalRecords} records"
        rows={10} rowsPerPageOptions={[5, 10, 25, 50]}
        sortField={isMobile ? undefined : sortField}
        sortOrder={isMobile ? undefined : sortOrder}
        onSort={isMobile ? undefined : onSort}
        selection={selected}
        onSelectionChange={(e: any) => onSelectedChange(e.value as IssueWithDetails[])}
        dataKey="id"
        selectionMode={isMobile ? null : 'checkbox'}
      >
        <Column selectionMode="multiple" style={{ width: '3rem' }} hidden={isMobile} />
        <Column field="code" header="Code" sortable style={{ width: '7rem' }} hidden={isMobile}
          body={(row: IssueWithDetails) => <a className="entity-link" href={`/issues/${row.id}`} onClick={(e) => { e.preventDefault(); navigate(`/issues/${row.id}`); }}>{row.code}</a>} />
        <Column field="title" header="Title" sortable={!isMobile} body={isMobile ? mobileIssueBody : undefined} />
        <Column
          field="type"
          header="Type"
          sortable
          hidden={isMobile}
          body={(row: IssueWithDetails) => <Tag value={ISSUE_TYPE_LABEL[row.type]} severity={ISSUE_TYPE_SEVERITY[row.type]} />}
        />
        <Column
          field="moduleName"
          header="Module"
          sortable
          hidden={isMobile}
          body={(row: IssueWithDetails) => row.module?.name ?? '-'}
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
        <Column field="priority" header="Priority" sortable hidden={isMobile} body={(row: IssueWithDetails) => <Tag value={ISSUE_PRIORITY_LABEL[row.priority]} severity={ISSUE_PRIORITY_SEVERITY[row.priority]} />} />
        <Column
          field="status"
          header="Status"
          sortable
          hidden={isMobile}
          body={(row: IssueWithDetails) => {
            const isEditing = editingCell?.issueId === row.id && editingCell?.field === 'status';
            if (isEditing && canManageIssues) {
              return (
                <div ref={editRef} onKeyDown={(e) => handleCellKeyDown(e, row, 'status')}>
                  <Dropdown value={editValue as IssueStatus} options={ISSUE_STATUS_OPTIONS}
                    onChange={(e) => { setEditValue(e.value); }}
                    onHide={() => confirmEdit(row, 'status')}
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
            const isEditing = editingCell?.issueId === row.id && editingCell?.field === 'assignedTo';
            if (isEditing && canManageIssues) {
              return (
                <div ref={editRef} onKeyDown={(e) => handleCellKeyDown(e, row, 'assignedTo')}>
                  <Dropdown value={editValue} options={projectMembers.map((m) => ({ label: m.profile.displayName ?? m.profile.username, value: m.userId }))}
                    onChange={(e) => { setEditValue(e.value ?? null); }}
                    onHide={() => confirmEdit(row, 'assignedTo')}
                    placeholder="Unassigned" showClear autoFocus className="w-10rem" />
                </div>
              );
            }
            const display = row.assignee?.displayName ?? row.assignedTo ?? '-';
            return (
              <div onClick={(e) => { e.stopPropagation(); canManageIssues && startEdit(row.id, 'assignedTo', row.assignedTo); }} style={{ cursor: canManageIssues ? 'pointer' : undefined }}>
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
                ...(canManageIssues
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
                            await issueService.changeStatus(row.id, 'closed');
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
    </>
  );
}
