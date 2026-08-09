import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataTable, type DataTablePageEvent } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Tag } from 'primereact/tag';
import { Button } from 'primereact/button';
import { MultiSelect } from 'primereact/multiselect';
import { Menu } from 'primereact/menu';

import SearchInput from '../../components/ui/SearchInput';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { userService } from '../../services/userService';
import { useScreenSize } from '../../hooks/useScreenSize';
import { useStoredState } from '../../hooks/useStoredState';
import type { User, UserRole } from '../../types/domain';
import { useAuthContext } from '../../hooks/useAuth';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { formatDateTime } from '../../helpers/dateFormatter';
import { PageHeader } from '../../components/ui/PageHeader';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import { dataTablePaginatorProps } from '../../components/ui/dataTablePaginator';
import { ColumnHeaderMenu } from '../../components/ui/ColumnHeaderMenu';
import { USER_ROLE_LABEL, USER_ROLE_SEVERITY } from '../../helpers/statusLabels';
import { toastHelper } from '../../helpers/toast';

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
  const menuRef = useRef<Menu>(null);
  const [menuRow, setMenuRow] = useState<EnrichedUser | null>(null);

  const [search, setSearch] = useStoredState('usersPage:search', '');
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(debounceRef.current);
  }, [search]);

  const [roleFilter, setRoleFilter] = useStoredState<UserRole[]>('usersPage:roleFilter', []);
  const [page, setPage] = useStoredState('usersPage:page', 1);
  const [rowsPerPage, setRowsPerPage] = useStoredState('usersPage:rowsPerPage', 10);
  const [sortField, setSortField] = useStoredState('usersPage:sortField', 'createdAt');
  const [sortOrder, setSortOrder] = useStoredState<-1 | 1>('usersPage:sortOrder', -1);

  const hasActiveFilters = debouncedSearch !== '' || roleFilter.length > 0;

  function resetFilters() {
    setSearch('');
    setDebouncedSearch('');
    setRoleFilter([]);
    setPage(1);
  }

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

  function handleColumnSort(field: string, order: 1 | -1) {
    setSortField(field);
    setSortOrder(order);
  }

  function handleRoleFilterChange(roles: UserRole[]) {
    setRoleFilter(roles);
    setPage(1);
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
        toastHelper.success('User deleted', row._displayName);
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
        ? [{ label: 'Make Admin', icon: 'pi pi-shield', command: () => handlePromote(menuRow) }]
        : []),
      ...(menuRow.role === 'admin' && !isMenuRowSelf
        ? [{ label: 'Demote to User', icon: 'pi pi-user', command: () => handleDemote(menuRow) }]
        : []),
      ...(!isMenuRowSelf
        ? [{ label: 'Delete', icon: 'pi pi-trash', command: () => handleDelete(menuRow) }]
        : []),
    ]
    : [];

  return (
    <div>
      <ConfirmDialog />
      <Menu model={menuItems} popup ref={menuRef} appendTo={document.body} />

      <Breadcrumb items={[{ label: 'Users' }]} />

      <PageHeader
        title="Users"
        actions={null}
      />
      <div className="grid mb-3 p-1">
          <div className="col-12 md:col-2 p-1">
            <MultiSelect
              value={roleFilter}
              options={ROLE_OPTIONS}
              onChange={(e) => setRoleFilter(e.value)}
              placeholder="All Roles"
              className="w-full"
              selectAll
              selectAllLabel="All"
            />
          </div>
          <div className="col-12 md:col p-1">
            <div className="flex gap-2">
              <SearchInput
                value={search}
                onChange={(v) => { setSearch(v); if (!v) setDebouncedSearch(''); }}
                placeholder="Search users..."
                className="flex-1"
              />
              <Button
                icon="pi pi-refresh"
                outlined
                severity="secondary"
                disabled={!hasActiveFilters}
                onClick={resetFilters}
                tooltip="Reset filters"
                tooltipOptions={{ position: 'bottom' }}
              />
            </div>
          </div>
        </div>
      <DataTable
        value={users}
        loading={loading}
        lazy
        totalRecords={totalRecords}
        {...dataTablePaginatorProps}
        rows={rowsPerPage}
        rowsPerPageOptions={[5, 10, 25, 50]}
        first={(page - 1) * rowsPerPage}
        sortField={sortField}
        sortOrder={sortOrder}
        onPage={onPage}
        emptyMessage="No users yet"
        size="small"
        onRowClick={(e) => navigate(`/users/${(e.data as EnrichedUser).id}`)}
        rowHover
        showGridlines
        className="cursor-pointer"
      >
        {isMobile && <Column header="User" body={(row: EnrichedUser) => (
          <div className="flex flex-column gap-2 py-1">
            <span className="font-bold">{row._displayName}</span>
            <span className="text-sm username-text">{row._username}</span>
            <span className="text-sm text-color-secondary">{row.email}</span>
            <span className="text-sm text-color-secondary">
              <Tag value={USER_ROLE_LABEL[row.role]} severity={USER_ROLE_SEVERITY[row.role]} />
            </span>
            <span className="text-sm text-color-secondary">{formatDateTime(row.createdAt)}</span>
          </div>
        )} />}
        {!isMobile && (
          <Column
            field="_displayName"
            header={<ColumnHeaderMenu label="Name" field="_displayName" sortField={sortField} sortOrder={sortOrder} onSort={handleColumnSort} />}
          />
        )}
        {!isMobile && (
          <Column
            field="_username"
            header={<ColumnHeaderMenu label="Username" field="_username" sortField={sortField} sortOrder={sortOrder} onSort={handleColumnSort} />}
          />
        )}
        {!isMobile && (
          <Column
            field="email"
            className="dt-title-fill"
            headerClassName="dt-title-fill"
            header={<ColumnHeaderMenu label="Email" field="email" sortField={sortField} sortOrder={sortOrder} onSort={handleColumnSort} />}
          />
        )}
        {!isMobile && (
          <Column
            field="role"
            header={
              <ColumnHeaderMenu
                label="Role"
                field="role"
                sortField={sortField}
                sortOrder={sortOrder}
                onSort={handleColumnSort}
                isFilterActive={roleFilter.length > 0}
                filterContent={
                  <MultiSelect
                    value={roleFilter}
                    options={ROLE_OPTIONS}
                    onChange={(e) => handleRoleFilterChange(e.value)}
                    placeholder="All Roles"
                    className="w-full"
                    selectAll
                    selectAllLabel="All"
                  />
                }
              />
            }
            body={(row: EnrichedUser) => <Tag value={USER_ROLE_LABEL[row.role]} severity={USER_ROLE_SEVERITY[row.role]} />}
          />
        )}
        {!isMobile && (
          <Column
            field="createdAt"
            header={<ColumnHeaderMenu label="Registered" field="createdAt" sortField={sortField} sortOrder={sortOrder} onSort={handleColumnSort} />}
            body={(row: EnrichedUser) => formatDateTime(row.createdAt)}
          />
        )}
        <Column
          header=""
          style={{ width: '4rem' }}
          body={(row: EnrichedUser) => (
            <div className="text-right">
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
