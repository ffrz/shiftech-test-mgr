import { useNavigate } from 'react-router-dom';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Tag } from 'primereact/tag';
import { Button } from 'primereact/button';
import { MultiSelect } from 'primereact/multiselect';
import SearchInput from '../../../../components/ui/SearchInput';
import { FilterToolbar } from '../../../../components/ui/FilterToolbar';
import { BulkActionsBar } from '../../../../components/ui/BulkActionsBar';
import { dataTablePaginatorProps } from '../../../../components/ui/dataTablePaginator';
import type { Module, Tag as TagEntity, TestCasePriority, TestPlanCaseWithDetails } from '../../../../types/domain';
import { TEST_CASE_PRIORITY_LABEL, TEST_CASE_PRIORITY_SEVERITY } from '../../../../helpers/statusLabels';

const PRIORITY_OPTIONS: { label: string; value: TestCasePriority }[] = [
  { label: TEST_CASE_PRIORITY_LABEL.low, value: 'low' },
  { label: TEST_CASE_PRIORITY_LABEL.medium, value: 'medium' },
  { label: TEST_CASE_PRIORITY_LABEL.high, value: 'high' },
  { label: TEST_CASE_PRIORITY_LABEL.critical, value: 'critical' },
];

type PlanTestCasesTabProps = {
  cases: TestPlanCaseWithDetails[];
  totalCases: number;
  loading: boolean;
  isMobile: boolean;
  canEditContent: boolean;
  isFilterActive: boolean;
  projectId: string | undefined;
  modules: Module[];
  tags: TagEntity[];
  filterVisible: boolean;
  onToggleFilterVisible: () => void;
  search: string;
  onSearchChange: (value: string) => void;
  priorityFilters: TestCasePriority[];
  onPriorityFiltersChange: (value: TestCasePriority[]) => void;
  moduleFilters: string[];
  onModuleFiltersChange: (value: string[]) => void;
  tagFilters: string[];
  onTagFiltersChange: (value: string[]) => void;
  testRoleFilters: string[];
  onTestRoleFiltersChange: (value: string[]) => void;
  testRoleOptions: { label: string; value: string }[];
  onResetFilters: () => void;
  first: number;
  rows: number;
  onPage: (first: number, rows: number) => void;
  selected: TestPlanCaseWithDetails[];
  onSelectedChange: (value: TestPlanCaseWithDetails[]) => void;
  onAddCase: () => void;
  onBulkRemove: () => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onRemove: (row: TestPlanCaseWithDetails) => void;
};

export function PlanTestCasesTab({
  cases,
  totalCases,
  loading,
  isMobile,
  canEditContent,
  isFilterActive,
  projectId,
  modules,
  tags,
  filterVisible,
  onToggleFilterVisible,
  search,
  onSearchChange,
  priorityFilters,
  onPriorityFiltersChange,
  moduleFilters,
  onModuleFiltersChange,
  tagFilters,
  onTagFiltersChange,
  testRoleFilters,
  onTestRoleFiltersChange,
  testRoleOptions,
  onResetFilters,
  first,
  rows,
  onPage,
  selected,
  onSelectedChange,
  onAddCase,
  onBulkRemove,
  onMoveUp,
  onMoveDown,
  onRemove,
}: PlanTestCasesTabProps) {
  const navigate = useNavigate();

  const mobileCaseTitleBody = (row: TestPlanCaseWithDetails) => (
    <div className="flex flex-column gap-2 py-1">
      <span className="font-medium">{row.testCase.title}</span>
      <span className="text-sm text-color-secondary">
        <a className="entity-link" onClick={(e) => { e.stopPropagation(); navigate(`/test-cases/${row.testCase.id}?projectId=${projectId}`); }}>
          {row.testCase.code}
        </a>
      </span>
      <span className="text-sm text-color-secondary">Module: {row.testCase.module?.name ?? '-'}</span>
      <div className="flex flex-wrap gap-1">
        {row.testCase.tags.map((t) => (
          <Tag key={t.id} value={t.name} severity="info" />
        ))}
      </div>
      <div className="flex flex-wrap gap-1">
        {row.testCase.targetRole && <Tag value={row.testCase.targetRole.name} severity="secondary" />}
        <Tag value={TEST_CASE_PRIORITY_LABEL[row.testCase.priority]} severity={TEST_CASE_PRIORITY_SEVERITY[row.testCase.priority]} />
      </div>
    </div>
  );

  return (
    <>
      <FilterToolbar
        visible={canEditContent}
        filterVisible={filterVisible}
        onToggleFilterVisible={onToggleFilterVisible}
        primaryAction={<Button label="Add Test Case" icon="pi pi-plus" size="small" onClick={onAddCase} />}
      >
        <div className="col-12 md:col-2 p-1">
          <MultiSelect
            value={moduleFilters}
            options={modules.map((m) => ({ label: m.name, value: m.id }))}
            onChange={(e) => onModuleFiltersChange(e.value)}
            placeholder="All Modules"
            className="w-full"
            display="chip"
            filter
            virtualScrollerOptions={{ itemSize: 40 }}
          />
        </div>
        <div className="col-12 md:col-2 p-1">
          <MultiSelect
            value={tagFilters}
            options={tags.map((t) => ({ label: t.name, value: t.id }))}
            onChange={(e) => onTagFiltersChange(e.value)}
            placeholder="All Tags"
            className="w-full"
            display="chip"
            filter
            virtualScrollerOptions={{ itemSize: 40 }}
          />
        </div>
        <div className="col-12 md:col-2 p-1">
          <MultiSelect
            value={priorityFilters}
            options={PRIORITY_OPTIONS}
            onChange={(e) => onPriorityFiltersChange(e.value)}
            placeholder="All Priorities"
            className="w-full"
            display="chip"
            selectAllLabel="All"
          />
        </div>
        <div className="col-12 md:col-2 p-1">
          <MultiSelect
            value={testRoleFilters}
            options={testRoleOptions}
            onChange={(e) => onTestRoleFiltersChange(e.value)}
            placeholder="All Roles"
            className="w-full"
            display="chip"
            selectAllLabel="All"
            filter
          />
        </div>
        <div className="col-12 md:col p-1">
          <div className="flex gap-2">
            <SearchInput value={search} onChange={onSearchChange} placeholder="Search title/code..." className="flex-1" />
            <Button icon="pi pi-refresh" size="small" severity="secondary" outlined onClick={onResetFilters} tooltip="Reset filters" tooltipOptions={{ position: 'bottom' }} />
          </div>
        </div>
      </FilterToolbar>
      {canEditContent && (
        <BulkActionsBar
          selectedCount={selected.length}
          onClear={() => onSelectedChange([])}
          actions={<Button label="Remove Selected" icon="pi pi-times" size="small" severity="danger" outlined onClick={onBulkRemove} />}
        />
      )}
      <DataTable
        value={cases}
        loading={loading}
        lazy
        totalRecords={totalCases}
        first={first}
        rows={rows}
        onPage={(e) => onPage(e.first, e.rows)}
        paginator
        paginatorTemplate={dataTablePaginatorProps.paginatorTemplate}
        scrollable={dataTablePaginatorProps.scrollable}
        scrollHeight={dataTablePaginatorProps.scrollHeight}
        rowsPerPageOptions={[5, 10, 25, 50]}
        emptyMessage="No test cases in this plan yet"
        size="small"
        selection={selected}
        onSelectionChange={(e: { value: TestPlanCaseWithDetails[] }) => onSelectedChange(e.value)}
        dataKey="id"
        selectionMode={canEditContent ? 'checkbox' : null}
      >
        {canEditContent && <Column selectionMode="multiple" style={{ width: '3rem' }} />}
        {!isMobile && (
          <Column
            field="testCase.code"
            header="Code"
            style={{ width: '7rem' }}
            body={(row: TestPlanCaseWithDetails) => (
              <a
                className="entity-link"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/test-cases/${row.testCase.id}?projectId=${projectId}`);
                }}
              >
                {row.testCase.code}
              </a>
            )}
          />
        )}
        <Column field="testCase.title" header="Test Case" body={isMobile ? mobileCaseTitleBody : undefined} />
        {!isMobile && <Column field="testCase.module.name" header="Module" body={(row: TestPlanCaseWithDetails) => row.testCase.module?.name ?? '-'} />}
        {!isMobile && (
          <Column
            header="Target Role"
            body={(row: TestPlanCaseWithDetails) =>
              row.testCase.targetRole ? <Tag value={row.testCase.targetRole.name} severity="secondary" /> : '-'
            }
          />
        )}
        {!isMobile && (
          <Column
            header="Tag"
            body={(row: TestPlanCaseWithDetails) => (
              <div className="flex flex-wrap gap-1">
                {row.testCase.tags.map((t) => (
                  <Tag key={t.id} value={t.name} severity="info" />
                ))}
              </div>
            )}
          />
        )}
        {!isMobile && (
          <Column
            field="testCase.priority"
            header="Priority"
            body={(row: TestPlanCaseWithDetails) => (
              <Tag value={TEST_CASE_PRIORITY_LABEL[row.testCase.priority]} severity={TEST_CASE_PRIORITY_SEVERITY[row.testCase.priority]} />
            )}
          />
        )}
        {canEditContent && (
          <Column
            header=""
            style={{ width: isMobile ? '3rem' : '7rem' }}
            body={(row: TestPlanCaseWithDetails) => {
              const idx = cases.indexOf(row);
              const isFirstOverall = first + idx === 0;
              const isLastOverall = first + idx === totalCases - 1;
              const reorderTooltip = isFilterActive ? 'Clear filters to enable ordering' : undefined;
              return (
                <div className="flex flex-column md:flex-row gap-1">
                  {totalCases > 1 && (
                    <>
                      <Button
                        icon="pi pi-angle-up" text rounded size="small" severity="secondary" aria-label="Move up"
                        disabled={isFilterActive || isFirstOverall}
                        onClick={(e) => { e.stopPropagation(); onMoveUp(idx); }}
                        tooltip={reorderTooltip}
                        tooltipOptions={{ position: 'top' }}
                      />
                      <Button
                        icon="pi pi-angle-down" text rounded size="small" severity="secondary" aria-label="Move down"
                        disabled={isFilterActive || isLastOverall}
                        onClick={(e) => { e.stopPropagation(); onMoveDown(idx); }}
                        tooltip={reorderTooltip}
                        tooltipOptions={{ position: 'top' }}
                      />
                    </>
                  )}
                  <Button icon="pi pi-times" text rounded size="small" severity="danger" aria-label="Remove" onClick={(e) => { e.stopPropagation(); onRemove(row); }} />
                </div>
              );
            }}
          />
        )}
      </DataTable>
    </>
  );
}
