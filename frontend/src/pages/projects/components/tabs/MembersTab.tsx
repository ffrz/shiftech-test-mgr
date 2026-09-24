import { Button } from 'primereact/button';
import { useState } from 'react';
import { DataTable, type DataTableSortEvent } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Dropdown } from 'primereact/dropdown';
import { Tag } from 'primereact/tag';
import { RowActionsMenu } from '../../../../components/ui/RowActionsMenu';
import SearchInput from '../../../../components/ui/SearchInput';
import { BulkActionsBar } from '../../../../components/ui/BulkActionsBar';
import { dataTablePaginatorProps } from '../../../../components/ui/dataTablePaginator';
import { UserHoverCard } from '../../../../components/ui/UserHoverCard';
import type { ProjectMemberWithProfile, ProjectMemberRole, ProjectMemberStatus } from '../../../../types/domain';
import { PROJECT_MEMBER_ROLE_LABEL, PROJECT_MEMBER_ROLE_SEVERITY, PROJECT_MEMBER_STATUS_LABEL, PROJECT_MEMBER_STATUS_SEVERITY } from '../../../../helpers/statusLabels';
import { useColumnPreferences, type ColumnDef } from '../../../../hooks/useColumnPreferences';
import { ColumnPickerButton } from '../../../../components/ui/ColumnPickerButton';

const MEMBER_COLUMNS: ColumnDef[] = [
  { key: 'sel', label: 'Select', locked: true },
  { key: 'username', label: 'Username', locked: true, sortField: 'profile.username' },
  { key: 'name', label: 'Name', locked: true, sortField: 'profile.displayName' },
  { key: 'status', label: 'Status', fallbackWidth: '9rem', sortField: 'status' },
  { key: 'role', label: 'Role', fallbackWidth: '10rem', sortField: 'role' },
  { key: 'actions', label: 'Actions', locked: true },
];

const MEMBER_ROLE_OPTIONS: { label: string; value: ProjectMemberRole }[] = [
  { label: PROJECT_MEMBER_ROLE_LABEL.member, value: 'member' },
  { label: PROJECT_MEMBER_ROLE_LABEL.supervisor, value: 'supervisor' },
  { label: PROJECT_MEMBER_ROLE_LABEL.tester, value: 'tester' },
  // 'manager' is intentionally excluded — it is labelled "Owner" and must not appear
  // as an assignable option because adding/creating a new owner through the role select
  // is forbidden. Ownership transfer is a future Danger Zone feature.
];

type MembersTabProps = {
  members: ProjectMemberWithProfile[];
  isMobile: boolean;
  ownerId: string;
  search: string;
  onSearchChange: (value: string) => void;
  roleFilter: ProjectMemberRole | '';
  onRoleFilterChange: (value: ProjectMemberRole | '') => void;
  statusFilter: ProjectMemberStatus | '';
  onStatusFilterChange: (value: ProjectMemberStatus | '') => void;
  selected: ProjectMemberWithProfile[];
  onSelectedChange: (value: ProjectMemberWithProfile[]) => void;
  onInvite: () => void;
  onChangeRole: (row: ProjectMemberWithProfile, role: ProjectMemberRole) => void;
  onReinvite: (row: ProjectMemberWithProfile) => void;
  onRemove: (row: ProjectMemberWithProfile) => void;
  onBulkRemove: () => void;
};

export { MEMBER_ROLE_OPTIONS };

export function MembersTab({
  members,
  isMobile,
  ownerId,
  search,
  onSearchChange,
  roleFilter,
  onRoleFilterChange,
  statusFilter,
  onStatusFilterChange,
  selected,
  onSelectedChange,
  onInvite,
  onChangeRole,
  onReinvite,
  onRemove,
  onBulkRemove,
}: MembersTabProps) {
  const cp = useColumnPreferences('projectMembers', MEMBER_COLUMNS);
  const [sortField, setSortField] = useState('name');
  const [sortOrder, setSortOrder] = useState<1 | -1>(1);
  const onTableSort = (e: DataTableSortEvent) => { setSortField(String(e.sortField ?? 'name')); setSortOrder((e.sortOrder as 1 | -1) ?? 1); };
  const handleSortFieldChange = (field: string) => onTableSort({ sortField: field, sortOrder } as DataTableSortEvent);
  const handleSortOrderChange = (order: 1 | -1) => onTableSort({ sortField, sortOrder: order } as DataTableSortEvent);
  function isOwner(userId: string) { return userId === ownerId; }

  // The owner's membership is immutable — no role dropdown and no actions, so ownership
  // can't be moved from the members tab. Ownership transfer belongs in a future Danger
  // Zone feature, not here.
  const lockedOwnerBadge = (
    <div className="flex align-items-center gap-2">
      <Tag value="Owner" severity="info" />
      <i className="pi pi-lock text-color-secondary" style={{ fontSize: '0.8rem' }} title="Owner — cannot be changed here" />
    </div>
  );

  const mobileBody = (row: ProjectMemberWithProfile) => (
    <div className="flex align-items-start justify-content-between gap-2 py-1">
      <div className="flex flex-column gap-2">
        <div className="font-medium">{row.profile?.displayName ?? (row.email || '-')}</div>
        <div className="text-sm">
          {row.profile?.username ? (
            <UserHoverCard userId={row.userId}>
              <span className="username-link">@{row.profile.username}</span>
            </UserHoverCard>
          ) : (
            <span className="username-text">{row.email || '-'}</span>
          )}
        </div>
        <div className="text-sm text-color-secondary">
          Status: <Tag value={PROJECT_MEMBER_STATUS_LABEL[row.status]} severity={PROJECT_MEMBER_STATUS_SEVERITY[row.status]} />
        </div>
        {isOwner(row.userId)
          ? lockedOwnerBadge
          : row.role === 'manager'
            ? <Tag value={PROJECT_MEMBER_ROLE_LABEL[row.role]} severity={PROJECT_MEMBER_ROLE_SEVERITY[row.role]} />
            : (
              <Dropdown
                value={row.role}
                options={MEMBER_ROLE_OPTIONS}
                onChange={(e) => onChangeRole(row, e.value)}
                className="w-10rem"
              />
            )}
      </div>
      {!isOwner(row.userId) && (
        <RowActionsMenu
          items={[
            ...(row.status === 'declined'
              ? [{ label: 'Reinvite', icon: 'pi pi-send', command: () => onReinvite(row) }]
              : []),
            { label: 'Delete', icon: 'pi pi-trash', className: 'p-error', command: () => onRemove(row) },
          ]}
        />
      )}
    </div>
  );

  return (
    <>
      <p className="text-color-secondary text-sm mb-3">
        Only accepted members (or the owner) can access this project. Invited users must accept before they gain access. Managers can manage other members.
      </p>
      <div className="flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
        <div className="flex gap-2 flex-wrap">
          <SearchInput value={search} onChange={onSearchChange} placeholder="Search name/username/email..." />
          <Dropdown
            value={roleFilter}
            options={[{ label: 'All Roles', value: '' as const }, ...MEMBER_ROLE_OPTIONS]}
            onChange={(e) => onRoleFilterChange(e.value)}
            className="w-10rem"
            showClear={!!roleFilter}
            placeholder="Role"
          />
          <Dropdown
            value={statusFilter}
            options={[
              { label: 'All Statuses', value: '' as const },
              { label: PROJECT_MEMBER_STATUS_LABEL.invited, value: 'invited' as const },
              { label: PROJECT_MEMBER_STATUS_LABEL.accepted, value: 'accepted' as const },
              { label: PROJECT_MEMBER_STATUS_LABEL.declined, value: 'declined' as const },
            ]}
            onChange={(e) => onStatusFilterChange(e.value)}
            className="w-10rem"
            showClear={!!statusFilter}
            placeholder="Status"
          />
        </div>
        <Button label="Invite Member" icon="pi pi-plus" size="small" onClick={onInvite} />
      </div>
      <BulkActionsBar
        selectedCount={selected.length}
        onClear={() => onSelectedChange([])}
        actions={<Button label="Delete Selected" icon="pi pi-trash" size="small" severity="danger" outlined onClick={onBulkRemove} />}
      />
      <DataTable
        value={members}
        size="small"
        emptyMessage="No members yet"
        {...dataTablePaginatorProps}
        rows={10} rowsPerPageOptions={[5, 10, 25, 50]}
        selection={selected}
        onSelectionChange={(e: any) => onSelectedChange(e.value as ProjectMemberWithProfile[])}
        dataKey="id"
        selectionMode="checkbox"
        sortField={sortField}
        sortOrder={sortOrder}
        onSort={onTableSort}
      >
        {cp.arrange([
        ['sel', <Column key="sel" selectionMode="multiple" style={{ width: '3rem' }} hidden={isMobile} />],
        ['username', <Column key="username" columnKey="username" field="profile.username" sortable header="Username" hidden={isMobile} body={(row: ProjectMemberWithProfile) => row.profile?.username ? (
          <UserHoverCard userId={row.userId}>
            <span className="username-link">{row.profile.username}</span>
          </UserHoverCard>
        ) : (row.email || '-')} />],
        ['name', <Column key="name" columnKey="name" field="profile.displayName" sortable={!isMobile} header="Name" body={isMobile ? mobileBody : (row: ProjectMemberWithProfile) => <span>{row.profile?.displayName ?? (row.email || '-')}</span>} />],
        ['status', <Column
            columnKey="status" field="status" sortable header="Status"
            hidden={isMobile || !cp.isVisible('status')}
            body={(row: ProjectMemberWithProfile) => (
              <Tag value={PROJECT_MEMBER_STATUS_LABEL[row.status]} severity={PROJECT_MEMBER_STATUS_SEVERITY[row.status]} />
            )}
          />],
        ['role', <Column
            columnKey="role" field="role" sortable header="Role"
            hidden={isMobile || !cp.isVisible('role')}
            body={(row: ProjectMemberWithProfile) => isOwner(row.userId)
              ? lockedOwnerBadge
              : row.role === 'manager'
                ? <Tag value={PROJECT_MEMBER_ROLE_LABEL[row.role]} severity={PROJECT_MEMBER_ROLE_SEVERITY[row.role]} />
                : (
                  <Dropdown
                    value={row.role}
                    options={MEMBER_ROLE_OPTIONS}
                    onChange={(e) => onChangeRole(row, e.value)}
                    className="w-10rem"
                  />
                )}
          />],
        ['actions', <Column
            columnKey="actions"
            header={<ColumnPickerButton reorderableColumns={cp.reorderableColumns} order={cp.order} isVisible={cp.isVisible} setVisible={cp.setVisible} reset={cp.reset} canReorder={!isMobile} reorderColumn={cp.reorderColumn} sortableColumns={cp.sortableColumns} sortField={sortField} sortOrder={sortOrder} onSortFieldChange={handleSortFieldChange} onSortOrderChange={handleSortOrderChange} />}
            style={{ width: '3.5rem' }}
            body={(row: ProjectMemberWithProfile) => (
              !isOwner(row.userId) ? (
                <RowActionsMenu
                  items={[
                    ...(row.status === 'declined'
                      ? [{ label: 'Reinvite', icon: 'pi pi-send', command: () => onReinvite(row) }]
                      : []),
                    { label: 'Delete', icon: 'pi pi-trash', className: 'p-error', command: () => onRemove(row) },
                  ]}
                />
              ) : null
            )}
          />],
        ])}
      </DataTable>
    </>
  );
}
