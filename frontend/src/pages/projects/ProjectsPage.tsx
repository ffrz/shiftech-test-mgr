import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DataTable, type DataTablePageEvent, type DataTableSortEvent } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import SearchInput from '../../components/ui/SearchInput';
import { MultiSelect } from 'primereact/multiselect';
import { Tag } from 'primereact/tag';
import { Menu } from 'primereact/menu';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useScreenSize } from '../../hooks/useScreenSize';
import { useAuthContext } from '../../hooks/useAuth';
import { useStoredState } from '../../hooks/useStoredState';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import { projectService } from '../../services/projectService';
import { CreateProjectDialog } from './components/CreateProjectDialog';
import { DuplicateProjectDialog } from './components/dialogs/DuplicateProjectDialog';
import type { Project, ProjectStatus } from '../../types/domain';
import type { ProjectOwnerFilter } from '../../repositories/projectRepository';
import { formatDate } from '../../helpers/dateFormatter';
import { PageHeader } from '../../components/ui/PageHeader';
import { dataTablePaginatorProps } from '../../components/ui/dataTablePaginator';
import { PROJECT_STATUS_LABEL, PROJECT_STATUS_SEVERITY } from '../../helpers/statusLabels';
import { toastHelper } from '../../helpers/toast';

export function ProjectsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuthContext();
  const { lt } = useScreenSize();
  const isMobile = lt.sm;
  const menuRef = useRef<Menu>(null);

  const [search, setSearch] = useStoredState('projectsPage:search', '');
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(debounceRef.current);
  }, [search]);

  useEffect(() => {
    if (searchParams.get('create') === 'true') {
      searchParams.delete('create');
      openCreateDialog();
    }
  }, []);

  const [statusFilter, setStatusFilter] = useStoredState<ProjectStatus[]>('projectsPage:statusFilter', []);
  const [ownerFilter, setOwnerFilter] = useStoredState<ProjectOwnerFilter>('projectsPage:ownerFilter', 'all');
  const [page, setPage] = useStoredState('projectsPage:page', 1);
  const [rowsPerPage, setRowsPerPage] = useStoredState('projectsPage:rowsPerPage', 10);
  const [sortField, setSortField] = useStoredState('projectsPage:sortField', 'name');
  const [sortOrder, setSortOrder] = useStoredState<-1 | 1>('projectsPage:sortOrder', 1);

  const hasActiveFilters = debouncedSearch !== '' || statusFilter.length > 0 || ownerFilter !== 'all';

  function resetFilters() {
    setSearch('');
    setDebouncedSearch('');
    setStatusFilter([]);
    setOwnerFilter('all');
    setPage(1);
  }

  const { data, isLoading: loading } = useQuery({
    queryKey: ['projects-paginated', debouncedSearch, statusFilter, ownerFilter, page, rowsPerPage, sortField, sortOrder],
    queryFn: () => projectService.listPaginated({
      search: debouncedSearch || undefined,
      statuses: statusFilter.length ? statusFilter : undefined,
      ownerFilter,
      currentUserId: currentUser?.id,
      page,
      pageSize: rowsPerPage,
      sortField,
      sortOrder: sortOrder === 1 ? 'asc' : 'desc',
    }),
  });

  const projects = data?.data ?? [];
  const totalRecords = data?.total ?? 0;

  function reload() {
    return queryClient.invalidateQueries({ queryKey: ['projects-paginated'] });
  }

  function onPage(e: DataTablePageEvent) {
    setPage((e.page ?? 0) + 1);
    if (e.rows) setRowsPerPage(e.rows);
  }

  function onSort(e: DataTableSortEvent) {
    setSortField(e.sortField ?? 'name');
    setSortOrder(e.sortOrder as -1 | 1);
  }

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  function openCreateDialog() {
    setEditingProject(null);
    setDialogOpen(true);
  }

  function openEditDialog(row: Project) {
    setEditingProject(row);
    setDialogOpen(true);
  }

  // --- Duplicate Project ---
  const [duplicateSource, setDuplicateSource] = useState<Project | null>(null);

  function openDuplicateDialog(row: Project) {
    setDuplicateSource(row);
  }

  async function handleChangeStatus(row: Project, status: ProjectStatus) {
    await projectService.changeStatus(row.id, status, currentUser ? { actorId: currentUser.id } : undefined);
    await reload();
    toastHelper.success('Status updated', row.name);
  }

  function openRowMenu(row: Project, event: React.MouseEvent) {
    setMenuRow(row);
    menuRef.current?.toggle(event);
  }

  const [menuRow, setMenuRow] = useState<Project | null>(null);

  const menuItems = menuRow
    ? [
      { label: 'View Details', icon: 'pi pi-eye', command: () => navigate(`/projects/${menuRow.id}`) },
      { label: 'Edit', icon: 'pi pi-pencil', command: () => openEditDialog(menuRow) },
      { label: 'Duplicate', icon: 'pi pi-copy', command: () => openDuplicateDialog(menuRow) },
      { separator: true },
      ...(menuRow.status !== 'active'
        ? [{ label: 'Set Active', icon: 'pi pi-play', command: () => handleChangeStatus(menuRow, 'active') }]
        : []),
      ...(menuRow.status !== 'inactive'
        ? [{ label: 'Set Inactive', icon: 'pi pi-pause', command: () => handleChangeStatus(menuRow, 'inactive') }]
        : []),
      ...(menuRow.status !== 'archived'
        ? [{ label: 'Archive', icon: 'pi pi-inbox', command: () => handleChangeStatus(menuRow, 'archived') }]
        : []),
    ]
    : [];

  const mobileBody = useCallback((row: Project) => (
    <div className="flex flex-column gap-1 py-1">
      <div className="flex align-items-center justify-content-between gap-2">
        <span className="font-bold">{row.name}</span>
        <div className="flex align-items-center gap-2">
          <Tag value={PROJECT_STATUS_LABEL[row.status]} severity={PROJECT_STATUS_SEVERITY[row.status]} style={{ width: 'fit-content' }} />
          <Button
            icon="pi pi-ellipsis-v"
            text
            rounded
            plain
            size="small"
            className="text-color-secondary"
            onClick={(e) => { e.stopPropagation(); openRowMenu(row, e); }}
          />
        </div>
      </div>
      {row.description && <span className="text-sm text-color-secondary">{row.description}</span>}
      <div className="flex align-items-center gap-3 text-xs text-color-secondary">
        <span><i className="pi pi-calendar mr-1" style={{ fontSize: '0.7rem' }} />{formatDate(row.createdAt)}</span>
      </div>
    </div>
  ), []);

  return (
    <div>
      <Menu model={menuItems} popup ref={menuRef} appendTo={document.body} />

      <Breadcrumb items={[{ label: 'Projects' }]} />

      <PageHeader
        title="Projects"
        actions={
          <div className="flex gap-3 align-items-center">
            <Button label="New Project" icon="pi pi-plus" size="small" onClick={openCreateDialog} />
          </div>
        }
      />

      <div className="grid mb-3 p-1">
          <div className="col-12 md:col-2 p-1">
            <Dropdown
              value={ownerFilter}
              options={[
                { label: 'All Projects', value: 'all' },
                { label: 'My Projects', value: 'mine' },
                { label: 'Shared with Me', value: 'shared' },
              ]}
              onChange={(e) => setOwnerFilter(e.value)}
              className="w-full"
            />
          </div>
          <div className="col-12 md:col-2 p-1">
            <MultiSelect
              value={statusFilter}
              options={[
                { label: 'Active', value: 'active' },
                { label: 'Inactive', value: 'inactive' },
                { label: 'Archived', value: 'archived' },
              ]}
              onChange={(e) => setStatusFilter(e.value)}
              placeholder="All Statuses"
              className="w-full"
              selectAll
              selectAllLabel="All"
            />
          </div>
          <div className="col-12 md:col p-1">
            <div className="flex gap-2">
              <SearchInput value={search} onChange={setSearch} placeholder="Search projects..." className="flex-1" />
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
        value={projects}
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
        onSort={onSort}
        size="small"
        emptyMessage="No projects yet"
        onRowClick={(e) => navigate(`/projects/${(e.data as Project).id}`)}
        rowHover
        className="cursor-pointer"
      >
        {isMobile && <Column field="name" header="Project" body={mobileBody} />}
        {!isMobile && <Column field="name" header="Name" sortable />}
        {!isMobile && <Column field="description" header="Description" />}
        {!isMobile && (
          <Column
            field="status"
            header="Status"
            body={(row: Project) => <Tag value={PROJECT_STATUS_LABEL[row.status]} severity={PROJECT_STATUS_SEVERITY[row.status]} />}
          />
        )}
        {!isMobile && (
          <Column field="createdAt" header="Created" body={(row: Project) => formatDate(row.createdAt)} sortable />
        )}
        {!isMobile && (
          <Column
            header=""
            style={{ width: '4rem' }}
            body={(row: Project) => (
              <div className="text-right">
                <Button
                  icon="pi pi-ellipsis-v"
                  text
                  rounded
                  plain
                  size="small"
                  className="text-color-secondary"
                  onClick={(e) => { e.stopPropagation(); openRowMenu(row, e); }}
                />
              </div>
            )}
          />
        )}
      </DataTable>

      <CreateProjectDialog
        visible={dialogOpen}
        editingProject={editingProject}
        onHide={() => setDialogOpen(false)}
        onSaved={() => { reload(); toastHelper.success(editingProject ? 'Project updated' : 'Project created'); }}
      />

      <DuplicateProjectDialog
        source={duplicateSource}
        onHide={() => setDuplicateSource(null)}
        onDuplicated={(newProjectId) => {
          setDuplicateSource(null);
          reload();
          toastHelper.success('Project duplicated');
          navigate(`/projects/${newProjectId}`);
        }}
      />
    </div>
  );
}
