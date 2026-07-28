import { Button } from 'primereact/button';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Dropdown } from 'primereact/dropdown';
import { Tag } from 'primereact/tag';
import { RowActionsMenu } from '../../../../components/ui/RowActionsMenu';
import SearchInput from '../../../../components/ui/SearchInput';
import { BulkActionsBar } from '../../../../components/ui/BulkActionsBar';
import { dataTablePaginatorProps } from '../../../../components/ui/dataTablePaginator';
import type { ProjectMemberWithProfile, ProjectMemberRole, ProjectMemberStatus } from '../../../../types/domain';
import { PROJECT_MEMBER_ROLE_LABEL, PROJECT_MEMBER_STATUS_LABEL, PROJECT_MEMBER_STATUS_SEVERITY } from '../../../../helpers/statusLabels';

const MEMBER_ROLE_OPTIONS: { label: string; value: ProjectMemberRole }[] = [
  { label: PROJECT_MEMBER_ROLE_LABEL.member, value: 'member' },
  { label: PROJECT_MEMBER_ROLE_LABEL.supervisor, value: 'supervisor' },
  { label: PROJECT_MEMBER_ROLE_LABEL.tester, value: 'tester' },
  { label: PROJECT_MEMBER_ROLE_LABEL.manager, value: 'manager' },
];

type MembersTabProps = {
  members: ProjectMemberWithProfile[];
  isMobile: boolean;
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
  const mobileBody = (row: ProjectMemberWithProfile) => (
    <div className="flex align-items-start justify-content-between gap-2 py-1">
      <div className="flex flex-column gap-2">
        <div className="font-medium">{row.profile.displayName ?? '-'}</div>
        <div className="text-sm text-color-secondary">@{row.profile.username}</div>
        <div className="text-sm text-color-secondary">
          Status: <Tag value={PROJECT_MEMBER_STATUS_LABEL[row.status]} severity={PROJECT_MEMBER_STATUS_SEVERITY[row.status]} />
        </div>
        <Dropdown
          value={row.role}
          options={MEMBER_ROLE_OPTIONS}
          onChange={(e) => onChangeRole(row, e.value)}
          className="w-10rem"
        />
      </div>
      <RowActionsMenu
        items={[
          ...(row.status === 'declined'
            ? [{ label: 'Reinvite', icon: 'pi pi-send', command: () => onReinvite(row) }]
            : []),
          { label: 'Delete', icon: 'pi pi-trash', className: 'p-error', command: () => onRemove(row) },
        ]}
      />
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
      >
        {!isMobile && <Column selectionMode="multiple" style={{ width: '3rem' }} />}
        {isMobile && <Column header="Member" body={mobileBody} />}
        {!isMobile && <Column header="Name" body={(row: ProjectMemberWithProfile) => row.profile.displayName ?? '-'} />}
        {!isMobile && <Column header="Username" body={(row: ProjectMemberWithProfile) => `@${row.profile.username}`} />}
        {!isMobile && (
          <Column
            header="Status"
            body={(row: ProjectMemberWithProfile) => (
              <Tag value={PROJECT_MEMBER_STATUS_LABEL[row.status]} severity={PROJECT_MEMBER_STATUS_SEVERITY[row.status]} />
            )}
          />
        )}
        {!isMobile && (
          <Column
            header="Role"
            body={(row: ProjectMemberWithProfile) => (
              <Dropdown
                value={row.role}
                options={MEMBER_ROLE_OPTIONS}
                onChange={(e) => onChangeRole(row, e.value)}
                className="w-10rem"
              />
            )}
          />
        )}
        {!isMobile && (
          <Column
            header=""
            style={{ width: '3.5rem' }}
            body={(row: ProjectMemberWithProfile) => (
              <RowActionsMenu
                items={[
                  ...(row.status === 'declined'
                    ? [{ label: 'Reinvite', icon: 'pi pi-send', command: () => onReinvite(row) }]
                    : []),
                  { label: 'Delete', icon: 'pi pi-trash', className: 'p-error', command: () => onRemove(row) },
                ]}
              />
            )}
          />
        )}
      </DataTable>
    </>
  );
}
