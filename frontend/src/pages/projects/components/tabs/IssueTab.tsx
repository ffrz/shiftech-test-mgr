import { Button } from 'primereact/button';
import { DataTable, type DataTableStateEvent } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Dropdown } from 'primereact/dropdown';
import { MultiSelect } from 'primereact/multiselect';
import { Tag } from 'primereact/tag';
import SearchInput from '../../../../components/ui/SearchInput';
import { confirmDialog } from 'primereact/confirmdialog';
import { RowActionsMenu } from '../../../../components/ui/RowActionsMenu';
import { BulkActionsBar } from '../../../../components/ui/BulkActionsBar';
import type { IssueWithDetails, IssueStatus, IssuePriority, ProjectMemberWithProfile } from '../../../../types/domain';
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
  onPatchIssue: (issueId: string, changes: Partial<IssueWithDetails>) => void;
  onReload: () => Promise<void>;
  onToastSuccess: (summary: string) => void;
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
}: IssueTabProps) {
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
      <div className="flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
        <div className="flex align-items-center gap-2 flex-wrap">
          <SearchInput value={search} onChange={onSearchChange} placeholder="Search title..." />
          <MultiSelect
            value={statusFilter}
            options={ISSUE_STATUS_OPTIONS}
            onChange={(e) => onStatusFilterChange(e.value)}
            placeholder="All Statuses"
            className="w-12rem"
            selectAll
            selectAllLabel="All"
          />
          <MultiSelect
            value={priorityFilter}
            options={ISSUE_PRIORITY_OPTIONS}
            onChange={(e) => onPriorityFilterChange(e.value)}
            placeholder="All Priorities"
            className="w-12rem"
            selectAll
            selectAllLabel="All"
          />
          <MultiSelect
            value={moduleFilter}
            options={moduleOptions}
            onChange={(e) => onModuleFilterChange(e.value)}
            placeholder="All Modules"
            className="w-11rem"
            selectAll
            selectAllLabel="All"
          />
          <MultiSelect
            value={tagFilter}
            options={tagOptions}
            onChange={(e) => onTagFilterChange(e.value)}
            placeholder="All Tags"
            className="w-11rem"
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
        {canManageIssues && <Button label="New Issue" icon="pi pi-plus" size="small" onClick={onCreate} />}
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
        onRowClick={(e) => onRowClick(e.data as IssueWithDetails)}
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
        onSelectionChange={(e: any) => onSelectedChange(e.value as IssueWithDetails[])}
        dataKey="id"
        selectionMode={isMobile ? null : 'checkbox'}
      >
        <Column selectionMode="multiple" style={{ width: '3rem' }} hidden={isMobile} />
        <Column field="code" header="Code" sortable style={{ width: '7rem' }} hidden={isMobile} />
        <Column field="title" header="Title" sortable={!isMobile} body={isMobile ? mobileIssueBody : undefined} />
        <Column
          header="Tipe"
          hidden={isMobile}
          body={(row: IssueWithDetails) => <Tag value={ISSUE_TYPE_LABEL[row.type]} severity={ISSUE_TYPE_SEVERITY[row.type]} />}
        />
        <Column
          header="Modul"
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
          hidden={isMobile}
          body={(row: IssueWithDetails) => (
            <div onClick={(e) => e.stopPropagation()}>
              <Dropdown
                value={row.status}
                options={ISSUE_STATUS_OPTIONS}
                onChange={(e) => {
                  issueService.changeStatus(row.id, e.value);
                  onPatchIssue(row.id, { status: e.value });
                }}
                disabled={!canManageIssues}
                className="w-11rem"
              />
            </div>
          )}
        />
        <Column
          field="assignedTo"
          header="Assigned To"
          hidden={isMobile}
          body={(row: IssueWithDetails) => (
            <div onClick={(e) => e.stopPropagation()}>
              <Dropdown
                value={row.assignedTo}
                options={projectMembers.map((m) => ({ label: m.profile.displayName ?? m.profile.username, value: m.userId }))}
                onChange={(e) => {
                  issueService.assign(row.id, e.value);
                  onPatchIssue(row.id, { assignedTo: e.value });
                }}
                placeholder="Unassigned"
                showClear
                disabled={!canManageIssues}
                className="w-11rem"
              />
            </div>
          )}
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
