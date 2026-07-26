import { useCallback, useEffect, useRef, useState } from 'react';
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
import { testSuiteService } from '../../services/testSuiteService';
import { queryKeys } from '../../hooks/queryKeys';
import type { TestCasePriority, TestCaseStepType, TestSuiteItem } from '../../types/domain';
import { PageHeader } from '../../components/ui/PageHeader';
import { RowActionsMenu } from '../../components/ui/RowActionsMenu';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import { TEST_CASE_PRIORITY_LABEL, TEST_CASE_PRIORITY_SEVERITY } from '../../helpers/statusLabels';

const PRIORITY_OPTIONS: { label: string; value: TestCasePriority }[] = (
  ['low', 'medium', 'high', 'critical'] as const
).map((v) => ({ label: TEST_CASE_PRIORITY_LABEL[v], value: v }));

export function TestSuiteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const toast = useRef<Toast>(null);
  const { user, isAdmin } = useAuthContext();
  const { lt } = useScreenSize();
  const isMobile = lt.sm;
  const queryClient = useQueryClient();

  const { data: suite = null } = useQuery({
    queryKey: queryKeys.testSuite(id ?? ''),
    queryFn: () => testSuiteService.getSuite(id!),
    enabled: !!id,
  });

  const canEdit = isAdmin || suite?.ownerId === user?.id;

  const { data: items = [], isLoading: loading } = useQuery({
    queryKey: queryKeys.testSuiteItems(id ?? ''),
    queryFn: () => testSuiteService.listItems(id!),
    enabled: !!id,
  });

  async function reloadItems() {
    if (id) await queryClient.invalidateQueries({ queryKey: queryKeys.testSuiteItems(id) });
  }

  // --- Item dialog: same shape as the project Test Case dialog, minus project-scoped
  // module/tag pickers (suites aren't project-scoped) — module/tags are free text here,
  // resolved into real per-project rows only at clone time (testSuiteService.cloneItemsToProject).
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
  const itemTitleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (itemError && itemTitleRef.current) {
      itemTitleRef.current.focus();
      itemTitleRef.current.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
    }
  }, [itemError]);

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

  async function openEditItemDialog(row: TestSuiteItem) {
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
      const withSteps = await testSuiteService.getItemWithSteps(row);
      setItemDetailedSteps(withSteps.detailedSteps.map((s) => ({ action: s.action, expectedResult: s.expectedResult ?? '' })));
    } else {
      setItemDetailedSteps([]);
    }
  }

  async function openDuplicateItemDialog(row: TestSuiteItem) {
    setItemDialogMode('duplicate');
    setEditingItemId(null);
    setItemModuleName(row.moduleName ?? '');
    setItemTitle(`${row.title} (Copy)`);
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
      const withSteps = await testSuiteService.getItemWithSteps(row);
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
        await testSuiteService.updateItem(
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
        await testSuiteService.addItem({
          suiteId: id,
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
        create: 'Item added',
        edit: 'Item updated',
        duplicate: 'Item duplicated',
      };
      toast.current?.show({ severity: 'success', summary: summaryMap[itemDialogMode] });
    } catch (err) {
      setItemError(err instanceof Error ? err.message : 'Failed to save item');
    }
  }

  function handleDeleteItem(row: TestSuiteItem) {
    confirmDialog({
      header: 'Delete Item',
      message: `Item "${row.title}" will be removed from this suite. Continue?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        await testSuiteService.removeItem(row.id);
        await reloadItems();
        toast.current?.show({ severity: 'success', summary: 'Item deleted' });
      },
    });
  }

  const mobileBodyTemplate = useCallback((row: TestSuiteItem) => (
    <div className="flex flex-column gap-2 py-1">
      <div className="font-medium">{row.title}</div>
      <div className="text-sm text-color-secondary">Module: {row.moduleName || '-'}</div>
      <div className="text-sm text-color-secondary">
        Priority: <Tag value={TEST_CASE_PRIORITY_LABEL[row.priority]} severity={TEST_CASE_PRIORITY_SEVERITY[row.priority]} />
      </div>
      <div className="text-sm text-color-secondary">Role Target: {row.targetRole ? <Tag value={row.targetRole} severity="secondary" /> : '-'}</div>
      <div className="text-sm text-color-secondary">Mode: {row.stepType === 'detailed' ? 'Detailed' : 'Simple'}</div>
    </div>
  ), []);

  return (
    <div>
      <Toast ref={toast} position="bottom-center" />
      <ConfirmDialog />
      <Breadcrumb
        items={[
          { label: 'Test Suite', path: '/test-suites' },
          { label: suite ? suite.name : '…' },
        ]}
      />

      <Card className="mb-3">
        <div className="flex align-items-center justify-content-between gap-2">
          <div>
            <h2 className="m-0">{suite?.name ?? '…'}</h2>
            <p className="text-color-secondary text-sm m-0">{suite?.description || 'No description'}</p>
          </div>
        </div>
      </Card>

      <PageHeader
        title="Item Test Case"
        actions={canEdit ? <Button label="New Item" icon="pi pi-plus" size="small" onClick={openCreateItemDialog} /> : undefined}
      />

      <DataTable value={items} loading={loading} paginator paginatorTemplate="CurrentPageReport FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown" currentPageReportTemplate="{totalRecords} records" rows={10} rowsPerPageOptions={[5, 10, 25, 50]} emptyMessage="No items yet" size="small">
        {isMobile
          ? <Column header="Title" body={mobileBodyTemplate} />
          : <Column field="title" header="Title" sortable />
        }
        {!isMobile && <Column field="moduleName" header="Module" body={(row: TestSuiteItem) => row.moduleName || '-'} />}
        {!isMobile && <Column field="priority" header="Priority" body={(row: TestSuiteItem) => <Tag value={TEST_CASE_PRIORITY_LABEL[row.priority]} severity={TEST_CASE_PRIORITY_SEVERITY[row.priority]} />} />}
        {!isMobile && <Column field="targetRole" header="Role Target" body={(row: TestSuiteItem) => (row.targetRole ? <Tag value={row.targetRole} severity="secondary" /> : '-')} />}
        {!isMobile && <Column field="stepType" header="Mode" body={(row: TestSuiteItem) => (row.stepType === 'detailed' ? 'Detailed' : 'Simple')} />}
        {canEdit && (
          <Column
            header=""
            style={{ width: '3.5rem' }}
            body={(row: TestSuiteItem) => (
              <RowActionsMenu
                items={[
                  { label: 'Duplicate', icon: 'pi pi-copy', command: () => openDuplicateItemDialog(row) },
                  { label: 'Edit', icon: 'pi pi-pencil', command: () => openEditItemDialog(row) },
                  { label: 'Delete', icon: 'pi pi-trash', className: 'p-error', command: () => handleDeleteItem(row) },
                ]}
              />
            )}
          />
        )}
      </DataTable>

      {/* --- Item Dialog --- */}
      <Dialog
        header={
          itemDialogMode === 'edit' ? 'Edit Item' : itemDialogMode === 'duplicate' ? 'Duplicate Item' : 'New Item'
        }
        visible={itemDialogOpen}
        onHide={() => setItemDialogOpen(false)}
        style={{ width: '40rem' }}
      >
        <div className="flex flex-column gap-3">
          <div className="grid">
            <div className="col-12 md:col-6 flex flex-column gap-1">
              <label htmlFor="item-module">Module (optional)</label>
              <InputText id="item-module" value={itemModuleName} onChange={(e) => setItemModuleName(e.target.value)} placeholder="e.g. Auth, Checkout" />
            </div>
            <div className="col-12 md:col-6 flex flex-column gap-1">
              <label htmlFor="item-priority">Priority</label>
              <Dropdown id="item-priority" value={itemPriority} options={PRIORITY_OPTIONS} onChange={(e) => setItemPriority(e.value)} className="w-full" />
            </div>
          </div>

          <div className="flex flex-column gap-1">
            <label htmlFor="item-title" className={itemError ? 'p-error' : ''}>Title</label>
            <InputText id="item-title" ref={itemTitleRef} value={itemTitle} onChange={(e) => setItemTitle(e.target.value)} className={itemError ? 'p-invalid' : ''} autoFocus />
            {itemError && <small className="p-error">{itemError}</small>}
          </div>

          <div className="flex flex-column gap-1">
            <label htmlFor="item-objective">Objective (optional)</label>
            <InputText id="item-objective" value={itemObjective} onChange={(e) => setItemObjective(e.target.value)} />
          </div>

          <div className="flex flex-column gap-1">
            <label htmlFor="item-preconditions">Prerequisites</label>
            <InputTextarea id="item-preconditions" value={itemPreconditions} onChange={(e) => setItemPreconditions(e.target.value)} rows={2} />
          </div>

          <div className="flex flex-column gap-1">
            <label>Step Mode</label>
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
                <label htmlFor="item-steps">Test Steps</label>
                <InputTextarea id="item-steps" value={itemSteps} onChange={(e) => setItemSteps(e.target.value)} rows={4} />
              </div>
              <div className="flex flex-column gap-1">
                <label htmlFor="item-expected">Expected Result</label>
                <InputTextarea id="item-expected" value={itemExpectedResult} onChange={(e) => setItemExpectedResult(e.target.value)} rows={3} />
              </div>
            </>
          ) : (
            <div className="flex flex-column gap-2">
              <label>Test Steps (Detailed)</label>
              {itemDetailedSteps.map((step, i) => (
                <div key={i} className="flex gap-2 align-items-start p-2 border-round surface-100">
                  <span className="text-color-secondary text-sm mt-2">{i + 1}.</span>
                  <div className="flex flex-column gap-1 flex-grow-1">
                    <InputText
                      placeholder="Action"
                      value={step.action}
                      onChange={(e) => setItemDetailedSteps((prev) => prev.map((s, idx) => (idx === i ? { ...s, action: e.target.value } : s)))}
                    />
                    <InputText
                      placeholder="Expected result (optional)"
                      value={step.expectedResult}
                      onChange={(e) => setItemDetailedSteps((prev) => prev.map((s, idx) => (idx === i ? { ...s, expectedResult: e.target.value } : s)))}
                    />
                  </div>
                  <Button icon="pi pi-times" text size="small" onClick={() => setItemDetailedSteps((prev) => prev.filter((_, idx) => idx !== i))} />
                </div>
              ))}
              <Button
                label="Add Step"
                icon="pi pi-plus"
                text
                size="small"
                onClick={() => setItemDetailedSteps((prev) => [...prev, { action: '', expectedResult: '' }])}
              />
            </div>
          )}

          <div className="flex flex-column gap-1">
            <label htmlFor="item-role">Role Target (optional)</label>
            <InputText id="item-role" value={itemTargetRole} onChange={(e) => setItemTargetRole(e.target.value)} placeholder="e.g. Admin, Manager, Member" />
          </div>

          <div className="flex flex-column gap-1">
            <label htmlFor="item-tags">Tags (separate with comma)</label>
            <InputText id="item-tags" value={itemTagNames} onChange={(e) => setItemTagNames(e.target.value)} placeholder="e.g. Regression, Smoke" />
          </div>

          <Button label="Save" size="small" onClick={handleSaveItem} />
        </div>
      </Dialog>
    </div>
  );
}
