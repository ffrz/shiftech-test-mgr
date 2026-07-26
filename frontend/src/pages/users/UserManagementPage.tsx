import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataTable, type DataTablePageEvent, type DataTableSortEvent } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Tag } from 'primereact/tag';
import { Button } from 'primereact/button';
import { MultiSelect } from 'primereact/multiselect';
import { Menu } from 'primereact/menu';
import { IconField } from 'primereact/iconfield';
import { InputIcon } from 'primereact/inputicon';
import { InputText } from 'primereact/inputtext';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Toast } from 'primereact/toast';
import { userService } from '../../services/userService';
import { useScreenSize } from '../../hooks/useScreenSize';
import type { User, UserRole } from '../../types/domain';
import { useAuthContext } from '../../hooks/useAuth';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { formatDateTime } from '../../helpers/dateFormatter';
import { PageHeader } from '../../components/ui/PageHeader';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import { USER_ROLE_LABEL, USER_ROLE_SEVERITY } from '../../helpers/statusLabels';

type EnrichedUser = User & { _displayName: string; _username: string };

const ROLE_OPTIONS: { label: string; value: UserRole }[] = [
  { label: 'Admin', value: 'admin' },
  { label: 'User', value: 'user' },
];

export function UserManagementPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user: currentUser } = useAuthContext();
  const { lt } = useScreenSize();
  const isMobile = lt.sm;
  const toast = useRef<Toast>(null);
  const menuRef = useRef<Menu>(null);
  const [menuRow, setMenuRow] = useState<EnrichedUser | null>(null);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(debounceRef.current);
  }, [search]);

  const [roleFilter, setRoleFilter] = useState<UserRole[]>([]);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortField, setSortField] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<-1 | 1>(-1);

  const { data, isLoading: loading } = useQuery({
    queryKey: ['users-paginated', debouncedSearch, roleFilter, page, rowsPerPage, sortField, sortOrder],
    queryFn: async () => userService.listPaginated({
      search: debouncedSearch || undefined,
      roles: roleFilter.length ? roleFilter : undefined,
      page,
      pageSize: rowsPerPage,
      sortField,
      sortOrder: sortOrder === 1 ? 'asc' : 'desc',
    }),
  });

  const users = data?.data ?? [];
  const totalRecords = data?.total ?? 0;

  function reload() {
    return queryClient.invalidateQueries({ queryKey: ['users-paginated'] });
  }

  function onPage(e: DataTablePageEvent) {
    setPage((e.page ?? 0) + 1);
    if (e.rows) setRowsPerPage(e.rows);
  }

  function onSort(e: DataTableSortEvent) {
    setSortField(e.sortField ?? 'createdAt');
    setSortOrder(e.sortOrder as -1 | 1);
  }

  async function handlePromote(row: EnrichedUser) {
    await userService.promoteToAdmin(row.id);
    await reload();
  }

  async function handleDemote(row: EnrichedUser) {
    await userService.demoteToUser(row.id);
    await reload();
  }

  function handleDelete(row: EnrichedUser) {
    confirmDialog({
      header: 'Delete User',
      message: `User "${row._displayName}" will be removed from the list. Continue?`,
      icon: 'pi pi-trash',
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        await userService.remove(row.id);
        toast.current?.show({ severity: 'success', summary: 'User deleted', detail: row._displayName });
        await reload();
      },
    });
  }

  function openRowMenu(row: EnrichedUser, event: React.MouseEvent) {
    setMenuRow(row);
    menuRef.current?.toggle(event);
  }

  const isMenuRowSelf = menuRow?.id === currentUser?.id;

  const menuItems = menuRow
    ? [
      { label: 'View Details', icon: 'pi pi-eye', command: () => navigate(`/users/${menuRow.id}`) },
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
        <MultiSelect
          value={roleFilter}
          options={ROLE_OPTIONS}
          onChange={(e) => setRoleFilter(e.value)}
          placeholder="All Roles"
          className="w-14rem"
        />
      </div>
      <DataTable
        value={users}
        loading={loading}
        lazy
        totalRecords={totalRecords}
        paginator
        rows={rowsPerPage}
        rowsPerPageOptions={[5, 10, 25, 50]}
        first={(page - 1) * rowsPerPage}
        sortField={sortField}
        sortOrder={sortOrder}
        onPage={onPage}
        onSort={onSort}
        emptyMessage="No users yet"
        size="small"
        onRowClick={(e) => navigate(`/users/${(e.data as EnrichedUser).id}`)}
        rowHover
        className="cursor-pointer"
      >
        {isMobile && <Column body={(row: EnrichedUser) => (
          <div className="flex flex-column gap-2 py-1">
            <span className="font-bold">{row._displayName}</span>
            <span className="text-sm text-color-secondary">@{row._username}</span>
            <span className="text-sm text-color-secondary">{row.email}</span>
            <span className="text-sm text-color-secondary">
              <Tag value={USER_ROLE_LABEL[row.role]} severity={USER_ROLE_SEVERITY[row.role]} />
            </span>
            <span className="text-sm text-color-secondary">{formatDateTime(row.createdAt)}</span>
          </div>
        )} />}
        {!isMobile && <Column field="_displayName" header="Name" sortable />}
        {!isMobile && <Column field="_username" header="Username" sortable />}
        {!isMobile && <Column field="email" header="Email" sortable />}
        {!isMobile && <Column field="role" header="Role" body={(row: EnrichedUser) => <Tag value={USER_ROLE_LABEL[row.role]} severity={USER_ROLE_SEVERITY[row.role]} />} sortable />}
        {!isMobile && <Column field="createdAt" header="Registered" body={(row: EnrichedUser) => formatDateTime(row.createdAt)} sortable />}
        <Column
          header=""
          style={{ width: '4rem' }}
          body={(row: EnrichedUser) => (
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
