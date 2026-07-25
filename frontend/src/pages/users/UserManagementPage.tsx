import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Tag } from 'primereact/tag';
import { Button } from 'primereact/button';
import { Menu } from 'primereact/menu';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Toast } from 'primereact/toast';
import { useProfiles } from '../../hooks/useProfiles';
import { profileService } from '../../services/profileService';
import type { Profile } from '../../types/domain';
import { useAuthContext } from '../../hooks/useAuth';
import { formatDateTime } from '../../helpers/dateFormatter';
import { PageHeader } from '../../components/ui/PageHeader';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import { USER_ROLE_LABEL, USER_ROLE_SEVERITY } from '../../helpers/statusLabels';

export function UserManagementPage() {
  const { profiles, loading, reload } = useProfiles();
  const { profile: currentProfile } = useAuthContext();
  const navigate = useNavigate();
  const toast = useRef<Toast>(null);
  const menuRef = useRef<Menu>(null);
  const [menuRow, setMenuRow] = useState<Profile | null>(null);

  async function handleApprove(row: Profile) {
    await profileService.approve(row.id);
    toast.current?.show({ severity: 'success', summary: 'User approved', detail: row.email });
    await reload();
  }

  async function handlePromote(row: Profile) {
    await profileService.promoteToAdmin(row.id);
    await reload();
  }

  async function handleDemote(row: Profile) {
    await profileService.demoteToUser(row.id);
    await reload();
  }

  function handleRevokeAccess(row: Profile) {
    confirmDialog({
      header: 'Revoke Access',
      message: `Access for "${row.email}" will be revoked and their status reset to pending until re-approved. Continue?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Revoke Access',
      rejectLabel: 'Cancel',
      acceptClassName: 'p-button-warning',
      accept: async () => {
        await profileService.revokeAccess(row.id);
        toast.current?.show({ severity: 'warn', summary: 'Access revoked', detail: row.email });
        await reload();
      },
    });
  }

  function handleDelete(row: Profile) {
    confirmDialog({
      header: 'Delete User',
      message: `User "${row.email}" will be removed from the list. Continue?`,
      icon: 'pi pi-trash',
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        await profileService.remove(row.id);
        toast.current?.show({ severity: 'success', summary: 'User deleted', detail: row.email });
        await reload();
      },
    });
  }

  function openRowMenu(row: Profile, event: React.MouseEvent) {
    setMenuRow(row);
    menuRef.current?.toggle(event);
  }

  const isMenuRowSelf = menuRow?.id === currentProfile?.id;

  const menuItems = menuRow
    ? [
      { label: 'View Details', icon: 'pi pi-eye', command: () => navigate(`/users/${menuRow.id}`) },
      ...(menuRow.role === 'pending'
        ? [{ separator: true }, { label: 'Approve', icon: 'pi pi-check', command: () => handleApprove(menuRow) }]
        : []),
      ...(menuRow.role === 'user'
        ? [{ separator: true }, { label: 'Make Admin', icon: 'pi pi-shield', command: () => handlePromote(menuRow) }]
        : []),
      ...(menuRow.role === 'admin' && !isMenuRowSelf
        ? [{ separator: true }, { label: 'Demote to User', icon: 'pi pi-user', command: () => handleDemote(menuRow) }]
        : []),
      ...(menuRow.role !== 'pending' && !isMenuRowSelf
        ? [{ label: 'Revoke Access', icon: 'pi pi-lock', command: () => handleRevokeAccess(menuRow) }]
        : []),
      ...(!isMenuRowSelf
        ? [{ separator: true }, { label: 'Delete', icon: 'pi pi-trash', command: () => handleDelete(menuRow) }]
        : []),
    ]
    : [];

  return (
    <div>
      <Toast ref={toast} />
      <ConfirmDialog />
      <Menu model={menuItems} popup ref={menuRef} />

      <Breadcrumb items={[{ label: 'User Management' }]} />

      <PageHeader title="User Management" />
      <DataTable
        value={profiles}
        loading={loading}
        paginator
        rows={5}
        emptyMessage="No users yet"
        size="small"
        onRowClick={(e) => navigate(`/users/${(e.data as Profile).id}`)}
        rowHover
        className="cursor-pointer"
      >
        <Column field="email" header="Email" sortable />
        <Column field="fullName" header="Name" sortable />
        <Column field="role" header="Role" body={(row: Profile) => <Tag value={USER_ROLE_LABEL[row.role]} severity={USER_ROLE_SEVERITY[row.role]} />} sortable />
        <Column field="createdAt" header="Registered" body={(row: Profile) => formatDateTime(row.createdAt)} sortable />
        <Column
          header=""
          style={{ width: '4rem' }}
          body={(row: Profile) => (
            <Button
              icon="pi pi-ellipsis-v"
              text
              rounded
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                openRowMenu(row, e);
              }}
            />
          )}
        />
      </DataTable>
    </div>
  );
}
