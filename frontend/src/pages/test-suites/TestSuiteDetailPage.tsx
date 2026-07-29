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
import { CharacterCount } from '../../components/ui/CharacterCount';
import { Dropdown } from 'primereact/dropdown';
import { SelectButton } from 'primereact/selectbutton';
import { FileUpload, type FileUploadHandlerEvent } from 'primereact/fileupload';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Toast } from 'primereact/toast';
import { useAuthContext } from '../../hooks/useAuth';
import { useScreenSize } from '../../hooks/useScreenSize';
import { testSuiteService } from '../../services/testSuiteService';
import { queryKeys } from '../../hooks/queryKeys';
import type { TestCasePriority, TestCaseStepType, TestSuiteItem } from '../../types/domain';
import { PageHeader } from '../../components/ui/PageHeader';
import { RowActionsMenu } from '../../components/ui/RowActionsMenu';
import { BulkActionsBar } from '../../components/ui/BulkActionsBar';
import { dataTablePaginatorProps } from '../../components/ui/dataTablePaginator';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import { TestSuiteDialog } from '../../components/dialogs/TestSuiteDialog';
import { ImportTemplateDialog } from '../projects/components/dialogs/ImportTemplateDialog';
import { parseTestCaseCsv } from '../../helpers/csvImport';
import { TEST_CASE_PRIORITY_LABEL, TEST_CASE_PRIORITY_SEVERITY, TEST_SUITE_VISIBILITY_LABEL, TEST_SUITE_VISIBILITY_SEVERITY } from '../../helpers/statusLabels';

const UNDO_TIMEOUT_MS = 9000;

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
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // --- Bulk selection ---
  const [selectedItems, setSelectedItems] = useState<TestSuiteItem[]>([]);

  function handleBulkDeleteItems() {
    confirmDialog({
      header: 'Delete Selected Items',
      message: `${selectedItems.length} item(s) will be permanently removed from this suite. Continue?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        await testSuiteService.removeItemsMany(selectedItems.map((i) => i.id));
        setSelectedItems([]);
        await reloadItems();
        toast.current?.show({ severity: 'success', summary: `${selectedItems.length} item(s) deleted` });
      },
    });
  }

  // --- Import from Template ---
  const [importTemplateDialogOpen, setImportTemplateDialogOpen] = useState(false);
  const [importTemplateId, setImportTemplateId] = useState<string | null>(null);
  const [importTemplateItems, setImportTemplateItems] = useState<TestSuiteItem[]>([]);
  const [importTemplateItemIds, setImportTemplateItemIds] = useState<string[]>([]);
  const [importTemplateLoading, setImportTemplateLoading] = useState(false);

  const { data: allTemplates = [] } = useQuery({
    queryKey: [...queryKeys.testSuites(), 'all'],
    queryFn: () => testSuiteService.listSuites(),
    enabled: importTemplateDialogOpen,
  });

  function openImportTemplateDialog() {
    setImportTemplateId(null);
    setImportTemplateItems([]);
    setImportTemplateItemIds([]);
    setImportTemplateDialogOpen(true);
  }

  async function handleSelectImportTemplate(nextTemplateId: string | null) {
    setImportTemplateId(nextTemplateId);
    setImportTemplateItemIds([]);
    if (!nextTemplateId) { setImportTemplateItems([]); return; }
    setImportTemplateItems(await testSuiteService.listItems(nextTemplateId));
  }

  async function handleImportTemplate() {
    if (!id || importTemplateItemIds.length === 0) return;
    setImportTemplateLoading(true);
    try {
      await testSuiteService.cloneItemsToSuite(id, importTemplateItemIds);
      setImportTemplateDialogOpen(false);
      await reloadItems();
      toast.current?.show({ severity: 'success', summary: `${importTemplateItemIds.length} test case(s) imported` });
    } catch (err) {
      toast.current?.show({ severity: 'error', summary: 'Import failed', detail: err instanceof Error ? err.message : undefined });
    } finally {
      setImportTemplateLoading(false);
    }
  }

  // --- Import from CSV ---
  const [importCsvDialogOpen, setImportCsvDialogOpen] = useState(false);
  const [csvValidRows, setCsvValidRows] = useState<any[]>([]);
  const [csvInvalidRows, setCsvInvalidRows] = useState<any[]>([]);
  const [csvParsed, setCsvParsed] = useState(false);
  const [csvImporting, setCsvImporting] = useState(false);

  async function handleCsvFile(event: FileUploadHandlerEvent) {
    const file = event.files[0];
    if (!file) return;
    try {
      const { valid, invalid } = await parseTestCaseCsv(file);
      setCsvValidRows(valid);
      setCsvInvalidRows(invalid);
      setCsvParsed(true);
    } catch (err) {
      toast.current?.show({ severity: 'error', summary: 'Failed to read file', detail: err instanceof Error ? err.message : undefined });
    }
  }

  async function handleImportCsv() {
    if (!id || csvValidRows.length === 0) return;
    setCsvImporting(true);
    try {
      const existingItems = await testSuiteService.listItems(id);
      await testSuiteService.addItemsMany(
        csvValidRows.map((row, i) => ({
          suiteId: id,
          moduleName: row.moduleName ?? undefined,
          title: row.title,
          objective: row.objective ?? undefined,
          preconditions: row.preconditions ?? undefined,
          steps: row.steps,
          expectedResult: row.expectedResult,
          priority: row.priority,
          targetRole: row.targetRole ?? undefined,
          tagNames: row.tagNames ?? [],
          stepType: row.stepType,
          detailedSteps: row.detailedSteps,
          orderIndex: existingItems.length + i,
        })),
      );
      setImportCsvDialogOpen(false);
      setCsvParsed(false);
      setCsvValidRows([]);
      setCsvInvalidRows([]);
      await reloadItems();
      toast.current?.show({ severity: 'success', summary: `${csvValidRows.length} test case(s) imported` });
    } catch (err) {
      toast.current?.show({ severity: 'error', summary: 'Import failed', detail: err instanceof Error ? err.message : undefined });
    } finally {
      setCsvImporting(false);
    }
  }

  const { data: items = [], isLoading: loading } = useQuery({
    queryKey: queryKeys.testSuiteItems(id ?? ''),
    queryFn: () => testSuiteService.listItems(id!),
    enabled: !!id,
  });

  const undoToast = useRef<Toast>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (undoTimerRef.current) clearTimeout(undoTimerRef.current); }, []);

  const [editingCell, setEditingCell] = useState<{ itemId: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState<any>(null);
  const editRef = useRef<HTMLDivElement>(null);
  const cancelledRef = useRef(false);

  const startEdit = useCallback((itemId: string, field: string, currentValue: any) => {
    cancelledRef.current = false;
    setEditingCell({ itemId, field });
    setEditValue(currentValue);
  }, []);

  const cancelEdit = useCallback(() => {
    cancelledRef.current = true;
    setEditingCell(null);
    setEditValue(null);
  }, []);

  const handleUndo = useCallback(async (itemId: string, changes: Partial<TestSuiteItem>) => {
    if (undoTimerRef.current) { clearTimeout(undoTimerRef.current); undoTimerRef.current = null; }
    undoToast.current?.clear();
    try {
      await testSuiteService.updateItem(itemId, changes);
      await reloadItems();
    } catch { /* ignore */ }
  }, []);

  const scheduleUndoToast = useCallback((itemId: string, changes: Partial<TestSuiteItem>, fieldLabel: string) => {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    undoToast.current?.clear();
    undoToast.current?.show({
      severity: 'info',
      content: (
        <div className="flex align-items-center justify-content-between gap-3 w-full">
          <span>{fieldLabel} updated</span>
          <Button label="Undo" text size="small" onClick={() => handleUndo(itemId, changes)} />
        </div>
      ),
      sticky: true,
    });
    undoTimerRef.current = setTimeout(() => {
      undoToast.current?.clear();
      undoTimerRef.current = null;
    }, UNDO_TIMEOUT_MS);
  }, [handleUndo]);

  const confirmEdit = useCallback(async (row: TestSuiteItem, field: string, value: any) => {
    if (cancelledRef.current) return;
    setEditingCell(null);
    setEditValue(null);

    const normalizedValue = field === 'title' ? String(value ?? '').trim() : value;
    const normalizedPrevious = field === 'title' ? String((row as any)[field] ?? '').trim() : (row as any)[field];
    if (field === 'title' && !normalizedValue) return;
    if (normalizedValue === normalizedPrevious) return;

    const changes = { [field]: normalizedValue } as Partial<TestSuiteItem>;
    const fieldLabel: Record<string, string> = { title: 'Title', moduleName: 'Module', priority: 'Priority', targetRole: 'Role Target' };
    try {
      await testSuiteService.updateItem(row.id, changes);
      const undoChanges = { [field]: (row as any)[field] } as Partial<TestSuiteItem>;
      scheduleUndoToast(row.id, undoChanges, fieldLabel[field] ?? field);
      await reloadItems();
    } catch { /* ignore */ }
  }, [reloadItems, scheduleUndoToast]);

  const handleCellKeyDown = useCallback((e: React.KeyboardEvent, row: TestSuiteItem, field: string, value: any) => {
    if (e.key === 'Enter') { confirmEdit(row, field, value); }
    else if (e.key === 'Escape') { cancelEdit(); }
  }, [confirmEdit, cancelEdit]);

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
  const [itemErrors, setItemErrors] = useState<Record<string, string>>({});
  const itemTitleRef = useRef<HTMLInputElement>(null);
  const itemStepsRef = useRef<HTMLTextAreaElement>(null);
  const itemExpectedRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (itemErrors.title && itemTitleRef.current) {
      itemTitleRef.current.focus();
      itemTitleRef.current.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
    } else if (itemErrors.steps && itemStepsRef.current) {
      itemStepsRef.current.focus();
      itemStepsRef.current.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
    } else if (itemErrors.expectedResult && itemExpectedRef.current) {
      itemExpectedRef.current.focus();
      itemExpectedRef.current.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
    }
  }, [itemErrors]);

  function mapServiceError(msg: string): Record<string, string> {
    if (msg.includes('title cannot be empty')) return { title: msg };
    if (msg.includes('Test steps cannot be empty')) return { steps: msg };
    if (msg.includes('Expected result cannot be empty')) return { expectedResult: msg };
    if (msg.includes('must have at least one step')) return { detailedSteps: msg };
    return { title: msg };
  }

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
    setItemErrors({});
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
    setItemErrors({});
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
    setItemErrors({});
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
    setItemErrors({});
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
      const msg = err instanceof Error ? err.message : 'Failed to save item';
      setItemErrors(mapServiceError(msg));
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
      <Toast ref={undoToast} position="bottom-center" />
      <ConfirmDialog />
      <Breadcrumb
        items={[
          { label: 'Test Suite', path: '/test-suites' },
          { label: suite ? suite.name : '' },
        ]}
      />

      <Card className="mb-3">

        <div className="flex align-items-center justify-content-between gap-2 mb-1">
          <h2 className="m-0">{suite?.name ?? ''}</h2>
          <div className="header-actions">
            {canEdit && (
              <Button icon="pi pi-pencil" text rounded severity="secondary" size="small" onClick={() => setEditDialogOpen(true)} />
            )}
          </div>
        </div>
        <p className="text-color-secondary text-sm m-0 my-2">{suite?.description || 'No description'}</p>
        <div className="flex align-items-center gap-2 my-2">
          {suite && <Tag value={TEST_SUITE_VISIBILITY_LABEL[suite.visibility]} severity={TEST_SUITE_VISIBILITY_SEVERITY[suite.visibility]} />}
        </div>
      </Card>

      <PageHeader
        title="Test Cases"
        actions={canEdit ? (
          <div className="flex gap-2 align-items-center">
            <Button icon="pi pi-copy" size="small" text onClick={openImportTemplateDialog} tooltip="Import from Template" />
            <Button icon="pi pi-file-excel" size="small" text onClick={() => setImportCsvDialogOpen(true)} tooltip="Import from CSV" />
            <Button label="New Item" icon="pi pi-plus" size="small" onClick={openCreateItemDialog} />
          </div>
        ) : undefined}
      />

      {canEdit && (
        <BulkActionsBar
          selectedCount={selectedItems.length}
          onClear={() => setSelectedItems([])}
          actions={<Button label="Delete Selected" icon="pi pi-trash" size="small" severity="danger" outlined onClick={handleBulkDeleteItems} />}
        />
      )}

      <DataTable
        value={items}
        loading={loading}
        selection={selectedItems}
        onSelectionChange={(e: any) => setSelectedItems(e.value as TestSuiteItem[])}
        dataKey="id"
        selectionMode={isMobile ? null : 'checkbox'}
        {...dataTablePaginatorProps}
        rows={10}
        rowsPerPageOptions={[5, 10, 25, 50]}
        emptyMessage="No items yet"
        size="small"
        cellMemo={false}
      >
        {canEdit && <Column selectionMode="multiple" style={{ width: '3rem' }} hidden={isMobile} />}
        {isMobile
          ? <Column header="Title" body={mobileBodyTemplate} />
          : <Column field="title" header="Title" sortable body={(row: TestSuiteItem) => {
            const isEditing = editingCell?.itemId === row.id && editingCell?.field === 'title';
            if (isEditing && canEdit) {
              return (
                <div ref={editRef} onKeyDown={(e) => handleCellKeyDown(e, row, 'title', editValue)}>
                  <InputText value={editValue ?? ''} onChange={(e) => setEditValue(e.target.value)}
                    onBlur={() => confirmEdit(row, 'title', editValue)} autoFocus className="w-full" />
                </div>
              );
            }
            return <div onClick={(e) => { e.stopPropagation(); canEdit && startEdit(row.id, 'title', row.title); }} style={{ cursor: canEdit ? 'pointer' : undefined }}>{row.title}</div>;
          }} />
        }
        {!isMobile && <Column field="moduleName" header="Module" body={(row: TestSuiteItem) => {
          const isEditing = editingCell?.itemId === row.id && editingCell?.field === 'moduleName';
          if (isEditing && canEdit) {
            return (
              <div ref={editRef} onKeyDown={(e) => handleCellKeyDown(e, row, 'moduleName', editValue)}>
                <InputText value={editValue ?? ''} onChange={(e) => setEditValue(e.target.value)}
                  onBlur={() => confirmEdit(row, 'moduleName', editValue)} autoFocus className="w-full" />
              </div>
            );
          }
          return <div onClick={(e) => { e.stopPropagation(); canEdit && startEdit(row.id, 'moduleName', row.moduleName); }} style={{ cursor: canEdit ? 'pointer' : undefined }}>{row.moduleName || '-'}</div>;
        }} />}
        {!isMobile && <Column field="priority" header="Priority" body={(row: TestSuiteItem) => {
          const isEditing = editingCell?.itemId === row.id && editingCell?.field === 'priority';
          if (isEditing && canEdit) {
            return (
              <div ref={editRef} onKeyDown={(e) => handleCellKeyDown(e, row, 'priority', editValue)}>
                <Dropdown value={editValue as TestCasePriority} options={PRIORITY_OPTIONS}
                  onChange={(e) => confirmEdit(row, 'priority', e.value)}
                  onHide={cancelEdit}
                  autoFocus className="w-10rem" />
              </div>
            );
          }
          return <div onClick={(e) => { e.stopPropagation(); canEdit && startEdit(row.id, 'priority', row.priority); }} style={{ cursor: canEdit ? 'pointer' : undefined }}>
            <Tag value={TEST_CASE_PRIORITY_LABEL[row.priority]} severity={TEST_CASE_PRIORITY_SEVERITY[row.priority]} />
          </div>;
        }} />}
        {!isMobile && <Column field="targetRole" header="Role Target" body={(row: TestSuiteItem) => {
          const isEditing = editingCell?.itemId === row.id && editingCell?.field === 'targetRole';
          if (isEditing && canEdit) {
            return (
              <div ref={editRef} onKeyDown={(e) => handleCellKeyDown(e, row, 'targetRole', editValue)}>
                <InputText value={editValue ?? ''} onChange={(e) => setEditValue(e.target.value)}
                  onBlur={() => confirmEdit(row, 'targetRole', editValue)} autoFocus className="w-full" />
              </div>
            );
          }
          return <div onClick={(e) => { e.stopPropagation(); canEdit && startEdit(row.id, 'targetRole', row.targetRole); }} style={{ cursor: canEdit ? 'pointer' : undefined }}>
            {row.targetRole ? <Tag value={row.targetRole} severity="secondary" /> : '-'}
          </div>;
        }} />}
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
            <label htmlFor="item-title" className={itemErrors.title ? 'p-error' : ''}>Title</label>
            <InputText id="item-title" ref={itemTitleRef} value={itemTitle} onChange={(e) => { setItemTitle(e.target.value); setItemErrors({}); }} className={itemErrors.title ? 'p-invalid' : ''} autoFocus />
            {itemErrors.title && <small className="p-error">{itemErrors.title}</small>}
          </div>

          <div className="flex flex-column gap-1">
            <label htmlFor="item-objective">Objective (optional)</label>
            <InputText id="item-objective" value={itemObjective} onChange={(e) => setItemObjective(e.target.value)} />
          </div>

          <div className="flex flex-column gap-1">
            <label htmlFor="item-preconditions">Prerequisites</label>
            <InputTextarea id="item-preconditions" value={itemPreconditions} onChange={(e) => setItemPreconditions(e.target.value)} rows={1} autoResize maxLength={1000} />
            <CharacterCount value={itemPreconditions} maxLength={1000} />
          </div>

          <div className="flex flex-column gap-1">
            <label>Step Mode</label>
            <SelectButton
              value={itemStepType}
              options={[
                { label: 'Simple', value: 'simple' },
                { label: 'Detailed', value: 'detailed' },
              ]}
              onChange={(e) => { if (e.value) { setItemStepType(e.value); setItemErrors({}); } }}
            />
          </div>

          {itemStepType === 'simple' ? (
            <>
              <div className="flex flex-column gap-1">
                <label htmlFor="item-steps" className={itemErrors.steps ? 'p-error' : ''}>Test Steps</label>
                <InputTextarea id="item-steps" ref={itemStepsRef} value={itemSteps} onChange={(e) => { setItemSteps(e.target.value); setItemErrors({}); }} rows={1} autoResize maxLength={1000} className={itemErrors.steps ? 'p-invalid' : ''} />
                <CharacterCount value={itemSteps} maxLength={1000} />
                {itemErrors.steps && <small className="p-error">{itemErrors.steps}</small>}
              </div>
              <div className="flex flex-column gap-1">
                <label htmlFor="item-expected" className={itemErrors.expectedResult ? 'p-error' : ''}>Expected Result</label>
                <InputTextarea id="item-expected" ref={itemExpectedRef} value={itemExpectedResult} onChange={(e) => { setItemExpectedResult(e.target.value); setItemErrors({}); }} rows={1} autoResize maxLength={1000} className={itemErrors.expectedResult ? 'p-invalid' : ''} />
                <CharacterCount value={itemExpectedResult} maxLength={1000} />
                {itemErrors.expectedResult && <small className="p-error">{itemErrors.expectedResult}</small>}
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

      <TestSuiteDialog
        visible={editDialogOpen}
        mode="edit"
        initialData={suite ? { name: suite.name, description: suite.description, visibility: suite.visibility } : undefined}
        onHide={() => setEditDialogOpen(false)}
        onSave={async (data) => {
          if (!id) return;
          await testSuiteService.updateSuite(id, { name: data.name, description: data.description, visibility: data.visibility });
          setEditDialogOpen(false);
          await queryClient.invalidateQueries({ queryKey: queryKeys.testSuite(id) });
          await reloadItems();
          toast.current?.show({ severity: 'success', summary: 'Suite updated' });
        }}
      />

      <ImportTemplateDialog
        visible={importTemplateDialogOpen}
        templateId={importTemplateId}
        onSelectTemplate={handleSelectImportTemplate}
        templates={allTemplates}
        items={importTemplateItems}
        itemIds={importTemplateItemIds}
        onItemIdsChange={setImportTemplateItemIds}
        loading={importTemplateLoading}
        onHide={() => setImportTemplateDialogOpen(false)}
        onImport={handleImportTemplate}
      />

      <Dialog header="Import from CSV" visible={importCsvDialogOpen} onHide={() => { setImportCsvDialogOpen(false); setCsvParsed(false); setCsvValidRows([]); setCsvInvalidRows([]); }} style={{ width: '40rem' }}>
        <div className="flex flex-column gap-3">
          <Toast ref={toast} position="bottom-center" />
          {!csvParsed && (
            <>
              <p className="text-color-secondary text-sm m-0">
                CSV file with header: Module, Title, Objective, Preconditions, Steps, Expected Result, Priority, Tags,
                Target Role. Only <strong>Title</strong> is required. Tags are comma-separated.
              </p>
              <FileUpload mode="basic" chooseLabel="Choose CSV File" accept=".csv" customUpload uploadHandler={handleCsvFile} auto />
            </>
          )}
          {csvParsed && (
            <>
              <div className="flex align-items-center gap-2 text-sm">
                <Tag value={`${csvValidRows.length} valid`} severity="success" />
                {csvInvalidRows.length > 0 && <Tag value={`${csvInvalidRows.length} invalid`} severity="danger" />}
                <Button label="Choose Another File" size="small" text onClick={() => setCsvParsed(false)} />
              </div>
              {csvInvalidRows.length > 0 && (
                <DataTable value={csvInvalidRows} size="small" paginator paginatorTemplate="CurrentPageReport FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown" currentPageReportTemplate="{totalRecords} records" rows={5} className="mb-2">
                  <Column field="rowNumber" header="Row" style={{ width: '5rem' }} />
                  <Column field="reason" header="Failure Reason" body={(row: any) => <span className="text-red-500">{row.reason}</span>} />
                </DataTable>
              )}
              <DataTable value={csvValidRows} size="small" paginator paginatorTemplate="CurrentPageReport FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown" currentPageReportTemplate="{totalRecords} records" rows={5} emptyMessage="No valid rows to import.">
                <Column field="rowNumber" header="Row" style={{ width: '5rem' }} />
                <Column field="title" header="Title" />
                <Column field="moduleName" header="Module" body={(row: any) => row.moduleName ?? '-'} />
                <Column field="priority" header="Priority" />
                <Column field="targetRole" header="Target Role" body={(row: any) => row.targetRole ?? '-'} />
              </DataTable>
              <Button label={`Import ${csvValidRows.length} Test Case${csvValidRows.length !== 1 ? 's' : ''}`} size="small" loading={csvImporting} disabled={csvValidRows.length === 0} onClick={handleImportCsv} />
            </>
          )}
        </div>
      </Dialog>
    </div>
  );
}
