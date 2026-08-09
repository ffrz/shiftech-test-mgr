import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from 'primereact/card';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Tag } from 'primereact/tag';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { MultiSelect } from 'primereact/multiselect';
import { Dropdown } from 'primereact/dropdown';
import { FileUpload, type FileUploadHandlerEvent } from 'primereact/fileupload';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Toast } from 'primereact/toast';
import { useAuthContext } from '../../hooks/useAuth';
import { useScreenSize } from '../../hooks/useScreenSize';
import { testSuiteService } from '../../services/testSuiteService';
import { queryKeys } from '../../hooks/queryKeys';
import type { TestCasePriority, TestSuiteItem, TestSuiteVisibility } from '../../types/domain';
import { FilterToolbar } from '../../components/ui/FilterToolbar';
import SearchInput from '../../components/ui/SearchInput';
import { RowActionsMenu } from '../../components/ui/RowActionsMenu';
import { BulkActionsBar } from '../../components/ui/BulkActionsBar';
import { dataTablePaginatorProps } from '../../components/ui/dataTablePaginator';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import { UserHoverCard } from '../../components/ui/UserHoverCard';
import { useStoredState } from '../../hooks/useStoredState';
import { TestSuiteDialog } from '../../components/dialogs/TestSuiteDialog';
import { TestSuiteItemDialog } from '../../components/dialogs/TestSuiteItemDialog';
import { ImportCasesDialog } from '../projects/components/dialogs/ImportCasesDialog';
import { parseTestCaseCsv, downloadCsvTemplate } from '../../helpers/csvImport';
import { downloadTestSuiteCsv } from '../../helpers/csvExport';
import { TestSuiteDetailPageSkeleton } from './TestSuiteDetailPageSkeleton';
import { RelativeTime } from '../../components/ui/RelativeTime';
import { TEST_CASE_PRIORITY_LABEL, TEST_CASE_PRIORITY_SEVERITY, TEST_SUITE_VISIBILITY_LABEL, TEST_SUITE_VISIBILITY_SEVERITY } from '../../helpers/statusLabels';
import { toastHelper } from '../../helpers/toast';

const UNDO_TIMEOUT_MS = 9000;

const PRIORITY_OPTIONS: { label: string; value: TestCasePriority }[] = (
  ['low', 'medium', 'high', 'critical'] as const
).map((v) => ({ label: TEST_CASE_PRIORITY_LABEL[v], value: v }));

export function TestSuiteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const { lt } = useScreenSize();
  const isMobile = lt.sm;
  const queryClient = useQueryClient();

  const [detailCollapsed, setDetailCollapsed] = useStoredState(`suite-${id ?? '__unknown__'}:detailCollapsed`, false);

  const [moduleFilter, setModuleFilter] = useState<string[]>([]);
  const [priorityFilter, setPriorityFilter] = useState<TestCasePriority[]>([]);
  const [stepTypeFilter, setStepTypeFilter] = useState<string[]>([]);
  const [targetRoleFilter, setTargetRoleFilter] = useState<string[]>([]);
  const [tagFilter, setTagFilter] = useState<string[]>([]);
  const [search, setSearch] = useState('');

  const { data: suite = null, isLoading: suiteLoading } = useQuery({
    queryKey: queryKeys.testSuite(id ?? ''),
    queryFn: () => testSuiteService.getSuite(id!),
    enabled: !!id,
  });

  const isOwner = suite?.ownerId === user?.id;
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);

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
        toastHelper.success(`${selectedItems.length} item(s) deleted`);
      },
    });
  }

  // --- Import from Suite/Project ---
  const [importTemplateDialogOpen, setImportTemplateDialogOpen] = useState(false);
  const [importTemplateLoading, setImportTemplateLoading] = useState(false);

  function openImportTemplateDialog() {
    setImportTemplateDialogOpen(true);
  }

  async function handleImportTemplate(source: { kind: 'suite'; suiteId: string } | { kind: 'project'; projectId: string }, ids: string[]) {
    if (!id || ids.length === 0) return;
    setImportTemplateLoading(true);
    try {
      if (source.kind === 'suite') {
        await testSuiteService.cloneItemsToSuite(id, ids);
      } else {
        await testSuiteService.cloneProjectCasesToSuite(id, ids);
      }
      setImportTemplateDialogOpen(false);
      await reloadItems();
      toastHelper.success(`${ids.length} test case(s) imported`);
    } catch (err) {
      toastHelper.errorFromCatch('Import failed', err);
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
      toastHelper.errorFromCatch('Failed to read file', err);
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
          notes: row.notes ?? undefined,
          orderIndex: existingItems.length + i,
        })),
      );
      setImportCsvDialogOpen(false);
      setCsvParsed(false);
      setCsvValidRows([]);
      setCsvInvalidRows([]);
      await reloadItems();
      toastHelper.success(`${csvValidRows.length} test case(s) imported`);
    } catch (err) {
      toastHelper.errorFromCatch('Import failed', err);
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
          <Button label="Undo" text size="small" className="toast-undo-btn" onClick={() => handleUndo(itemId, changes)} />
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
    if (id) {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.testSuiteItems(id) }),
        queryClient.invalidateQueries({ queryKey: ['testSuiteItem'] }),
      ]);
    }
  }

  const moduleOptions = useMemo(() => {
    const uniq = new Set(items.map((i) => i.moduleName).filter(Boolean));
    return [...uniq].sort().map((v) => ({ label: v, value: v }));
  }, [items]);

  const targetRoleOptions = useMemo(() => {
    const uniq = new Set(items.map((i) => i.targetRole).filter(Boolean));
    return [...uniq].sort().map((v) => ({ label: v, value: v }));
  }, [items]);

  const tagOptions = useMemo(() => {
    const uniq = new Set(items.flatMap((i) => i.tagNames));
    return [...uniq].sort().map((v) => ({ label: v, value: v }));
  }, [items]);

  const STEP_TYPE_OPTIONS = [
    { label: 'Simple', value: 'simple' },
    { label: 'Detailed', value: 'detailed' },
  ];

  const itemMatchesFilters = useCallback((item: TestSuiteItem): boolean => {
    if (moduleFilter.length && item.moduleName && !moduleFilter.includes(item.moduleName)) return false;
    if (priorityFilter.length && !priorityFilter.includes(item.priority)) return false;
    if (stepTypeFilter.length && !stepTypeFilter.includes(item.stepType)) return false;
    if (targetRoleFilter.length && item.targetRole && !targetRoleFilter.includes(item.targetRole)) return false;
    if (tagFilter.length && !item.tagNames.some((t) => tagFilter.includes(t))) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!item.title.toLowerCase().includes(q) && !(item.moduleName?.toLowerCase().includes(q))) return false;
    }
    return true;
  }, [moduleFilter, priorityFilter, stepTypeFilter, targetRoleFilter, tagFilter, search]);

  const filteredItems = useMemo(() => items.filter(itemMatchesFilters), [items, itemMatchesFilters]);

  const hasActiveFilters = moduleFilter.length > 0 || priorityFilter.length > 0 || stepTypeFilter.length > 0 || targetRoleFilter.length > 0 || tagFilter.length > 0 || search.length > 0;

  async function handleExportCsv() {
    if (!id) return;
    const withSteps = await testSuiteService.getItemsWithSteps(id);
    const exportItems = withSteps.filter(itemMatchesFilters);
    if (exportItems.length === 0) {
      toastHelper.warn('No test cases to export with the current filters');
      return;
    }
    downloadTestSuiteCsv(exportItems, suite?.name ?? 'test-suite');
    toastHelper.success(`Exported ${exportItems.length} test case(s)`);
  }

  async function handleDuplicateSuite(data: { name: string; description: string; visibility: TestSuiteVisibility }) {
    if (!id) return;
    const newSuite = await testSuiteService.duplicateSuite(id, { name: data.name, description: data.description });
    setDuplicateDialogOpen(false);
    toastHelper.success('Suite duplicated');
    navigate(`/test-suites/${newSuite.id}`);
  }

  // --- Item dialog: self-contained in TestSuiteItemDialog (same shape as the project
  // Test Case dialog, minus project-scoped module/tag pickers — suites aren't
  // project-scoped, module/tags are free text here, resolved into real per-project
  // rows only at clone time via testSuiteService.cloneItemsToProject).
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [itemDialogMode, setItemDialogMode] = useState<'create' | 'edit' | 'duplicate'>('create');
  const [editingItem, setEditingItem] = useState<TestSuiteItem | null>(null);

  function openCreateItemDialog() {
    setItemDialogMode('create');
    setEditingItem(null);
    setItemDialogOpen(true);
  }

  function openEditItemDialog(row: TestSuiteItem) {
    setItemDialogMode('edit');
    setEditingItem(row);
    setItemDialogOpen(true);
  }

  function openDuplicateItemDialog(row: TestSuiteItem) {
    setItemDialogMode('duplicate');
    setEditingItem(row);
    setItemDialogOpen(true);
  }

  function handleItemSaved() {
    const summaryMap: Record<string, string> = {
      create: 'Item added',
      edit: 'Item updated',
      duplicate: 'Item duplicated',
    };
    toastHelper.success(summaryMap[itemDialogMode]);
    reloadItems();
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
        toastHelper.success('Item deleted');
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

  if (suiteLoading) return <TestSuiteDetailPageSkeleton />;

  return (
    <div>
      <Toast ref={undoToast} position="bottom-center" />
      <ConfirmDialog />
      <Breadcrumb
        items={[
          { label: 'Test Suite', path: '/test-suites' },
          ...(suite && !isOwner && (suite as any)._authorUsername && (suite as any)._authorUsername !== '—'
            ? [{ label: (suite as any)._authorUsername as string, path: `/@${(suite as any)._authorUsername}` }]
            : []),
          { label: suite ? suite.name : '' },
        ]}
      />

      <Card className="mb-3">
        <div className="flex align-items-center justify-content-between gap-2">
          <div className="flex align-items-center gap-2">
            <h2 className="m-0">{suite?.name ?? ''}</h2>
            {suite && <Tag value={TEST_SUITE_VISIBILITY_LABEL[suite.visibility]} severity={TEST_SUITE_VISIBILITY_SEVERITY[suite.visibility]} />}
          </div>
          <div className="flex align-items-center gap-1 header-actions">
            <Button
              icon="pi pi-copy"
              text
              rounded
              severity="secondary"
              size="small"
              onClick={() => setDuplicateDialogOpen(true)}
              tooltip="Duplicate Suite"
              tooltipOptions={{ position: 'bottom' }}
            />
            {isOwner &&
              <Button
                icon="pi pi-pencil" text rounded severity="secondary" size="small"
                onClick={() => setEditDialogOpen(true)}
                tooltip="Edit Test Suite"
                tooltipOptions={{ position: 'bottom' }} />}
            <Button text icon={detailCollapsed ? 'pi pi-chevron-down' : 'pi pi-chevron-up'} severity="secondary" rounded size="small" onClick={() => setDetailCollapsed(!detailCollapsed)} aria-label={detailCollapsed ? 'Expand' : 'Collapse'} />
          </div>
        </div>
        {!detailCollapsed && (
          <>
            <p className="text-color-secondary text-sm mt-2 mb-0">{suite?.description || 'No description'}</p>
            <div className="flex flex-wrap column-gap-4 row-gap-1 mt-3 mb-0 text-xs">
              <span className="text-color-secondary">
                <i className="pi pi-user mr-1" style={{ fontSize: '0.75rem' }} />
                by{' '}
                {suite?.ownerId ? (
                  <UserHoverCard userId={suite.ownerId}>
                    <span className="text-color entity-link">{(suite as any)?._authorUsername}</span>
                  </UserHoverCard>
                ) : (
                  <span className="text-color">{(suite as any)?._authorUsername}</span>
                )}
              </span>
              <span className="text-color-secondary">
                <i className="pi pi-clock mr-1" style={{ fontSize: '0.75rem' }} />
                Updated {suite && <RelativeTime value={suite.updatedAt} className="text-color" />}
              </span>
            </div>
          </>
        )}
      </Card>

      <FilterToolbar
        visible
        secondaryActions={
          <div className="flex align-items-center">
            {isOwner && (
              <>
                <Button icon="pi pi-copy" rounded size="large" text severity="secondary" onClick={openImportTemplateDialog} tooltip="Advance Import" tooltipOptions={{ position: 'bottom' }} />
                <Button icon="pi pi-file-excel" rounded size="large" text severity="secondary" onClick={() => setImportCsvDialogOpen(true)} tooltip="Import CSV" tooltipOptions={{ position: 'bottom' }} />
              </>
            )}
            <Button icon="pi pi-download" rounded size="large" text severity="secondary" onClick={handleExportCsv} tooltip="Export CSV" tooltipOptions={{ position: 'bottom' }} />
          </div>
        }
        primaryAction={isOwner && <Button label="New Item" icon="pi pi-plus" size="small" onClick={openCreateItemDialog} />}
      >
        <div className="col-6 md:col-2 p-1">
          <MultiSelect value={moduleFilter} options={moduleOptions} onChange={(e) => setModuleFilter(e.value)} placeholder="All Modules" className="w-full" selectAll selectAllLabel="All" virtualScrollerOptions={{ itemSize: 40 }} />
        </div>
        <div className="col-6 md:col-2 p-1">
          <MultiSelect value={priorityFilter} options={PRIORITY_OPTIONS} onChange={(e) => setPriorityFilter(e.value)} placeholder="All Priorities" className="w-full" selectAll selectAllLabel="All" />
        </div>
        <div className="col-6 md:col-2 p-1">
          <MultiSelect value={stepTypeFilter} options={STEP_TYPE_OPTIONS} onChange={(e) => setStepTypeFilter(e.value)} placeholder="All Modes" className="w-full" selectAll selectAllLabel="All" />
        </div>
        <div className="col-6 md:col-2 p-1">
          <MultiSelect value={targetRoleFilter} options={targetRoleOptions} onChange={(e) => setTargetRoleFilter(e.value)} placeholder="All Roles" className="w-full" selectAll selectAllLabel="All" virtualScrollerOptions={{ itemSize: 40 }} />
        </div>
        <div className="col-12 md:col-2 p-1">
          <MultiSelect value={tagFilter} options={tagOptions} onChange={(e) => setTagFilter(e.value)} placeholder="All Tags" className="w-full" selectAll selectAllLabel="All" virtualScrollerOptions={{ itemSize: 40 }} />
        </div>
        <div className="col-12 md:col p-1">
          <div className="flex gap-2">
            <SearchInput value={search} onChange={setSearch} placeholder="Search title/module..." className="flex-1" />
            <Button icon="pi pi-refresh" outlined severity="secondary" size="small" disabled={!hasActiveFilters} onClick={() => { setModuleFilter([]); setPriorityFilter([]); setStepTypeFilter([]); setTargetRoleFilter([]); setTagFilter([]); setSearch(''); }} tooltip="Reset filters" tooltipOptions={{ position: 'bottom' }} />
          </div>
        </div>
      </FilterToolbar>

      {isOwner && (
        <BulkActionsBar
          selectedCount={selectedItems.length}
          onClear={() => setSelectedItems([])}
          actions={<Button label="Delete Selected" icon="pi pi-trash" size="small" severity="danger" outlined onClick={handleBulkDeleteItems} />}
        />
      )}

      <DataTable
        value={filteredItems}
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
        {isOwner && <Column selectionMode="multiple" style={{ width: '3rem' }} hidden={isMobile} />}
        {isMobile
          ? <Column header="Title" body={mobileBodyTemplate} />
          : <Column field="title" header="Title" sortable className="dt-title-fill" headerClassName="dt-title-fill" body={(row: TestSuiteItem) => {
            const isEditing = editingCell?.itemId === row.id && editingCell?.field === 'title';
            if (isEditing && isOwner) {
              return (
                <div ref={editRef} onKeyDown={(e) => handleCellKeyDown(e, row, 'title', editValue)}>
                  <InputText value={editValue ?? ''} onChange={(e) => setEditValue(e.target.value)}
                    onBlur={() => confirmEdit(row, 'title', editValue)} autoFocus className="w-full" />
                </div>
              );
            }
            return <div onClick={(e) => { e.stopPropagation(); isOwner && startEdit(row.id, 'title', row.title); }} style={{ cursor: isOwner ? 'pointer' : undefined }}>{row.title}</div>;
          }} />
        }
        {!isMobile && <Column field="moduleName" header="Module" body={(row: TestSuiteItem) => {
          const isEditing = editingCell?.itemId === row.id && editingCell?.field === 'moduleName';
          if (isEditing && isOwner) {
            return (
              <div ref={editRef} onKeyDown={(e) => handleCellKeyDown(e, row, 'moduleName', editValue)}>
                <InputText value={editValue ?? ''} onChange={(e) => setEditValue(e.target.value)}
                  onBlur={() => confirmEdit(row, 'moduleName', editValue)} autoFocus className="w-full" />
              </div>
            );
          }
          return <div onClick={(e) => { e.stopPropagation(); isOwner && startEdit(row.id, 'moduleName', row.moduleName); }} style={{ cursor: isOwner ? 'pointer' : undefined }}>{row.moduleName || '-'}</div>;
        }} />}
        {!isMobile && <Column field="priority" header="Priority" body={(row: TestSuiteItem) => {
          const isEditing = editingCell?.itemId === row.id && editingCell?.field === 'priority';
          if (isEditing && isOwner) {
            return (
              <div ref={editRef} onKeyDown={(e) => handleCellKeyDown(e, row, 'priority', editValue)}>
                <Dropdown value={editValue as TestCasePriority} options={PRIORITY_OPTIONS}
                  onChange={(e) => confirmEdit(row, 'priority', e.value)}
                  onHide={cancelEdit}
                  autoFocus className="w-10rem" />
              </div>
            );
          }
          return <div onClick={(e) => { e.stopPropagation(); isOwner && startEdit(row.id, 'priority', row.priority); }} style={{ cursor: isOwner ? 'pointer' : undefined }}>
            <Tag value={TEST_CASE_PRIORITY_LABEL[row.priority]} severity={TEST_CASE_PRIORITY_SEVERITY[row.priority]} />
          </div>;
        }} />}
        {!isMobile && <Column field="targetRole" header="Role Target" body={(row: TestSuiteItem) => {
          const isEditing = editingCell?.itemId === row.id && editingCell?.field === 'targetRole';
          if (isEditing && isOwner) {
            return (
              <div ref={editRef} onKeyDown={(e) => handleCellKeyDown(e, row, 'targetRole', editValue)}>
                <InputText value={editValue ?? ''} onChange={(e) => setEditValue(e.target.value)}
                  onBlur={() => confirmEdit(row, 'targetRole', editValue)} autoFocus className="w-full" />
              </div>
            );
          }
          return <div onClick={(e) => { e.stopPropagation(); isOwner && startEdit(row.id, 'targetRole', row.targetRole); }} style={{ cursor: isOwner ? 'pointer' : undefined }}>
            {row.targetRole ? <Tag value={row.targetRole} severity="secondary" /> : '-'}
          </div>;
        }} />}
        {!isMobile && <Column field="stepType" header="Mode" body={(row: TestSuiteItem) => (row.stepType === 'detailed' ? 'Detailed' : 'Simple')} />}
        {isOwner && (
          <Column
            header=""
            style={{ width: '3.5rem' }}
            body={(row: TestSuiteItem) => (
              <RowActionsMenu
                items={[
                  { label: 'View Detail', icon: 'pi pi-external-link', command: () => navigate(`/test-suites/${id}/items/${row.id}`) },
                  { label: 'Duplicate', icon: 'pi pi-copy', command: () => openDuplicateItemDialog(row) },
                  { label: 'Edit', icon: 'pi pi-pencil', command: () => openEditItemDialog(row) },
                  { label: 'Delete', icon: 'pi pi-trash', className: 'p-error', command: () => handleDeleteItem(row) },
                ]}
              />
            )}
          />
        )}
      </DataTable>

      <TestSuiteItemDialog
        visible={itemDialogOpen}
        mode={itemDialogMode}
        item={editingItem}
        suiteId={id ?? ''}
        nextOrderIndex={items.length}
        onHide={() => setItemDialogOpen(false)}
        onSaved={handleItemSaved}
      />

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
          toastHelper.success('Suite updated');
        }}
      />

      <TestSuiteDialog
        visible={duplicateDialogOpen}
        mode="duplicate"
        initialData={suite ? { name: `${suite.name} (Copy)`, description: suite.description, visibility: suite.visibility } : undefined}
        onHide={() => setDuplicateDialogOpen(false)}
        onSave={handleDuplicateSuite}
      />

      <ImportCasesDialog
        visible={importTemplateDialogOpen}
        loading={importTemplateLoading}
        onHide={() => setImportTemplateDialogOpen(false)}
        onImport={handleImportTemplate}
        excludeSuiteId={id}
      />

      <Dialog header="Import from CSV" visible={importCsvDialogOpen} onHide={() => { setImportCsvDialogOpen(false); setCsvParsed(false); setCsvValidRows([]); setCsvInvalidRows([]); }} style={{ width: '40rem' }}>
        <div className="flex flex-column gap-3">
          {!csvParsed && (
            <>
              <p className="text-color-secondary text-sm m-0">
                CSV file with header: Module, Title, Objective, Preconditions, Steps, Expected Result, Priority, Tags,
                Target Role, Notes. Only <strong>Title</strong> is required. Tags are comma-separated.
              </p>
              <Button
                label="Download CSV Template"
                icon="pi pi-download"
                size="small"
                text
                className="p-0 w-fit"
                onClick={downloadCsvTemplate}
              />
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
                <Column field="notes" header="Notes" body={(row: any) => row.notes ?? '-'} />
              </DataTable>
              <Button label={`Import ${csvValidRows.length} Test Case${csvValidRows.length !== 1 ? 's' : ''}`} size="small" loading={csvImporting} disabled={csvValidRows.length === 0} onClick={handleImportCsv} />
            </>
          )}
        </div>
      </Dialog>
    </div>
  );
}
