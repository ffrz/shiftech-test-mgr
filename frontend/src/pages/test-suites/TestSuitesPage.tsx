import { useRef, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Dropdown } from 'primereact/dropdown';
import { SelectButton } from 'primereact/selectbutton';
import { Tag } from 'primereact/tag';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Toast } from 'primereact/toast';
import { useAuthContext } from '../../hooks/useAuth';
import { testSuiteService } from '../../services/testSuiteService';
import { queryKeys } from '../../hooks/queryKeys';
import { useScreenSize } from '../../hooks/useScreenSize';
import type { TestSuite, TestSuiteVisibility } from '../../types/domain';
import { PageHeader } from '../../components/ui/PageHeader';
import { RowActionsMenu } from '../../components/ui/RowActionsMenu';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import { formatDateTime } from '../../helpers/dateFormatter';
import { TEST_SUITE_VISIBILITY_LABEL, TEST_SUITE_VISIBILITY_SEVERITY } from '../../helpers/statusLabels';

const VISIBILITY_OPTIONS: { label: string; value: TestSuiteVisibility }[] = [
  { label: 'Private — only you', value: 'private' },
  { label: 'Unlisted — anyone with the link', value: 'unlisted' },
  { label: 'Public — visible to everyone', value: 'public' },
];

type OwnershipFilter = 'mine' | 'all';

// User-owned reusable test case library — any user can create their own Test Suite
// Template, keep it private, or publish it (unlisted/public) for others to browse and
// clone from into their own project. Ownership/visibility enforced by RLS; the UI's
// isOwnerOrAdmin check only decides what actions are offered, not what's actually allowed.
export function TestSuitesPage() {
  const navigate = useNavigate();
  const toast = useRef<Toast>(null);
  const { user, isAdmin } = useAuthContext();
  const queryClient = useQueryClient();
  const { lt } = useScreenSize();
  const isMobile = lt.sm;

  const [ownershipFilter, setOwnershipFilter] = useState<OwnershipFilter>('mine');

  const { data: suites = [], isLoading: loading } = useQuery({
    queryKey: queryKeys.testSuites(),
    queryFn: () => testSuiteService.listSuites(),
  });

  const visibleSuites = useMemo(
    () => (ownershipFilter === 'mine' ? suites.filter((s) => s.ownerId === user?.id) : suites),
    [suites, ownershipFilter, user?.id],
  );

  function isOwnerOrAdmin(row: TestSuite) {
    return isAdmin || row.ownerId === user?.id;
  }

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit' | 'duplicate'>('create');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [duplicatingSourceId, setDuplicatingSourceId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<TestSuiteVisibility>('private');
  const [error, setError] = useState<string | null>(null);

  function openCreateDialog() {
    setDialogMode('create');
    setEditingId(null);
    setDuplicatingSourceId(null);
    setName('');
    setDescription('');
    setVisibility('private');
    setError(null);
    setDialogOpen(true);
  }

  function openEditDialog(row: TestSuite) {
    setDialogMode('edit');
    setEditingId(row.id);
    setDuplicatingSourceId(null);
    setName(row.name);
    setDescription(row.description ?? '');
    setVisibility(row.visibility);
    setError(null);
    setDialogOpen(true);
  }

  function openDuplicateDialog(row: TestSuite) {
    setDialogMode('duplicate');
    setEditingId(null);
    setDuplicatingSourceId(row.id);
    setName(`${row.name} (Copy)`);
    setDescription(row.description ?? '');
    setVisibility('private');
    setError(null);
    setDialogOpen(true);
  }

  async function reload() {
    await queryClient.invalidateQueries({ queryKey: queryKeys.testSuites() });
  }

  async function handleSave() {
    setError(null);
    try {
      if (dialogMode === 'edit' && editingId) {
        await testSuiteService.updateSuite(editingId, { name, description, visibility });
      } else if (dialogMode === 'duplicate' && duplicatingSourceId) {
        await testSuiteService.duplicateSuite(duplicatingSourceId, { name, description });
      } else {
        await testSuiteService.createSuite({ name, description, visibility });
      }
      setDialogOpen(false);
      await reload();
      const summaryMap: Record<typeof dialogMode, string> = {
        create: 'Suite created',
        edit: 'Suite updated',
        duplicate: 'Suite duplicated',
      };
      toast.current?.show({ severity: 'success', summary: summaryMap[dialogMode] });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save suite');
    }
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
        toast.current?.show({ severity: 'success', summary: 'Suite deleted' });
      },
    });
  }

  const mobileBodyTemplate = useCallback((row: TestSuite) => (
    <div className="flex flex-column gap-2 py-1">
      <span className="font-bold">{row.name}</span>
      <span className="text-sm text-color-secondary">{row.description || '-'}</span>
      <Tag value={TEST_SUITE_VISIBILITY_LABEL[row.visibility]} severity={TEST_SUITE_VISIBILITY_SEVERITY[row.visibility]} />
      <span className="text-sm text-color-secondary">{formatDateTime(row.updatedAt)}</span>
    </div>
  ), []);

  return (
    <div>
      <Toast ref={toast} />
      <ConfirmDialog />
      <Breadcrumb items={[{ label: 'Test Suite' }]} />
      <PageHeader
        title="Test Suite"
        actions={<Button label="New Suite" icon="pi pi-plus" size="small" onClick={openCreateDialog} />}
      />

      <p className="text-color-secondary text-sm">
        Reusable test case templates you can clone into any project. Publish yours so others can clone them too.
      </p>

      <div className="mb-3">
        <SelectButton
          value={ownershipFilter}
          onChange={(e) => e.value && setOwnershipFilter(e.value)}
          options={[
            { label: 'My Templates', value: 'mine' },
            { label: 'All Visible Templates', value: 'all' },
          ]}
        />
      </div>

      <DataTable
        value={visibleSuites}
        loading={loading}
        paginator
        rows={10} rowsPerPageOptions={[5, 10, 25, 50]}
        emptyMessage="No suites yet"
        size="small"
        onRowClick={(e) => navigate(`/test-suites/${(e.data as TestSuite).id}`)}
        rowHover
        className="cursor-pointer"
      >
        {isMobile && <Column body={mobileBodyTemplate} />}
        {!isMobile && <Column field="name" header="Name" sortable />}
        {!isMobile && <Column field="description" header="Description" body={(row: TestSuite) => row.description || '-'} />}
        {!isMobile && (
          <Column
            field="visibility"
            header="Visibility"
            body={(row: TestSuite) => <Tag value={TEST_SUITE_VISIBILITY_LABEL[row.visibility]} severity={TEST_SUITE_VISIBILITY_SEVERITY[row.visibility]} />}
          />
        )}
        {!isMobile && <Column field="updatedAt" header="Last Updated" body={(row: TestSuite) => formatDateTime(row.updatedAt)} sortable />}
        <Column
          header=""
          style={{ width: '3.5rem' }}
          body={(row: TestSuite) => (
            <RowActionsMenu
              items={[
                { label: 'Duplicate', icon: 'pi pi-copy', command: () => openDuplicateDialog(row) },
                ...(isOwnerOrAdmin(row)
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

      <Dialog
        header={
          dialogMode === 'edit' ? 'Edit Suite' : dialogMode === 'duplicate' ? 'Duplicate Suite' : 'New Suite'
        }
        visible={dialogOpen}
        onHide={() => setDialogOpen(false)}
        style={{ width: '30rem' }}
      >
        <div className="flex flex-column gap-3">
          {error && <small className="p-error">{error}</small>}
          <div className="flex flex-column gap-1">
            <label htmlFor="suite-name">Name</label>
            <InputText id="suite-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>
          <div className="flex flex-column gap-1">
            <label htmlFor="suite-description">Description</label>
            <InputTextarea id="suite-description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
          {dialogMode !== 'duplicate' && (
            <div className="flex flex-column gap-1">
              <label htmlFor="suite-visibility">Visibility</label>
              <Dropdown
                id="suite-visibility"
                value={visibility}
                options={VISIBILITY_OPTIONS}
                onChange={(e) => setVisibility(e.value)}
                className="w-full"
              />
            </div>
          )}
          <Button label="Save" size="small" onClick={handleSave} />
        </div>
      </Dialog>
    </div>
  );
}
