import { useRef, useState, useCallback } from 'react';
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
import { useScreenSize } from '../../hooks/useScreenSize';
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
  const { lt } = useScreenSize();
  const isMobile = lt.sm;
  const toast = useRef<Toast>(null);
  const menuRef = useRef<Menu>(null);
  const [menuRow, setMenuRow] = useState<Profile | null>(null);

  async function handleApprove(row: Profile) {
    await profileService.approve(row.id);
    toast.current?.show({ severity: 'success', summary: 'User disetujui', detail: row.email });
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
      header: 'Cabut Akses',
      message: `Akses "${row.email}" akan dicabut dan kembali berstatus pending sampai disetujui ulang. Lanjutkan?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Cabut Akses',
      rejectLabel: 'Batal',
      acceptClassName: 'p-button-warning',
      accept: async () => {
        await profileService.revokeAccess(row.id);
        toast.current?.show({ severity: 'warn', summary: 'Akses dicabut', detail: row.email });
        await reload();
      },
    });
  }

  function handleDelete(row: Profile) {
    confirmDialog({
      header: 'Hapus User',
      message: `User "${row.email}" akan dihapus dari daftar. Lanjutkan?`,
      icon: 'pi pi-trash',
      acceptLabel: 'Hapus',
      rejectLabel: 'Batal',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        await profileService.remove(row.id);
        toast.current?.show({ severity: 'success', summary: 'User dihapus', detail: row.email });
        await reload();
      },
    });
  }

  function openRowMenu(row: Profile, event: React.MouseEvent) {
    setMenuRow(row);
    menuRef.current?.toggle(event);
  }

  const mobileBodyTemplate = useCallback((row: Profile) => (
    <div className="flex flex-column gap-2 py-1">
      <span className="font-bold">{row.fullName}</span>
      <span className="text-sm text-color-secondary">{row.email}</span>
      <span className="text-sm text-color-secondary">
        <Tag value={USER_ROLE_LABEL[row.role]} severity={USER_ROLE_SEVERITY[row.role]} />
      </span>
      <span className="text-sm text-color-secondary">{formatDateTime(row.createdAt)}</span>
    </div>
  ), []);

  const isMenuRowSelf = menuRow?.id === currentProfile?.id;

  const menuItems = menuRow
    ? [
      { label: 'Lihat Detail', icon: 'pi pi-eye', command: () => navigate(`/users/${menuRow.id}`) },
      ...(menuRow.role === 'pending'
        ? [{ separator: true }, { label: 'Approve', icon: 'pi pi-check', command: () => handleApprove(menuRow) }]
        : []),
      ...(menuRow.role === 'user'
        ? [{ separator: true }, { label: 'Jadikan Admin', icon: 'pi pi-shield', command: () => handlePromote(menuRow) }]
        : []),
      ...(menuRow.role === 'admin' && !isMenuRowSelf
        ? [{ separator: true }, { label: 'Turunkan ke User', icon: 'pi pi-user', command: () => handleDemote(menuRow) }]
        : []),
      ...(menuRow.role !== 'pending' && !isMenuRowSelf
        ? [{ label: 'Cabut Akses', icon: 'pi pi-lock', command: () => handleRevokeAccess(menuRow) }]
        : []),
      ...(!isMenuRowSelf
        ? [{ separator: true }, { label: 'Hapus', icon: 'pi pi-trash', command: () => handleDelete(menuRow) }]
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
        value={profiles}
        loading={loading}
        paginator
        rows={10} rowsPerPageOptions={[5, 10, 25, 50]}
        emptyMessage="Belum ada user"
        size="small"
        onRowClick={(e) => navigate(`/users/${(e.data as Profile).id}`)}
        rowHover
        className="cursor-pointer"
      >
        {isMobile && <Column body={mobileBodyTemplate} />}
        {!isMobile && <Column field="email" header="Email" sortable />}
        {!isMobile && <Column field="fullName" header="Nama" sortable />}
        {!isMobile && <Column field="role" header="Role" body={(row: Profile) => <Tag value={USER_ROLE_LABEL[row.role]} severity={USER_ROLE_SEVERITY[row.role]} />} sortable />}
        {!isMobile && <Column field="createdAt" header="Terdaftar" body={(row: Profile) => formatDateTime(row.createdAt)} sortable />}
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
