import { useCallback, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from 'primereact/card';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Tag } from 'primereact/tag';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Dropdown } from 'primereact/dropdown';
import { SelectButton } from 'primereact/selectbutton';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Toast } from 'primereact/toast';
import { useAuthContext } from '../../hooks/useAuth';
import { useScreenSize } from '../../hooks/useScreenSize';
import { testCaseTemplateService } from '../../services/testCaseTemplateService';
import { queryKeys } from '../../hooks/queryKeys';
import type { TestCasePriority, TestCaseStepType, TestCaseTemplateItem } from '../../types/domain';
import { PageHeader } from '../../components/ui/PageHeader';
import { RowActionsMenu } from '../../components/ui/RowActionsMenu';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import { TEST_CASE_PRIORITY_LABEL, TEST_CASE_PRIORITY_SEVERITY } from '../../helpers/statusLabels';

const PRIORITY_OPTIONS: { label: string; value: TestCasePriority }[] = (
  ['low', 'medium', 'high', 'critical'] as const
).map((v) => ({ label: TEST_CASE_PRIORITY_LABEL[v], value: v }));

export function TestCaseTemplateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const toast = useRef<Toast>(null);
  const { isAdmin } = useAuthContext();
  const { lt } = useScreenSize();
  const isMobile = lt.sm;
  const queryClient = useQueryClient();

  const { data: template = null } = useQuery({
    queryKey: queryKeys.testCaseTemplate(id ?? ''),
    queryFn: () => testCaseTemplateService.getTemplate(id!),
    enabled: !!id,
  });

  const { data: items = [], isLoading: loading } = useQuery({
    queryKey: queryKeys.testCaseTemplateItems(id ?? ''),
    queryFn: () => testCaseTemplateService.listItems(id!),
    enabled: !!id,
  });

  async function reloadItems() {
    if (id) await queryClient.invalidateQueries({ queryKey: queryKeys.testCaseTemplateItems(id) });
  }

  // --- Item dialog: same shape as the project Test Case dialog, minus project-scoped
  // module/tag pickers (templates aren't project-scoped) — module/tags are free text here,
  // resolved into real per-project rows only at clone time (testCaseTemplateService.cloneItemsToProject).
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [itemDialogMode, setItemDialogMode] = useState<'create' | 'edit' | 'duplicate'>('create');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [itemModuleName, setItemModuleName] = useState('');
  const [itemTitle, setItemTitle] = useState('');
  const [itemObjective, setItemObjective] = useState('');
  const [itemPreconditions, setItemPreconditions] = useState('');
  const [itemSteps, setItemSteps] = useState('');
  const [itemExpectedResult, setItemExpectedResult] = useState('');
  const [itemPriority, setItemPriority] = useState<TestCasePriority>('medium');
  const [itemTargetRole, setItemTargetRole] = useState('');
  const [itemTagNames, setItemTagNames] = useState('');
  const [itemStepType, setItemStepType] = useState<TestCaseStepType>('simple');
  const [itemDetailedSteps, setItemDetailedSteps] = useState<{ action: string; expectedResult: string }[]>([]);
  const [itemError, setItemError] = useState<string | null>(null);

  function openCreateItemDialog() {
    setItemDialogMode('create');
    setEditingItemId(null);
    setItemModuleName('');
    setItemTitle('');
    setItemObjective('');
    setItemPreconditions('');
    setItemSteps('');
    setItemExpectedResult('');
    setItemPriority('medium');
    setItemTargetRole('');
    setItemTagNames('');
    setItemStepType('simple');
    setItemDetailedSteps([]);
    setItemError(null);
    setItemDialogOpen(true);
  }

  async function openEditItemDialog(row: TestCaseTemplateItem) {
    setItemDialogMode('edit');
    setEditingItemId(row.id);
    setItemModuleName(row.moduleName ?? '');
    setItemTitle(row.title);
    setItemObjective(row.objective ?? '');
    setItemPreconditions(row.preconditions ?? '');
    setItemSteps(row.steps);
    setItemExpectedResult(row.expectedResult);
    setItemPriority(row.priority);
    setItemTargetRole(row.targetRole ?? '');
    setItemTagNames(row.tagNames.join(', '));
    setItemStepType(row.stepType);
    setItemError(null);
    setItemDialogOpen(true);
    if (row.stepType === 'detailed') {
      const withSteps = await testCaseTemplateService.getItemWithSteps(row);
      setItemDetailedSteps(withSteps.detailedSteps.map((s) => ({ action: s.action, expectedResult: s.expectedResult ?? '' })));
    } else {
      setItemDetailedSteps([]);
    }
  }

  async function openDuplicateItemDialog(row: TestCaseTemplateItem) {
    setItemDialogMode('duplicate');
    setEditingItemId(null);
    setItemModuleName(row.moduleName ?? '');
    setItemTitle(`${row.title} (Salinan)`);
    setItemObjective(row.objective ?? '');
    setItemPreconditions(row.preconditions ?? '');
    setItemSteps(row.steps);
    setItemExpectedResult(row.expectedResult);
    setItemPriority(row.priority);
    setItemTargetRole(row.targetRole ?? '');
    setItemTagNames(row.tagNames.join(', '));
    setItemStepType(row.stepType);
    setItemError(null);
    setItemDialogOpen(true);
    if (row.stepType === 'detailed') {
      const withSteps = await testCaseTemplateService.getItemWithSteps(row);
      setItemDetailedSteps(withSteps.detailedSteps.map((s) => ({ action: s.action, expectedResult: s.expectedResult ?? '' })));
    } else {
      setItemDetailedSteps([]);
    }
  }

  async function handleSaveItem() {
    if (!id) return;
    setItemError(null);
    const tagNames = itemTagNames.split(',').map((t) => t.trim()).filter(Boolean);
    try {
      if (editingItemId) {
        await testCaseTemplateService.updateItem(
          editingItemId,
          {
            moduleName: itemModuleName.trim() || null,
            title: itemTitle,
            objective: itemObjective.trim() || null,
            preconditions: itemPreconditions.trim() || null,
            steps: itemSteps,
            expectedResult: itemExpectedResult,
            priority: itemPriority,
            targetRole: itemTargetRole.trim() || null,
            tagNames,
            stepType: itemStepType,
          },
          itemStepType === 'detailed' ? itemDetailedSteps : undefined,
        );
      } else {
        await testCaseTemplateService.addItem({
          templateId: id,
          moduleName: itemModuleName,
          title: itemTitle,
          objective: itemObjective,
          preconditions: itemPreconditions,
          steps: itemSteps,
          expectedResult: itemExpectedResult,
          priority: itemPriority,
          targetRole: itemTargetRole,
          tagNames,
          stepType: itemStepType,
          detailedSteps: itemStepType === 'detailed' ? itemDetailedSteps : undefined,
          orderIndex: items.length,
        });
      }
      setItemDialogOpen(false);
      await reloadItems();
      const summaryMap: Record<typeof itemDialogMode, string> = {
        create: 'Item ditambahkan',
        edit: 'Item diperbarui',
        duplicate: 'Item diduplikat',
      };
      toast.current?.show({ severity: 'success', summary: summaryMap[itemDialogMode] });
    } catch (err) {
      setItemError(err instanceof Error ? err.message : 'Gagal menyimpan item');
    }
  }

  function handleDeleteItem(row: TestCaseTemplateItem) {
    confirmDialog({
      header: 'Hapus Item',
      message: `Item "${row.title}" akan dihapus dari template ini. Lanjutkan?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Hapus',
      rejectLabel: 'Batal',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        await testCaseTemplateService.removeItem(row.id);
        await reloadItems();
        toast.current?.show({ severity: 'success', summary: 'Item dihapus' });
      },
    });
  }

  const mobileBodyTemplate = useCallback((row: TestCaseTemplateItem) => (
    <div className="flex flex-column gap-2 py-1">
      <div className="font-medium">{row.title}</div>
      <div className="text-sm text-color-secondary">Module: {row.moduleName || '-'}</div>
      <div className="text-sm text-color-secondary">
        Prioritas: <Tag value={TEST_CASE_PRIORITY_LABEL[row.priority]} severity={TEST_CASE_PRIORITY_SEVERITY[row.priority]} />
      </div>
      <div className="text-sm text-color-secondary">Role Target: {row.targetRole ? <Tag value={row.targetRole} severity="secondary" /> : '-'}</div>
      <div className="text-sm text-color-secondary">Mode: {row.stepType === 'detailed' ? 'Detailed' : 'Simple'}</div>
    </div>
  ), []);

  return (
    <div>
      <Toast ref={toast} />
      <ConfirmDialog />
      <Breadcrumb
        items={[
          { label: 'Test Case Templates', path: '/test-case-templates' },
          { label: template ? template.name : '…' },
        ]}
      />

      <Card className="mb-3">
        <div className="flex align-items-center justify-content-between gap-2">
          <div>
            <h2 className="m-0">{template?.name ?? '…'}</h2>
            <p className="text-color-secondary text-sm m-0">{template?.description || 'Tidak ada deskripsi'}</p>
          </div>
        </div>
      </Card>

      <PageHeader
        title="Item Test Case"
        actions={isAdmin ? <Button label="Item Baru" icon="pi pi-plus" size="small" onClick={openCreateItemDialog} /> : undefined}
      />

      <DataTable value={items} loading={loading} paginator rows={10} rowsPerPageOptions={[5, 10, 25, 50]} emptyMessage="Belum ada item" size="small">
        {isMobile
          ? <Column header="Judul" body={mobileBodyTemplate} />
          : <Column field="title" header="Judul" sortable />
        }
        {!isMobile && <Column field="moduleName" header="Module" body={(row: TestCaseTemplateItem) => row.moduleName || '-'} />}
        {!isMobile && <Column field="priority" header="Prioritas" body={(row: TestCaseTemplateItem) => <Tag value={TEST_CASE_PRIORITY_LABEL[row.priority]} severity={TEST_CASE_PRIORITY_SEVERITY[row.priority]} />} />}
        {!isMobile && <Column field="targetRole" header="Role Target" body={(row: TestCaseTemplateItem) => (row.targetRole ? <Tag value={row.targetRole} severity="secondary" /> : '-')} />}
        {!isMobile && <Column field="stepType" header="Mode" body={(row: TestCaseTemplateItem) => (row.stepType === 'detailed' ? 'Detailed' : 'Simple')} />}
        {isAdmin && (
          <Column
            header=""
            style={{ width: '3.5rem' }}
            body={(row: TestCaseTemplateItem) => (
              <RowActionsMenu
                items={[
                  { label: 'Duplikat', icon: 'pi pi-copy', command: () => openDuplicateItemDialog(row) },
                  { label: 'Edit', icon: 'pi pi-pencil', command: () => openEditItemDialog(row) },
                  { label: 'Hapus', icon: 'pi pi-trash', className: 'p-error', command: () => handleDeleteItem(row) },
                ]}
              />
            )}
          />
        )}
      </DataTable>

      {/* --- Item Dialog --- */}
      <Dialog
        header={
          itemDialogMode === 'edit' ? 'Edit Item' : itemDialogMode === 'duplicate' ? 'Duplikat Item' : 'Item Baru'
        }
        visible={itemDialogOpen}
        onHide={() => setItemDialogOpen(false)}
        style={{ width: '40rem' }}
      >
        <div className="flex flex-column gap-3">
          {itemError && <small className="p-error">{itemError}</small>}

          <div className="grid">
            <div className="col-12 md:col-6 flex flex-column gap-1">
              <label htmlFor="item-module">Module (opsional)</label>
              <InputText id="item-module" value={itemModuleName} onChange={(e) => setItemModuleName(e.target.value)} placeholder="mis. Auth, Checkout" />
            </div>
            <div className="col-12 md:col-6 flex flex-column gap-1">
              <label htmlFor="item-priority">Prioritas</label>
              <Dropdown id="item-priority" value={itemPriority} options={PRIORITY_OPTIONS} onChange={(e) => setItemPriority(e.value)} className="w-full" />
            </div>
          </div>

          <div className="flex flex-column gap-1">
            <label htmlFor="item-title">Judul</label>
            <InputText id="item-title" value={itemTitle} onChange={(e) => setItemTitle(e.target.value)} autoFocus />
          </div>

          <div className="flex flex-column gap-1">
            <label htmlFor="item-objective">Tujuan (opsional)</label>
            <InputText id="item-objective" value={itemObjective} onChange={(e) => setItemObjective(e.target.value)} />
          </div>

          <div className="flex flex-column gap-1">
            <label htmlFor="item-preconditions">Prasyarat</label>
            <InputTextarea id="item-preconditions" value={itemPreconditions} onChange={(e) => setItemPreconditions(e.target.value)} rows={2} />
          </div>

          <div className="flex flex-column gap-1">
            <label>Mode Langkah</label>
            <SelectButton
              value={itemStepType}
              options={[
                { label: 'Simple', value: 'simple' },
                { label: 'Detailed', value: 'detailed' },
              ]}
              onChange={(e) => e.value && setItemStepType(e.value)}
            />
          </div>

          {itemStepType === 'simple' ? (
            <>
              <div className="flex flex-column gap-1">
                <label htmlFor="item-steps">Langkah Pengujian</label>
                <InputTextarea id="item-steps" value={itemSteps} onChange={(e) => setItemSteps(e.target.value)} rows={4} />
              </div>
              <div className="flex flex-column gap-1">
                <label htmlFor="item-expected">Hasil yang Diharapkan</label>
                <InputTextarea id="item-expected" value={itemExpectedResult} onChange={(e) => setItemExpectedResult(e.target.value)} rows={3} />
              </div>
            </>
          ) : (
            <div className="flex flex-column gap-2">
              <label>Langkah Pengujian (Detailed)</label>
              {itemDetailedSteps.map((step, i) => (
                <div key={i} className="flex gap-2 align-items-start p-2 border-round surface-100">
                  <span className="text-color-secondary text-sm mt-2">{i + 1}.</span>
                  <div className="flex flex-column gap-1 flex-grow-1">
                    <InputText
                      placeholder="Aksi"
                      value={step.action}
                      onChange={(e) => setItemDetailedSteps((prev) => prev.map((s, idx) => (idx === i ? { ...s, action: e.target.value } : s)))}
                    />
                    <InputText
                      placeholder="Hasil yang diharapkan (opsional)"
                      value={step.expectedResult}
                      onChange={(e) => setItemDetailedSteps((prev) => prev.map((s, idx) => (idx === i ? { ...s, expectedResult: e.target.value } : s)))}
                    />
                  </div>
                  <Button icon="pi pi-times" text size="small" onClick={() => setItemDetailedSteps((prev) => prev.filter((_, idx) => idx !== i))} />
                </div>
              ))}
              <Button
                label="Tambah Langkah"
                icon="pi pi-plus"
                text
                size="small"
                onClick={() => setItemDetailedSteps((prev) => [...prev, { action: '', expectedResult: '' }])}
              />
            </div>
          )}

          <div className="flex flex-column gap-1">
            <label htmlFor="item-role">Role Target (opsional)</label>
            <InputText id="item-role" value={itemTargetRole} onChange={(e) => setItemTargetRole(e.target.value)} placeholder="mis. Admin, Manager, Member" />
          </div>

          <div className="flex flex-column gap-1">
            <label htmlFor="item-tags">Tag (pisahkan dengan koma)</label>
            <InputText id="item-tags" value={itemTagNames} onChange={(e) => setItemTagNames(e.target.value)} placeholder="mis. Regression, Smoke" />
          </div>

          <Button label="Simpan" size="small" onClick={handleSaveItem} />
        </div>
      </Dialog>
    </div>
  );
}
