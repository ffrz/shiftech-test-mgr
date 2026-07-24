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
    setName(`${row.name} (Salinan)`);
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
        create: 'Template dibuat',
        edit: 'Template diperbarui',
        duplicate: 'Template diduplikat',
      };
      toast.current?.show({ severity: 'success', summary: summaryMap[dialogMode] });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan template');
    }
  }

  function handleDelete(row: TestCaseTemplate) {
    confirmDialog({
      header: 'Hapus Template',
      message: `Template "${row.name}" beserta seluruh item di dalamnya akan dihapus permanen. Lanjutkan?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Hapus',
      rejectLabel: 'Batal',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        await testCaseTemplateService.removeTemplate(row.id);
        await reload();
        toast.current?.show({ severity: 'success', summary: 'Template dihapus' });
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
        actions={isAdmin ? <Button label="Template Baru" icon="pi pi-plus" size="small" onClick={openCreateDialog} /> : undefined}
      />

      <p className="text-color-secondary text-sm">
        Library test case yang bisa di-clone ke project mana pun untuk inisialisasi cepat.
      </p>

      <DataTable
        value={templates}
        loading={loading}
        paginator
        rows={5}
        emptyMessage="Belum ada template"
        size="small"
        onRowClick={(e) => navigate(`/test-case-templates/${(e.data as TestCaseTemplate).id}`)}
        rowHover
        className="cursor-pointer"
      >
        <Column field="name" header="Nama" sortable />
        <Column field="description" header="Deskripsi" body={(row: TestCaseTemplate) => row.description || '-'} />
        <Column field="updatedAt" header="Update Terakhir" body={(row: TestCaseTemplate) => formatDateTime(row.updatedAt)} sortable />
        {isAdmin && (
          <Column
            header=""
            style={{ width: '3.5rem' }}
            body={(row: TestCaseTemplate) => (
              <RowActionsMenu
                items={[
                  { label: 'Duplikat', icon: 'pi pi-copy', command: () => openDuplicateDialog(row) },
                  { label: 'Edit', icon: 'pi pi-pencil', command: () => openEditDialog(row) },
                  { label: 'Hapus', icon: 'pi pi-trash', className: 'p-error', command: () => handleDelete(row) },
                ]}
              />
            )}
          />
        )}
      </DataTable>

      <Dialog
        header={
          dialogMode === 'edit' ? 'Edit Template' : dialogMode === 'duplicate' ? 'Duplikat Template' : 'Template Baru'
        }
        visible={dialogOpen}
        onHide={() => setDialogOpen(false)}
        style={{ width: '30rem' }}
      >
        <div className="flex flex-column gap-3">
          {error && <small className="p-error">{error}</small>}
          <div className="flex flex-column gap-1">
            <label htmlFor="template-name">Nama</label>
            <InputText id="template-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>
          <div className="flex flex-column gap-1">
            <label htmlFor="template-description">Deskripsi</label>
            <InputTextarea id="template-description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
          <Button label="Simpan" size="small" onClick={handleSave} />
        </div>
      </Dialog>
    </div>
  );
}
