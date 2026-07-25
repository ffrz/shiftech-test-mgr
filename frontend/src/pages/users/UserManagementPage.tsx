import { useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Tag } from 'primereact/tag';
import { Button } from 'primereact/button';
import { Menu } from 'primereact/menu';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Toast } from 'primereact/toast';
import { useUsers } from '../../hooks/useUsers';
import { userService } from '../../services/userService';
import { useScreenSize } from '../../hooks/useScreenSize';
import type { User } from '../../types/domain';
import { useAuthContext } from '../../hooks/useAuth';
import { formatDateTime } from '../../helpers/dateFormatter';
import { PageHeader } from '../../components/ui/PageHeader';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import { USER_ROLE_LABEL, USER_ROLE_SEVERITY } from '../../helpers/statusLabels';

export function UserManagementPage() {
  const { users, loading, reload } = useUsers();
  const { user: currentUser } = useAuthContext();
  const navigate = useNavigate();
  const { lt } = useScreenSize();
  const isMobile = lt.sm;
  const toast = useRef<Toast>(null);
  const menuRef = useRef<Menu>(null);
  const [menuRow, setMenuRow] = useState<User | null>(null);

  async function handlePromote(row: User) {
    await userService.promoteToAdmin(row.id);
    await reload();
  }

  async function handleDemote(row: User) {
    await userService.demoteToUser(row.id);
    await reload();
  }

  function handleDelete(row: User) {
    confirmDialog({
      header: 'Delete User',
      message: `User "${row.email}" will be removed from the list. Continue?`,
      icon: 'pi pi-trash',
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        await userService.remove(row.id);
        toast.current?.show({ severity: 'success', summary: 'User deleted', detail: row.email });
        await reload();
      },
    });
  }

  function openRowMenu(row: User, event: React.MouseEvent) {
    setMenuRow(row);
    menuRef.current?.toggle(event);
  }

  const mobileBodyTemplate = useCallback((row: User) => (
    <div className="flex flex-column gap-2 py-1">
      <span className="font-bold">{row.email}</span>
      <span className="text-sm text-color-secondary">
        <Tag value={USER_ROLE_LABEL[row.role]} severity={USER_ROLE_SEVERITY[row.role]} />
      </span>
      <span className="text-sm text-color-secondary">{formatDateTime(row.createdAt)}</span>
    </div>
  ), []);

  const isMenuRowSelf = menuRow?.id === currentUser?.id;

  const menuItems = menuRow
    ? [
      { label: 'View Details', icon: 'pi pi-eye', command: () => navigate(`/users/${menuRow.id}`) },
      ...(menuRow.role === 'user'
        ? [{ separator: true }, { label: 'Make Admin', icon: 'pi pi-shield', command: () => handlePromote(menuRow) }]
        : []),
      ...(menuRow.role === 'admin' && !isMenuRowSelf
        ? [{ separator: true }, { label: 'Demote to User', icon: 'pi pi-user', command: () => handleDemote(menuRow) }]
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
      <Menu model={menuItems} popup ref={menuRef} appendTo={document.body} />

      <Breadcrumb items={[{ label: 'User Management' }]} />

      <PageHeader title="User Management" />
      <DataTable
        value={users}
        loading={loading}
        paginator
        rows={10} rowsPerPageOptions={[5, 10, 25, 50]}
        emptyMessage="No users yet"
        size="small"
        onRowClick={(e) => navigate(`/users/${(e.data as User).id}`)}
        rowHover
        className="cursor-pointer"
      >
        {isMobile && <Column body={mobileBodyTemplate} />}
        {!isMobile && <Column field="email" header="Email" sortable />}
        {!isMobile && <Column field="role" header="Role" body={(row: User) => <Tag value={USER_ROLE_LABEL[row.role]} severity={USER_ROLE_SEVERITY[row.role]} />} sortable />}
        {!isMobile && <Column field="createdAt" header="Registered" body={(row: User) => formatDateTime(row.createdAt)} sortable />}
        <Column
          header=""
          style={{ width: '4rem' }}
          body={(row: User) => (
            <div className="flex align-items-start">
              <Button
                icon="pi pi-ellipsis-v"
                text
                rounded
                plain
                size="small"
                className="text-color-secondary"
                onClick={(e) => {
                  e.stopPropagation();
                  openRowMenu(row, e);
                }}
              />
            </div>
          )}
        />
      </DataTable>
    </div>
  );
}
