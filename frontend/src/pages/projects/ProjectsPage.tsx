import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataTable, type DataTablePageEvent, type DataTableSortEvent } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import SearchInput from '../../components/ui/SearchInput';
import { MultiSelect } from 'primereact/multiselect';
import { Tag } from 'primereact/tag';
import { Menu } from 'primereact/menu';
import { Checkbox } from 'primereact/checkbox';
import { Toast } from 'primereact/toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useScreenSize } from '../../hooks/useScreenSize';
import { useAuthContext } from '../../hooks/useAuth';
import { useStoredState } from '../../hooks/useStoredState';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import { projectService } from '../../services/projectService';
import { testPlanService } from '../../services/testPlanService';
import { testCaseService } from '../../services/testCaseService';
import { issueService } from '../../services/issueService';
import { projectDuplicateService } from '../../services/projectDuplicateService';
import { CreateProjectDialog } from './components/CreateProjectDialog';
import type { IssueWithDetails, Project, ProjectStatus, ProjectVisibility, TestCaseWithDetails, TestPlan } from '../../types/domain';
import type { ProjectOwnerFilter } from '../../repositories/projectRepository';
import { formatDate } from '../../helpers/dateFormatter';
import { PageHeader } from '../../components/ui/PageHeader';
import { PROJECT_STATUS_LABEL, PROJECT_STATUS_SEVERITY, PROJECT_VISIBILITY_LABEL, PROJECT_VISIBILITY_SEVERITY } from '../../helpers/statusLabels';

export function ProjectsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuthContext();
  const toast = useRef<Toast>(null);
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

  const [statusFilter, setStatusFilter] = useStoredState<ProjectStatus[]>('projectsPage:statusFilter', []);
  const [ownerFilter, setOwnerFilter] = useStoredState<ProjectOwnerFilter>('projectsPage:ownerFilter', 'all');
  const [visibilityFilter, setVisibilityFilter] = useStoredState<ProjectVisibility[]>('projectsPage:visibilityFilter', []);
  const [page, setPage] = useStoredState('projectsPage:page', 1);
  const [rowsPerPage, setRowsPerPage] = useStoredState('projectsPage:rowsPerPage', 10);
  const [sortField, setSortField] = useStoredState('projectsPage:sortField', 'name');
  const [sortOrder, setSortOrder] = useStoredState<-1 | 1>('projectsPage:sortOrder', 1);

  const hasActiveFilters = debouncedSearch !== '' || statusFilter.length > 0 || ownerFilter !== 'all' || visibilityFilter.length > 0;

  function resetFilters() {
    setSearch('');
    setDebouncedSearch('');
    setStatusFilter([]);
    setOwnerFilter('all');
    setVisibilityFilter([]);
    setPage(1);
  }

  const { data, isLoading: loading } = useQuery({
    queryKey: ['projects-paginated', debouncedSearch, statusFilter, ownerFilter, visibilityFilter, page, rowsPerPage, sortField, sortOrder],
    queryFn: () => projectService.listPaginated({
      search: debouncedSearch || undefined,
      statuses: statusFilter.length ? statusFilter : undefined,
      ownerFilter,
      currentUserId: currentUser?.id,
      visibilities: visibilityFilter.length ? visibilityFilter : undefined,
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
  const [duplicateSourceProject, setDuplicateSourceProject] = useState<Project | null>(null);
  const [duplicateName, setDuplicateName] = useState('');
  const [duplicateError, setDuplicateError] = useState<string | null>(null);
  const [duplicateLoading, setDuplicateLoading] = useState(false);
  const [sourceTestPlans, setSourceTestPlans] = useState<TestPlan[]>([]);
  const [sourceTestCases, setSourceTestCases] = useState<TestCaseWithDetails[]>([]);
  const [sourceIssues, setSourceIssues] = useState<IssueWithDetails[]>([]);
  const [selectedTestPlanIds, setSelectedTestPlanIds] = useState<Set<string>>(new Set());
  const [selectedTestCaseIds, setSelectedTestCaseIds] = useState<Set<string>>(new Set());
  const [selectedIssueIds, setSelectedIssueIds] = useState<Set<string>>(new Set());

  async function openDuplicateDialog(row: Project) {
    setDuplicateSourceProject(row);
    setDuplicateName(`${row.name} (Copy)`);
    setDuplicateError(null);
    const [plans, cases, issues] = await Promise.all([
      testPlanService.listByProject(row.id),
      testCaseService.listByProjectWithDetails(row.id),
      issueService.listByProject(row.id),
    ]);
    setSourceTestPlans(plans);
    setSourceTestCases(cases);
    setSourceIssues(issues);
    setSelectedTestPlanIds(new Set(plans.map((p) => p.id)));
    setSelectedTestCaseIds(new Set(cases.map((c) => c.id)));
    setSelectedIssueIds(new Set(issues.map((i) => i.id)));
  }

  function toggleSelection(set: Set<string>, setSet: (s: Set<string>) => void, id: string, checked: boolean) {
    const next = new Set(set);
    if (checked) next.add(id);
    else next.delete(id);
    setSet(next);
  }

  async function handleDuplicateProject() {
    if (!duplicateSourceProject) return;
    setDuplicateError(null);
    setDuplicateLoading(true);
    try {
      const created = await projectDuplicateService.duplicateProject(
        duplicateName,
        {
          testPlanIds: [...selectedTestPlanIds],
          testCaseIds: [...selectedTestCaseIds],
          issueIds: [...selectedIssueIds],
        },
        { testPlans: sourceTestPlans, testCases: sourceTestCases, issues: sourceIssues },
      );
      setDuplicateSourceProject(null);
      await reload();
      toast.current?.show({ severity: 'success', summary: 'Project duplicated' });
      navigate(`/projects/${created.id}`);
    } catch (err) {
      setDuplicateError(err instanceof Error ? err.message : 'Failed to duplicate project');
    } finally {
      setDuplicateLoading(false);
    }
  }

  async function handleChangeStatus(row: Project, status: ProjectStatus) {
    await projectService.changeStatus(row.id, status);
    await reload();
    toast.current?.show({ severity: 'success', summary: 'Status updated', detail: row.name });
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
    <div className="flex flex-column gap-2 py-1">
      <div className="flex align-items-center justify-content-between gap-2">
        <span className="font-bold text-base">{row.name}</span>
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
      </div>
      <div className="flex align-items-center gap-2 text-sm text-color-secondary">
        <Tag value={PROJECT_STATUS_LABEL[row.status]} severity={PROJECT_STATUS_SEVERITY[row.status]} />
        <Tag value={PROJECT_VISIBILITY_LABEL[row.visibility]} severity={PROJECT_VISIBILITY_SEVERITY[row.visibility]} />
      </div>
      {row.description && (
        <div className="text-sm text-color-secondary line-height-3">{row.description}</div>
      )}
      <div className="text-xs text-color-secondary">
        <i className="pi pi-calendar mr-1" />
        Created {formatDate(row.createdAt)}
      </div>
    </div>
  ), []);

  return (
    <div>
      <Toast ref={toast} position="top-center" />
      <Menu model={menuItems} popup ref={menuRef} appendTo={document.body} />

      <Breadcrumb items={[{ label: 'Projects' }]} />

      <PageHeader title="Projects" actions={<Button label="New Project" icon="pi pi-plus" size="small" onClick={openCreateDialog} />} />

      <div className="flex flex-wrap gap-2 mb-3">
        <div className="flex-1" style={{ minWidth: '12rem' }}>
          <SearchInput value={search} onChange={setSearch} placeholder="Search projects..." />
        </div>
        <Dropdown
          value={ownerFilter}
          options={[
            { label: 'All Projects', value: 'all' },
            { label: 'My Projects', value: 'mine' },
            { label: 'Shared with Me', value: 'shared' },
          ]}
          onChange={(e) => setOwnerFilter(e.value)}
          className="w-12rem"
        />
        <MultiSelect
          value={visibilityFilter}
          options={[
            { label: 'Private', value: 'private' },
            { label: 'Unlisted', value: 'unlisted' },
            { label: 'Public', value: 'public' },
          ]}
          onChange={(e) => setVisibilityFilter(e.value)}
          placeholder="All Visibility"
          className="w-14rem"
          selectAll
          selectAllLabel="All"
        />
        <MultiSelect
          value={statusFilter}
          options={[
            { label: 'Active', value: 'active' },
            { label: 'Inactive', value: 'inactive' },
            { label: 'Archived', value: 'archived' },
          ]}
          onChange={(e) => setStatusFilter(e.value)}
          placeholder="All Statuses"
          className="w-14rem"
          selectAll
          selectAllLabel="All"
        />
        <Button
          icon="pi pi-filter-slash"
          outlined
          severity="secondary"
          disabled={!hasActiveFilters}
          onClick={resetFilters}
          tooltip="Reset filters"
          tooltipOptions={{ position: 'bottom' }}
        />
      </div>

      <DataTable
        value={projects}
        loading={loading}
        lazy
        totalRecords={totalRecords}
        paginator
        paginatorTemplate="CurrentPageReport FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
        currentPageReportTemplate="{totalRecords} records"
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
          <Column
            field="visibility"
            header="Visibility"
            body={(row: Project) => <Tag value={PROJECT_VISIBILITY_LABEL[row.visibility]} severity={PROJECT_VISIBILITY_SEVERITY[row.visibility]} />}
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
        onSaved={() => { reload(); toast.current?.show({ severity: 'success', summary: editingProject ? 'Project updated' : 'Project created' }); }}
      />

      <Dialog
        header="Duplicate Project"
        visible={!!duplicateSourceProject}
        onHide={() => setDuplicateSourceProject(null)}
        style={{ width: '40rem' }}
      >
        <div className="flex flex-column gap-3">
          <div className="flex flex-column gap-1">
            <label htmlFor="duplicate-project-name" className={duplicateError ? 'p-error' : ''}>New Project Name</label>
            <InputText id="duplicate-project-name" value={duplicateName} onChange={(e) => setDuplicateName(e.target.value)} className={duplicateError ? 'p-invalid' : ''} autoFocus />
          </div>

          <div className="flex flex-column gap-1">
            <div className="flex align-items-center justify-content-between">
              <label className="font-medium">Test Plan ({selectedTestPlanIds.size}/{sourceTestPlans.length})</label>
              <div className="flex align-items-center gap-2">
                <Checkbox
                  checked={sourceTestPlans.length > 0 && selectedTestPlanIds.size === sourceTestPlans.length}
                  onChange={(e) => setSelectedTestPlanIds(e.checked ? new Set(sourceTestPlans.map((p) => p.id)) : new Set())}
                />
                <span className="text-sm text-color-secondary">Select All</span>
              </div>
            </div>
            <div className="flex flex-column gap-1 p-2 border-round" style={{ border: '1px solid var(--surface-border)', maxHeight: '10rem', overflowY: 'auto' }}>
              {sourceTestPlans.length === 0 && <span className="text-sm text-color-secondary">No test plans.</span>}
              {sourceTestPlans.map((p) => (
                <div key={p.id} className="flex align-items-center gap-2">
                  <Checkbox
                    inputId={`plan-${p.id}`}
                    checked={selectedTestPlanIds.has(p.id)}
                    onChange={(e) => toggleSelection(selectedTestPlanIds, setSelectedTestPlanIds, p.id, e.checked ?? false)}
                  />
                  <label htmlFor={`plan-${p.id}`} className="text-sm">{p.code} — {p.name}</label>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-column gap-1">
            <div className="flex align-items-center justify-content-between">
              <label className="font-medium">Test Case ({selectedTestCaseIds.size}/{sourceTestCases.length})</label>
              <div className="flex align-items-center gap-2">
                <Checkbox
                  checked={sourceTestCases.length > 0 && selectedTestCaseIds.size === sourceTestCases.length}
                  onChange={(e) => setSelectedTestCaseIds(e.checked ? new Set(sourceTestCases.map((c) => c.id)) : new Set())}
                />
                <span className="text-sm text-color-secondary">Select All</span>
              </div>
            </div>
            <div className="flex flex-column gap-1 p-2 border-round" style={{ border: '1px solid var(--surface-border)', maxHeight: '10rem', overflowY: 'auto' }}>
              {sourceTestCases.length === 0 && <span className="text-sm text-color-secondary">No test cases.</span>}
              {sourceTestCases.map((c) => (
                <div key={c.id} className="flex align-items-center gap-2">
                  <Checkbox
                    inputId={`case-${c.id}`}
                    checked={selectedTestCaseIds.has(c.id)}
                    onChange={(e) => toggleSelection(selectedTestCaseIds, setSelectedTestCaseIds, c.id, e.checked ?? false)}
                  />
                  <label htmlFor={`case-${c.id}`} className="text-sm">{c.code} — {c.title}</label>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-column gap-1">
            <div className="flex align-items-center justify-content-between">
              <label className="font-medium">Issue ({selectedIssueIds.size}/{sourceIssues.length})</label>
              <div className="flex align-items-center gap-2">
                <Checkbox
                  checked={sourceIssues.length > 0 && selectedIssueIds.size === sourceIssues.length}
                  onChange={(e) => setSelectedIssueIds(e.checked ? new Set(sourceIssues.map((i) => i.id)) : new Set())}
                />
                <span className="text-sm text-color-secondary">Select All</span>
              </div>
            </div>
            <div className="flex flex-column gap-1 p-2 border-round" style={{ border: '1px solid var(--surface-border)', maxHeight: '10rem', overflowY: 'auto' }}>
              {sourceIssues.length === 0 && <span className="text-sm text-color-secondary">No issues.</span>}
              {sourceIssues.map((i) => (
                <div key={i.id} className="flex align-items-center gap-2">
                  <Checkbox
                    inputId={`issue-${i.id}`}
                    checked={selectedIssueIds.has(i.id)}
                    onChange={(e) => toggleSelection(selectedIssueIds, setSelectedIssueIds, i.id, e.checked ?? false)}
                  />
                  <label htmlFor={`issue-${i.id}`} className="text-sm">{i.code} — {i.title}</label>
                </div>
              ))}
            </div>
          </div>

          {duplicateError && <small className="p-error">{duplicateError}</small>}
          <Button label="Duplicate Project" size="small" loading={duplicateLoading} onClick={handleDuplicateProject} />
        </div>
      </Dialog>
    </div>
  );
}
