import { useRef, useState, useCallback, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { DataTable, type DataTablePageEvent, type DataTableSortEvent } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { SelectButton } from 'primereact/selectbutton';
import { MultiSelect } from 'primereact/multiselect';
import { Tag } from 'primereact/tag';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { useAuthContext } from '../../hooks/useAuth';
import { testSuiteService } from '../../services/testSuiteService';
import { useScreenSize } from '../../hooks/useScreenSize';
import { useStoredState } from '../../hooks/useStoredState';
import SearchInput from '../../components/ui/SearchInput';
import { TestSuiteDialog } from '../../components/dialogs/TestSuiteDialog';
import type { TestSuite, TestSuiteVisibility } from '../../types/domain';
import { PageHeader } from '../../components/ui/PageHeader';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import { RowActionsMenu } from '../../components/ui/RowActionsMenu';
import { dataTablePaginatorProps } from '../../components/ui/dataTablePaginator';
import { UserHoverCard } from '../../components/ui/UserHoverCard';
import { formatDateTime } from '../../helpers/dateFormatter';
import { TEST_SUITE_VISIBILITY_LABEL, TEST_SUITE_VISIBILITY_SEVERITY } from '../../helpers/statusLabels';
import { toastHelper } from '../../helpers/toast';

type OwnershipFilter = 'mine' | 'all';

type EnrichedTestSuite = TestSuite & {
  _authorUsername: string;
  _authorDisplayName: string;
};

// User-owned reusable test case library — any user can create their own Test Suite
// Template, keep it private, or publish it (unlisted/public) for others to browse and
// clone from into their own project. Ownership/visibility enforced by RLS; the UI's
// isOwnerOrAdmin check only decides what actions are offered, not what's actually allowed.
export function TestSuitesPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuthContext();
  const queryClient = useQueryClient();
  const { lt } = useScreenSize();
  const isMobile = lt.sm;

  const [ownershipFilter, setOwnershipFilter] = useStoredState<OwnershipFilter>('testSuitesPage:ownership', 'mine');
  const [search, setSearch] = useStoredState('testSuitesPage:search', '');
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

  const [visibilityFilter, setVisibilityFilter] = useStoredState<TestSuiteVisibility[]>('testSuitesPage:visibilityFilter', []);
  const [page, setPage] = useStoredState('testSuitesPage:page', 1);
  const [rowsPerPage, setRowsPerPage] = useStoredState('testSuitesPage:rowsPerPage', 10);
  const [sortField, setSortField] = useStoredState('testSuitesPage:sortField', 'name');
  const [sortOrder, setSortOrder] = useStoredState<-1 | 1>('testSuitesPage:sortOrder', 1);

  const hasActiveFilters = debouncedSearch !== '' || (ownershipFilter === 'mine' && visibilityFilter.length > 0);

  function resetFilters() {
    setSearch('');
    setDebouncedSearch('');
    setVisibilityFilter([]);
    setPage(1);
  }

  const { data, isLoading: loading } = useQuery({
    queryKey: ['testSuites-paginated', debouncedSearch, ownershipFilter, visibilityFilter, page, rowsPerPage, sortField, sortOrder, user?.id],
    queryFn: async () => testSuiteService.listPaginated({
      search: debouncedSearch || undefined,
      ownership: ownershipFilter,
      visibilityFilter: ownershipFilter === 'mine' && visibilityFilter.length ? visibilityFilter : undefined,
      userId: user?.id,
      page,
      pageSize: rowsPerPage,
      sortField,
      sortOrder: sortOrder === 1 ? 'asc' : 'desc',
    }),
  });

  const suites = (data?.data ?? []) as EnrichedTestSuite[];
  const totalRecords = data?.total ?? 0;

  function onPage(e: DataTablePageEvent) {
    setPage((e.page ?? 0) + 1);
    if (e.rows) setRowsPerPage(e.rows);
  }

  function onSort(e: DataTableSortEvent) {
    setSortField(e.sortField ?? 'name');
    setSortOrder(e.sortOrder as -1 | 1);
  }

  function isOwner(row: EnrichedTestSuite) {
    return row.ownerId === user?.id;
  }

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit' | 'duplicate'>('create');
  const [editingRow, setEditingRow] = useState<TestSuite | null>(null);
  const [duplicatingSourceId, setDuplicatingSourceId] = useState<string | null>(null);

  function openCreateDialog() {
    setDialogMode('create');
    setEditingRow(null);
    setDuplicatingSourceId(null);
    setDialogOpen(true);
  }

  function openEditDialog(row: TestSuite) {
    setDialogMode('edit');
    setEditingRow(row);
    setDuplicatingSourceId(null);
    setDialogOpen(true);
  }

  function openDuplicateDialog(row: TestSuite) {
    setDialogMode('duplicate');
    setEditingRow(row);
    setDuplicatingSourceId(row.id);
    setDialogOpen(true);
  }

  async function reload() {
    await queryClient.invalidateQueries({ queryKey: ['testSuites-paginated'] });
  }

  async function handleSave(data: { name: string; description: string; visibility: TestSuiteVisibility }) {
    if (dialogMode === 'edit' && editingRow) {
      await testSuiteService.updateSuite(editingRow.id, { name: data.name, description: data.description, visibility: data.visibility });
    } else if (dialogMode === 'duplicate' && duplicatingSourceId) {
      await testSuiteService.duplicateSuite(duplicatingSourceId, { name: data.name, description: data.description });
    } else {
      const s = await testSuiteService.createSuite({ name: data.name, description: data.description, visibility: data.visibility });
      setDialogOpen(false);
      toastHelper.success('Suite created');
      navigate(`/test-suites/${s.id}`);
      return;
    }
    setDialogOpen(false);
    await reload();
    toastHelper.success(dialogMode === 'edit' ? 'Suite updated' : 'Suite duplicated');
  }

  function handleDelete(row: TestSuite) {
    confirmDialog({
      header: 'Delete Suite',
      message: `Suite "${row.name}" and all its items will be permanently deleted. Continue?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        await testSuiteService.removeSuite(row.id);
        await reload();
        toastHelper.success('Suite deleted');
      },
    });
  }

  const mobileBodyTemplate = useCallback((row: EnrichedTestSuite) => (
    <div className="flex flex-column gap-1 py-1">
      <div className="flex align-items-center justify-content-between gap-2">
        <span className="font-bold">{row.name}</span>
        <Tag value={TEST_SUITE_VISIBILITY_LABEL[row.visibility]} severity={TEST_SUITE_VISIBILITY_SEVERITY[row.visibility]} style={{ width: 'fit-content' }} />
      </div>
      {row.description && <span className="text-sm text-color-secondary">{row.description}</span>}
      <div className="flex align-items-center gap-3 text-xs text-color-secondary">
        <span>
          <i className="pi pi-user mr-1" style={{ fontSize: '0.7rem' }} />
          <UserHoverCard userId={row.ownerId}>
            <span className="username-link">{row._authorUsername}</span>
          </UserHoverCard>
        </span>
        <span><i className="pi pi-clock mr-1" style={{ fontSize: '0.7rem' }} />{formatDateTime(row.updatedAt)}</span>
      </div>
    </div>
  ), []);

  return (
    <div>
      <ConfirmDialog />
      <Breadcrumb items={[{ label: 'Test Suite' }]} />
      <PageHeader
        title="Test Suite"
        actions={
          <div className="flex gap-3 align-items-center">
            <Button label="New Suite" icon="pi pi-plus" size="small" onClick={openCreateDialog} />
          </div>
        }
      />

      <p className="text-color-secondary text-sm">
        Reusable test case templates you can clone into any project. Publish yours so others can clone them too.
      </p>

      <div className="grid mb-3 p-1">
          <div className={ownershipFilter === 'mine' ? 'col-12 md:col-8 p-1' : 'col-12 md:col-10 p-1'}>
            <SelectButton
              value={ownershipFilter}
              onChange={(e) => e.value && setOwnershipFilter(e.value)}
              options={[
                { label: 'My Suite', value: 'mine' },
                { label: 'Public Templates', value: 'all' },
              ]}
              className="select-button-full-mobile w-full"
            />
          </div>
          {ownershipFilter === 'mine' && (
            <div className="col-12 md:col-2 p-1">
              <MultiSelect
                value={visibilityFilter}
                options={[
                  { label: 'Private', value: 'private' },
                  { label: 'Public', value: 'public' },
                ]}
                onChange={(e) => setVisibilityFilter(e.value)}
                placeholder="All Visibility"
                className="w-full"
                selectAll
                selectAllLabel="All"
              />
            </div>
          )}
          <div className="col-12 md:col-2 p-1">
            <div className="flex gap-2">
              <SearchInput value={search} onChange={(v) => { setSearch(v); if (!v) setDebouncedSearch(''); }} placeholder="Search suites..." className="flex-1" />
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
        value={suites}
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
        emptyMessage="No suites yet"
        size="small"
        onRowClick={(e) => navigate(`/test-suites/${(e.data as TestSuite).id}`)}
        rowHover
        className="cursor-pointer"
      >
        {isMobile && <Column header="Test Suite" body={mobileBodyTemplate} />}
        {!isMobile && (
          <Column
            field="name"
            header="Name"
            sortable
            body={(row: EnrichedTestSuite) => (
              <div className="flex flex-column">
                <span>{row.name}</span>
                <span className="text-xs text-color-secondary">
                  by{' '}
                  <UserHoverCard userId={row.ownerId}>
                    <span className="username-link">{row._authorUsername}</span>
                  </UserHoverCard>
                </span>
              </div>
            )}
          />
        )}
        {!isMobile && <Column field="description" header="Description" body={(row: EnrichedTestSuite) => row.description || ''} />}
        {!isMobile && (
          <Column
            field="visibility"
            header="Visibility"
            body={(row: EnrichedTestSuite) => <Tag value={TEST_SUITE_VISIBILITY_LABEL[row.visibility]} severity={TEST_SUITE_VISIBILITY_SEVERITY[row.visibility]} />}
          />
        )}
        {!isMobile && <Column field="updatedAt" header="Last Updated" body={(row: EnrichedTestSuite) => formatDateTime(row.updatedAt)} sortable />}
        <Column
          header=""
          style={{ width: '3.5rem' }}
          body={(row: EnrichedTestSuite) => (
            <RowActionsMenu
              items={[
                { label: 'View Details', icon: 'pi pi-external-link', command: () => navigate(`/test-suites/${row.id}`) },
                { label: 'Duplicate', icon: 'pi pi-copy', command: () => openDuplicateDialog(row) },
                ...(isOwner(row)
                  ? [
                    { label: 'Edit', icon: 'pi pi-pencil', command: () => openEditDialog(row) },
                    { label: 'Delete', icon: 'pi pi-trash', className: 'p-error', command: () => handleDelete(row) },
                  ]
                  : []),
              ]}
            />
          )}
        />
      </DataTable>

      <TestSuiteDialog
        visible={dialogOpen}
        mode={dialogMode}
        initialData={editingRow ? { name: editingRow.name, description: editingRow.description, visibility: editingRow.visibility } : undefined}
        onHide={() => setDialogOpen(false)}
        onSave={handleSave}
      />
    </div>
  );
}
