import { useRef, useState } from 'react';
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

  const { data: templates = [], isLoading: loading } = useQuery({
    queryKey: queryKeys.testCaseTemplates(),
    queryFn: () => testCaseTemplateService.listTemplates(),
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  function openCreateDialog() {
    setEditingId(null);
    setName('');
    setDescription('');
    setError(null);
    setDialogOpen(true);
  }

  function openEditDialog(row: TestCaseTemplate) {
    setEditingId(row.id);
    setName(row.name);
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
      if (editingId) {
        await testCaseTemplateService.updateTemplate(editingId, { name, description });
      } else {
        await testCaseTemplateService.createTemplate({ name, description });
      }
      setDialogOpen(false);
      await reload();
      toast.current?.show({ severity: 'success', summary: editingId ? 'Template updated' : 'Template created' });
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

  return (
    <div>
      <Toast ref={toast} />
      <ConfirmDialog />
      <Breadcrumb items={[{ label: 'Test Case Templates' }]} />
      <PageHeader
        title="Test Case Templates"
        actions={isAdmin ? <Button label="New Template" icon="pi pi-plus" size="small" onClick={openCreateDialog} /> : undefined}
      />

      <p className="text-color-secondary text-sm">
        A library of test cases that can be cloned into any project for quick setup.
      </p>

      <DataTable
        value={templates}
        loading={loading}
        paginator
        rows={5}
        emptyMessage="No templates yet"
        size="small"
        onRowClick={(e) => navigate(`/test-case-templates/${(e.data as TestCaseTemplate).id}`)}
        rowHover
        className="cursor-pointer"
      >
        <Column field="name" header="Name" sortable />
        <Column field="description" header="Description" body={(row: TestCaseTemplate) => row.description || '-'} />
        <Column field="updatedAt" header="Last Updated" body={(row: TestCaseTemplate) => formatDateTime(row.updatedAt)} sortable />
        {isAdmin && (
          <Column
            header=""
            style={{ width: '3.5rem' }}
            body={(row: TestCaseTemplate) => (
              <RowActionsMenu
                items={[
                  { label: 'Edit', icon: 'pi pi-pencil', command: () => openEditDialog(row) },
                  { label: 'Delete', icon: 'pi pi-trash', className: 'p-error', command: () => handleDelete(row) },
                ]}
              />
            )}
          />
        )}
      </DataTable>

      <Dialog
        header={editingId ? 'Edit Template' : 'New Template'}
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
