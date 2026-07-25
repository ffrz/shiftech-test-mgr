import { useMemo, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Tag } from 'primereact/tag';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { Menu } from 'primereact/menu';
import { IconField } from 'primereact/iconfield';
import { InputIcon } from 'primereact/inputicon';
import { InputText } from 'primereact/inputtext';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Toast } from 'primereact/toast';
import { userService } from '../../services/userService';
import { profileService } from '../../services/profileService';
import { useScreenSize } from '../../hooks/useScreenSize';
import type { User, UserRole } from '../../types/domain';
import { useAuthContext } from '../../hooks/useAuth';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../hooks/queryKeys';
import { formatDateTime } from '../../helpers/dateFormatter';
import { PageHeader } from '../../components/ui/PageHeader';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import { USER_ROLE_LABEL, USER_ROLE_SEVERITY } from '../../helpers/statusLabels';

const ROLE_OPTIONS: { label: string; value: UserRole | 'all' }[] = [
  { label: 'All Roles', value: 'all' },
  { label: 'Admin', value: 'admin' },
  { label: 'User', value: 'user' },
];

export function UserManagementPage() {
  const queryClient = useQueryClient();
  // Fetched together in one queryFn (rather than two useQuery calls chained via
  // `enabled`) — the users-then-profiles dependent-query approach raced on first
  // mount/page refresh: the profiles query's key depended on `users` still being
  // empty during the very first render, and didn't reliably re-fire once `users`
  // arrived, leaving name/username blank until something else (e.g. navigating away
  // and back) forced a remount.
  const { data, isLoading: loading } = useQuery({
    queryKey: queryKeys.users(),
    queryFn: async () => {
      const users = await userService.listAll();
      const profiles = await profileService.getByIds(users.map((u) => u.id));
      return { users, profiles };
    },
  });
  const { user: currentUser } = useAuthContext();

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');

  const profileById = useMemo(() => new Map((data?.profiles ?? []).map((p) => [p.id, p])), [data]);
  const displayNameFor = useCallback((row: User) => profileById.get(row.id)?.displayName ?? '—', [profileById]);
  const usernameFor = useCallback((row: User) => profileById.get(row.id)?.username ?? '—', [profileById]);

  const users = useMemo(() => {
    const allUsers = data?.users ?? [];
    let filtered = allUsers;
    if (roleFilter !== 'all') {
      filtered = filtered.filter((u) => u.role === roleFilter);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter((u) => {
        const p = profileById.get(u.id);
        return (
          u.email.toLowerCase().includes(q) ||
          p?.displayName?.toLowerCase().includes(q) ||
          p?.username?.toLowerCase().includes(q)
        );
      });
    }
    return filtered;
  }, [data, roleFilter, search, profileById]);
  const navigate = useNavigate();
  const { lt } = useScreenSize();
  const isMobile = lt.sm;
  const toast = useRef<Toast>(null);
  const menuRef = useRef<Menu>(null);
  const [menuRow, setMenuRow] = useState<User | null>(null);

  function reload() {
    return queryClient.invalidateQueries({ queryKey: queryKeys.users() });
  }

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
      message: `User "${displayNameFor(row)}" will be removed from the list. Continue?`,
      icon: 'pi pi-trash',
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        await userService.remove(row.id);
        toast.current?.show({ severity: 'success', summary: 'User deleted', detail: displayNameFor(row) });
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
      <span className="font-bold">{displayNameFor(row)}</span>
      <span className="text-sm text-color-secondary">@{usernameFor(row)}</span>
      <span className="text-sm text-color-secondary">{row.email}</span>
      <span className="text-sm text-color-secondary">
        <Tag value={USER_ROLE_LABEL[row.role]} severity={USER_ROLE_SEVERITY[row.role]} />
      </span>
      <span className="text-sm text-color-secondary">{formatDateTime(row.createdAt)}</span>
    </div>
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [data]);

  const isMenuRowSelf = menuRow?.id === currentUser?.id;

  const menuItems = menuRow
    ? [
      { label: 'View Details', icon: 'pi pi-eye', command: () => navigate(`/users/${menuRow.id}`) },
      // Never let an admin change their own role — no self-promote, no self-demote.
      // Prevents both accidental self-lockout and unreviewed self-escalation.
      ...(menuRow.role === 'user' && !isMenuRowSelf
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

      <Breadcrumb items={[{ label: 'Users' }]} />

      <PageHeader title="Users" />
      <div className="flex gap-2 mb-3">
        <IconField iconPosition="left" className="flex-1">
          <InputIcon className="pi pi-search" />
          <InputText
            className="w-full"
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </IconField>
        <Dropdown
          value={roleFilter}
          options={ROLE_OPTIONS}
          onChange={(e) => setRoleFilter(e.value)}
          className="w-14rem"
        />
      </div>
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
        {!isMobile && <Column header="Name" body={displayNameFor} />}
        {!isMobile && <Column header="Username" body={usernameFor} />}
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
