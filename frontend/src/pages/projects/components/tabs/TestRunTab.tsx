import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from 'primereact/button';
import { DataTable, type DataTableStateEvent } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { MultiSelect } from 'primereact/multiselect';
import { InputText } from 'primereact/inputtext';
import { Tag } from 'primereact/tag';
import SearchInput from '../../../../components/ui/SearchInput';
import { FilterToolbar } from '../../../../components/ui/FilterToolbar';
import { RowActionsMenu } from '../../../../components/ui/RowActionsMenu';
import { BulkActionsBar } from '../../../../components/ui/BulkActionsBar';
import { dataTablePaginatorProps } from '../../../../components/ui/dataTablePaginator';
import { useTableHeight } from '../../../../hooks/useTableHeight';
import { testRunService } from '../../../../services/testRunService';
import { useAuthContext } from '../../../../hooks/useAuth';
import type { TestRun, TestRunStatus } from '../../../../types/domain';
import { formatDateTime } from '../../../../helpers/dateFormatter';
import { TEST_RUN_STATUS_LABEL, TEST_RUN_STATUS_SEVERITY, TEST_RESULT_STATUS_SEVERITY } from '../../../../helpers/statusLabels';

const TEST_RUN_STATUS_OPTIONS: { label: string; value: TestRunStatus }[] = (
  ['in_progress', 'completed'] as const
).map((v) => ({ label: TEST_RUN_STATUS_LABEL[v], value: v }));

export type TestRunWithSummary = TestRun & {
  testPlanName: string | null;
  testPlanCode: string | null;
  total: number;
  pass: number;
  fail: number;
  testers: { id: string; fullName: string | null }[];
};

type TestRunTabProps = {
  runs: TestRunWithSummary[];
  loading: boolean;
  isMobile: boolean;
  /** True while this tab's TabView panel is the active one — hidden panels are kept
   * mounted by PrimeReact, so table-height measurement must be skipped until visible. */
  visible: boolean;
  /** Project detail section collapsed state (mobile-first collapse) — feeds table-height re-measure. */
  detailCollapsed: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: TestRunStatus[];
  onStatusFilterChange: (value: TestRunStatus[]) => void;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  sortField: string;
  sortOrder: 1 | -1;
  onSort: (e: DataTableStateEvent) => void;
  selected: TestRunWithSummary[];
  onSelectedChange: (value: TestRunWithSummary[]) => void;
  canRunTests: boolean;
  canDeleteContent: boolean;
  onCreate: () => void;
  onDelete: (row: TestRunWithSummary) => void;
  onBulkDelete: () => void;
  onRowClick: (row: TestRunWithSummary) => void;
  onPlanLinkClick: (planId: string) => void;
};

export function TestRunTab({
  runs,
  loading,
  isMobile,
  visible,
  detailCollapsed,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  hasActiveFilters,
  onClearFilters,
  sortField,
  sortOrder,
  onSort,
  selected,
  onSelectedChange,
  canRunTests,
  canDeleteContent,
  onCreate,
  onDelete,
  onBulkDelete,
  onRowClick,
  onPlanLinkClick,
}: TestRunTabProps) {
  const navigate = useNavigate();
  const { user } = useAuthContext();

  // Mirrors the FilterToolbar's own visibility (initial: hidden on mobile, per the
  // responsive toolbars) and drives table re-measurement when it toggles.
  const [filterVisible, setFilterVisible] = useState(!isMobile);
  const { containerRef, tableHeight } = useTableHeight({
    enabled: isMobile,
    deps: [isMobile, detailCollapsed, visible, filterVisible, selected.length],
  });

  const [editingName, setEditingName] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const editNameRef = useRef<HTMLInputElement>(null);

  const startEditName = useCallback((row: TestRunWithSummary) => {
    setEditingName(row.id);
    setEditValue(row.name);
    setTimeout(() => editNameRef.current?.focus(), 0);
  }, []);

  const cancelEditName = useCallback(() => {
    setEditingName(null);
    setEditValue('');
  }, []);

  async function confirmEditName(row: TestRunWithSummary) {
    const newName = editValue.trim();
    if (!newName) { cancelEditName(); return; }
    if (newName === row.name) { cancelEditName(); return; }
    try {
      await testRunService.rename(row.id, { name: newName, code: row.code }, { projectId: row.projectId, actorId: user?.id });
    } catch { /* ignore */ }
    cancelEditName();
  }
  const mobileRunBody = (row: TestRunWithSummary) => (
    <div className="flex flex-column gap-1">
      <div className="font-medium">{row.name}</div>
      <div className="text-sm text-color-secondary">{row.code}</div>
      <div className="flex gap-1 align-items-center text-sm">
        <Tag value={TEST_RUN_STATUS_LABEL[row.status]} severity={TEST_RUN_STATUS_SEVERITY[row.status]} />
      </div>
      <div className="text-sm text-color-secondary">{row.pass} passed / {row.fail} failed</div>
      <div className="text-sm text-color-secondary">
        Tester: {row.testers.length > 0 ? row.testers.map((t) => t.fullName ?? t.id).join(', ') : '-'}
      </div>
      <div className="text-sm text-color-secondary">
        {row.completedAt ? formatDateTime(row.completedAt) : '-'}
      </div>
    </div>
  );

  return (
    <>
      <FilterToolbar
        visible={canRunTests}
        primaryAction={<Button label="Create Test Run" icon="pi pi-plus" size="small" onClick={onCreate} />}
        onVisibilityChange={setFilterVisible}
      >
        <div className="col-12 md:col-2 p-1">
          <MultiSelect
            value={statusFilter}
            options={TEST_RUN_STATUS_OPTIONS}
            onChange={(e) => onStatusFilterChange(e.value)}
            placeholder="All Statuses"
            className="w-full"
            selectAll
            selectAllLabel="All"
          />
        </div>
        <div className="col-12 md:col p-1">
          <div className="flex gap-2">
            <SearchInput value={search} onChange={onSearchChange} placeholder="Search name/code..." className="flex-1" />
            <Button
              icon="pi pi-refresh"
              outlined
              severity="secondary"
              size="small"
              disabled={!hasActiveFilters}
              onClick={onClearFilters}
              tooltip="Reset filters"
              tooltipOptions={{ position: 'bottom' }}
            />
          </div>
        </div>
      </FilterToolbar>
      {canDeleteContent && (
        <BulkActionsBar
          selectedCount={selected.length}
          onClear={() => onSelectedChange([])}
          actions={<Button label="Delete Selected" icon="pi pi-trash" size="small" severity="danger" outlined onClick={onBulkDelete} />}
        />
      )}
      <div ref={containerRef}>
      <DataTable
        value={runs}
        loading={loading}
        size="small"
        emptyMessage="No test runs yet"
        onRowClick={isMobile ? (e) => onRowClick(e.data as TestRunWithSummary) : undefined}
        rowHover
        {...dataTablePaginatorProps}
        scrollHeight={tableHeight}
        rows={10} rowsPerPageOptions={[5, 10, 25, 50]}
        sortField={isMobile ? undefined : sortField}
        sortOrder={isMobile ? undefined : sortOrder}
        onSort={isMobile ? undefined : onSort}
        selection={selected}
        onSelectionChange={(e: any) => onSelectedChange(e.value as TestRunWithSummary[])}
        dataKey="id"
        selectionMode={isMobile ? null : 'checkbox'}
        cellMemo={false}
      >
        <Column selectionMode="multiple" style={{ width: '3rem' }} hidden={isMobile} />
        <Column field="code" header="Code" sortable style={{ width: '7rem' }} hidden={isMobile}
          className="dt-code-nowrap" headerClassName="dt-code-nowrap"
          body={(row: TestRunWithSummary) => <a className="entity-link" href={`/test-runs/${row.id}`} onClick={(e) => { e.preventDefault(); navigate(`/test-runs/${row.id}`); }}>{row.code}</a>} />
        <Column field="name" header="Name" sortable={!isMobile} className="dt-title-fill" headerClassName="dt-title-fill" body={isMobile ? mobileRunBody : (row: TestRunWithSummary) => {
          if (editingName === row.id) {
            return (
              <div onKeyDown={(e) => { if (e.key === 'Enter') confirmEditName(row); else if (e.key === 'Escape') cancelEditName(); }}>
                <InputText ref={editNameRef} value={editValue} onChange={(e) => setEditValue(e.target.value)}
                  onBlur={() => confirmEditName(row)} autoFocus className="w-full" />
              </div>
            );
          }
          return <div onClick={(e) => { e.stopPropagation(); startEditName(row); }} style={{ cursor: 'pointer' }}>{row.name}</div>;
        }} />
        <Column
          header="Test Plan"
          field="testPlanName"
          sortable
          hidden={isMobile}
          style={{ width: '12rem' }}
          body={(row: TestRunWithSummary) =>
            row.testPlanId ? (
              <a
                className="entity-link"
                onClick={(e) => {
                  e.stopPropagation();
                  onPlanLinkClick(row.testPlanId!);
                }}
              >
                {row.testPlanCode ? `${row.testPlanCode} — ` : ''}{row.testPlanName}
              </a>
            ) : (
              <Tag value="Unplanned" severity="secondary" />
            )
          }
        />
        <Column field="status" header="Status" sortable hidden={isMobile} style={{ width: '7rem' }} body={(row: TestRun) => <Tag value={TEST_RUN_STATUS_LABEL[row.status]} severity={TEST_RUN_STATUS_SEVERITY[row.status]} />} />
        <Column
          header="Result"
          hidden={isMobile}
          style={{ width: '8rem' }}
          body={(row: TestRunWithSummary) => (
            <div className="flex gap-1 align-items-center">
              <Tag value={String(row.pass)} severity={TEST_RESULT_STATUS_SEVERITY.pass} />
              <Tag value={String(row.fail)} severity={TEST_RESULT_STATUS_SEVERITY.fail} />
              <span className="text-color-secondary text-sm">/{row.total}</span>
            </div>
          )}
        />
        <Column
          header="Tester"
          hidden={isMobile}
          style={{ width: '11rem' }}
          body={(row: TestRunWithSummary) => (row.testers.length > 0 ? row.testers.map((t) => t.fullName ?? t.id).join(', ') : '-')}
        />
        <Column field="completedAt" header="Completed" sortable hidden={isMobile} style={{ width: '11rem' }} body={(row: TestRun) => (row.completedAt ? formatDateTime(row.completedAt) : '-')} />
        <Column
          header=""
          style={{ width: '3.5rem' }}
          body={(row: TestRunWithSummary) => (
            <RowActionsMenu
              items={[
                { label: 'Detail', icon: 'pi pi-eye', command: () => onRowClick(row) },
                ...(canDeleteContent
                  ? [{ label: 'Delete', icon: 'pi pi-trash', className: 'p-error', command: () => onDelete(row) }]
                  : []),
              ]}
            />
          )}
        />
      </DataTable>
      </div>
    </>
  );
}
