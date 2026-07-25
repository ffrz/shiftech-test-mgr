import { useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Toast } from 'primereact/toast';
import { useAuthContext } from '../../hooks/useAuth';
import { testCaseTemplateService } from '../../services/testCaseTemplateService';
import { queryKeys } from '../../hooks/queryKeys';
import { useScreenSize } from '../../hooks/useScreenSize';
import type { TestCaseTemplate } from '../../types/domain';
import { PageHeader } from '../../components/ui/PageHeader';
import { RowActionsMenu } from '../../components/ui/RowActionsMenu';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import { formatDateTime } from '../../helpers/dateFormatter';

// Global, admin-managed library of reusable test case sets — any approved user can browse
// and clone from a template into their own project, but only admins can create/edit/delete
// templates themselves (enforced by RLS; isAdmin here only drives what the UI offers).
export function TestCaseTemplatesPage() {
  const navigate = useNavigate();
  const toast = useRef<Toast>(null);
  const { isAdmin } = useAuthContext();
  const queryClient = useQueryClient();
  const { lt } = useScreenSize();
  const isMobile = lt.sm;

  const { data: templates = [], isLoading: loading } = useQuery({
    queryKey: queryKeys.testCaseTemplates(),
    queryFn: () => testCaseTemplateService.listTemplates(),
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit' | 'duplicate'>('create');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [duplicatingSourceId, setDuplicatingSourceId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  function openCreateDialog() {
    setDialogMode('create');
    setEditingId(null);
    setDuplicatingSourceId(null);
    setName('');
    setDescription('');
    setError(null);
    setDialogOpen(true);
  }

  function openEditDialog(row: TestCaseTemplate) {
    setDialogMode('edit');
    setEditingId(row.id);
    setDuplicatingSourceId(null);
    setName(row.name);
    setDescription(row.description ?? '');
    setError(null);
    setDialogOpen(true);
  }

  function openDuplicateDialog(row: TestCaseTemplate) {
    setDialogMode('duplicate');
    setEditingId(null);
    setDuplicatingSourceId(row.id);
    setName(`${row.name} (Copy)`);
    setDescription(row.description ?? '');
    setError(null);
    setDialogOpen(true);
  }

  async function reload() {
    await queryClient.invalidateQueries({ queryKey: queryKeys.testCaseTemplates() });
  }

  async function handleSave() {
    setError(null);
    try {
      if (dialogMode === 'edit' && editingId) {
        await testCaseTemplateService.updateTemplate(editingId, { name, description });
      } else if (dialogMode === 'duplicate' && duplicatingSourceId) {
        await testCaseTemplateService.duplicateTemplate(duplicatingSourceId, { name, description });
      } else {
        await testCaseTemplateService.createTemplate({ name, description });
      }
      setDialogOpen(false);
      await reload();
      const summaryMap: Record<typeof dialogMode, string> = {
        create: 'Template created',
        edit: 'Template updated',
        duplicate: 'Template duplicated',
      };
      toast.current?.show({ severity: 'success', summary: summaryMap[dialogMode] });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save template');
    }
  }

  function handleDelete(row: TestCaseTemplate) {
    confirmDialog({
      header: 'Delete Template',
      message: `Template "${row.name}" and all its items will be permanently deleted. Continue?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        await testCaseTemplateService.removeTemplate(row.id);
        await reload();
        toast.current?.show({ severity: 'success', summary: 'Template deleted' });
      },
    });
  }

  const mobileBodyTemplate = useCallback((row: TestCaseTemplate) => (
    <div className="flex flex-column gap-2 py-1">
      <span className="font-bold">{row.name}</span>
      <span className="text-sm text-color-secondary">{row.description || '-'}</span>
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
        actions={isAdmin ? <Button label="New Template" icon="pi pi-plus" size="small" onClick={openCreateDialog} /> : undefined}
      />

      <p className="text-color-secondary text-sm">
        Test case library that can be cloned to any project for quick initialization.
      </p>

      <DataTable
        value={templates}
        loading={loading}
        paginator
        rows={10} rowsPerPageOptions={[5, 10, 25, 50]}
        emptyMessage="No templates yet"
        size="small"
        onRowClick={(e) => navigate(`/test-case-templates/${(e.data as TestCaseTemplate).id}`)}
        rowHover
        className="cursor-pointer"
      >
        {isMobile && <Column body={mobileBodyTemplate} />}
        {!isMobile && <Column field="name" header="Name" sortable />}
        {!isMobile && <Column field="description" header="Description" body={(row: TestCaseTemplate) => row.description || '-'} />}
        {!isMobile && <Column field="updatedAt" header="Last Updated" body={(row: TestCaseTemplate) => formatDateTime(row.updatedAt)} sortable />}
        {isAdmin && (
          <Column
            header=""
            style={{ width: '3.5rem' }}
            body={(row: TestCaseTemplate) => (
              <RowActionsMenu
                items={[
                  { label: 'Duplicate', icon: 'pi pi-copy', command: () => openDuplicateDialog(row) },
                  { label: 'Edit', icon: 'pi pi-pencil', command: () => openEditDialog(row) },
                  { label: 'Delete', icon: 'pi pi-trash', className: 'p-error', command: () => handleDelete(row) },
                ]}
              />
            )}
          />
        )}
      </DataTable>

      <Dialog
        header={
          dialogMode === 'edit' ? 'Edit Template' : dialogMode === 'duplicate' ? 'Duplicate Template' : 'New Template'
        }
        visible={dialogOpen}
        onHide={() => setDialogOpen(false)}
        style={{ width: '30rem' }}
      >
        <div className="flex flex-column gap-3">
          {error && <small className="p-error">{error}</small>}
          <div className="flex flex-column gap-1">
            <label htmlFor="template-name">Name</label>
            <InputText id="template-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>
          <div className="flex flex-column gap-1">
            <label htmlFor="template-description">Description</label>
            <InputTextarea id="template-description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
          <Button label="Save" size="small" onClick={handleSave} />
        </div>
      </Dialog>
    </div>
  );
}
