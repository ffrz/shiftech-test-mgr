import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Tag } from 'primereact/tag';
import { Button } from 'primereact/button';
import { TabView, TabPanel } from 'primereact/tabview';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import SearchInput from '../../components/ui/SearchInput';
import { MultiSelect } from 'primereact/multiselect';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Toast } from 'primereact/toast';
import { BulkActionsBar } from '../../components/ui/BulkActionsBar';
import { dataTablePaginatorProps } from '../../components/ui/dataTablePaginator';
import { useTestPlanDetail } from '../../hooks/useTestPlanDetail';
import { useTestRuns } from '../../hooks/useTestRuns';
import { testPlanService } from '../../services/testPlanService';
import { testCaseService } from '../../services/testCaseService';
import { testRunService } from '../../services/testRunService';
import { moduleService } from '../../services/moduleService';
import { tagService } from '../../services/tagService';
import type { TestCase, TestCasePriority, TestPlanCaseWithDetails, TestPlanStatus, TestRun, TestRunStatus } from '../../types/domain';
import { PageHeader } from '../../components/ui/PageHeader';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import { projectService } from '../../services/projectService';
import { useProjectRole } from '../../hooks/useProjectRole';
import { queryKeys } from '../../hooks/queryKeys';
import { formatDateTime } from '../../helpers/dateFormatter';
import { useScreenSize } from '../../hooks/useScreenSize';
import {
  TEST_PLAN_STATUS_LABEL,
  TEST_PLAN_STATUS_SEVERITY,
  TEST_RUN_STATUS_LABEL,
  TEST_RUN_STATUS_SEVERITY,
  TEST_RESULT_STATUS_SEVERITY,
  TEST_CASE_PRIORITY_LABEL,
  TEST_CASE_PRIORITY_SEVERITY,
} from '../../helpers/statusLabels';
import type { TestRunWithSummary } from '../../hooks/useTestRuns';

const PRIORITY_OPTIONS: { label: string; value: TestCasePriority }[] = [
  { label: TEST_CASE_PRIORITY_LABEL.low, value: 'low' },
  { label: TEST_CASE_PRIORITY_LABEL.medium, value: 'medium' },
  { label: TEST_CASE_PRIORITY_LABEL.high, value: 'high' },
  { label: TEST_CASE_PRIORITY_LABEL.critical, value: 'critical' },
];

const TEST_RUN_STATUS_OPTIONS: { label: string; value: TestRunStatus }[] = (
  ['in_progress', 'completed'] as const
).map((v) => ({ label: TEST_RUN_STATUS_LABEL[v], value: v }));

const TEST_PLAN_STATUS_OPTIONS: { label: string; value: TestPlanStatus }[] = (
  ['draft', 'active', 'completed', 'archived'] as const
).map((v) => ({ label: TEST_PLAN_STATUS_LABEL[v], value: v }));

export function TestPlanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useRef<Toast>(null);

  const queryClient = useQueryClient();
  const { data: testPlan = null } = useQuery({
    queryKey: queryKeys.testPlan(id ?? ''),
    queryFn: () => testPlanService.getById(id!),
    enabled: !!id,
  });
  const { canEditContent, canDeleteContent, canRunTests } = useProjectRole(testPlan?.projectId);

  const { lt } = useScreenSize();
  const isMobile = lt.sm;

  const { data: project } = useQuery({
    queryKey: queryKeys.project(testPlan?.projectId ?? ''),
    queryFn: () => projectService.getById(testPlan!.projectId),
    enabled: !!testPlan?.projectId,
  });
  const projectName = project?.name ?? null;

  const { data: modules = [] } = useQuery({
    queryKey: queryKeys.modules(testPlan?.projectId ?? ''),
    queryFn: () => moduleService.listByProject(testPlan!.projectId),
    enabled: !!testPlan?.projectId,
  });
  const { data: tags = [] } = useQuery({
    queryKey: queryKeys.tags(testPlan?.projectId ?? ''),
    queryFn: () => tagService.listByProject(testPlan!.projectId),
    enabled: !!testPlan?.projectId,
  });

  // --- Test Runs: search / multi-select filter / server-side pagination ---
  const [runFilterVisible, setRunFilterVisible] = useState(true);
  const [runSearch, setRunSearch] = useState('');
  const [runStatusFilters, setRunStatusFilters] = useState<TestRunStatus[]>([]);
  const [runFirst, setRunFirst] = useState(0);
  const [runRows, setRunRows] = useState(10);

  const runPage = Math.floor(runFirst / runRows) + 1;

  const { testRuns, total: totalRuns, loading: runsLoading, reload: reloadRuns } = useTestRuns(id ?? null, {
    search: runSearch,
    statuses: runStatusFilters.length > 0 ? runStatusFilters : undefined,
    page: runPage,
    rowsPerPage: runRows,
  });

  // --- Test Cases: search / multi-select filter / server-side pagination ---
  const [caseFilterVisible, setCaseFilterVisible] = useState(true);
  const [caseSearch, setCaseSearch] = useState('');
  const [casePriorityFilters, setCasePriorityFilters] = useState<TestCasePriority[]>([]);
  const [caseModuleFilters, setCaseModuleFilters] = useState<string[]>([]);
  const [caseTagFilters, setCaseTagFilters] = useState<string[]>([]);
  const [caseFirst, setCaseFirst] = useState(0);
  const [caseRows, setCaseRows] = useState(10);
  const [selectedCases, setSelectedCases] = useState<TestPlanCaseWithDetails[]>([]);

  const casePage = Math.floor(caseFirst / caseRows) + 1;

  const { cases, total: totalCases, loading: casesLoading, reload: reloadCases } = useTestPlanDetail(id ?? null, {
    search: caseSearch,
    priorities: casePriorityFilters.length > 0 ? casePriorityFilters : undefined,
    moduleIds: caseModuleFilters.length > 0 ? caseModuleFilters : undefined,
    tagIds: caseTagFilters.length > 0 ? caseTagFilters : undefined,
    page: casePage,
    rowsPerPage: caseRows,
  });

  function resetCasePage() {
    setCaseFirst(0);
  }

  // --- Add test case to plan ---
  const [addCaseDialogOpen, setAddCaseDialogOpen] = useState(false);
  const [availableCases, setAvailableCases] = useState<TestCase[]>([]);
  const [selectedCaseIds, setSelectedCaseIds] = useState<string[]>([]);

  async function openAddCaseDialog() {
    if (!testPlan) return;
    const allCases = await testCaseService.listByProject(testPlan.projectId);
    const alreadyInPlan = new Set(cases.map((c) => c.testCaseId));
    setAvailableCases(allCases.filter((c) => c.status === 'active' && !alreadyInPlan.has(c.id)));
    setSelectedCaseIds([]);
    setAddCaseDialogOpen(true);
  }

  async function handleAddCases() {
    if (!id) return;
    await Promise.all(selectedCaseIds.map((testCaseId, index) => testPlanService.addCase(id, testCaseId, cases.length + index)));
    setAddCaseDialogOpen(false);
    await reloadCases();
    toast.current?.show({ severity: 'success', summary: 'Test case added to plan' });
  }

  function handleRemoveCase(row: TestPlanCaseWithDetails) {
    confirmDialog({
      header: 'Remove Test Case',
      message: `Test case "${row.testCase.title}" will be removed from this plan. Continue?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Remove',
      rejectLabel: 'Cancel',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        await testPlanService.removeCase(row.id);
        await reloadCases();
      },
    });
  }

  function handleBulkRemoveCases() {
    confirmDialog({
      header: 'Remove Selected Test Cases',
      message: `${selectedCases.length} test case(s) will be removed from this plan. Continue?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Remove',
      rejectLabel: 'Cancel',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        await Promise.all(selectedCases.map((row) => testPlanService.removeCase(row.id)));
        setSelectedCases([]);
        await reloadCases();
        toast.current?.show({ severity: 'success', summary: 'Selected test cases removed from plan' });
      },
    });
  }

  async function swapCases(a: TestPlanCaseWithDetails, b: TestPlanCaseWithDetails) {
    await testPlanService.swapCaseOrder(a, b);
    await reloadCases();
  }

  function handleMoveUp(index: number) {
    if (index === 0) return;
    swapCases(cases[index - 1], cases[index]);
  }

  function handleMoveDown(index: number) {
    if (index === cases.length - 1) return;
    swapCases(cases[index], cases[index + 1]);
  }

  // --- Test Run ---
  const [runDialogOpen, setRunDialogOpen] = useState(false);
  const [runName, setRunName] = useState('');
  const [runError, setRunError] = useState<string | null>(null);
  const runNameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (runError && runNameRef.current) {
      runNameRef.current.focus();
      runNameRef.current.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
    }
  }, [runError]);

  function openStartRunDialog() {
    setRunName(`Run ${new Date().toLocaleDateString('id-ID')}`);
    setRunError(null);
    setRunDialogOpen(true);
  }

  async function handleStartRun() {
    if (!id) return;
    setRunError(null);
    try {
      const run = await testRunService.start(id, runName);
      setRunDialogOpen(false);
      await reloadRuns();
      if (testPlan) await queryClient.invalidateQueries({ queryKey: queryKeys.testRunsByProject(testPlan.projectId) });
      navigate(`/test-runs/${run.id}`);
    } catch (err) {
      setRunError(err instanceof Error ? err.message : 'Failed to start test run');
    }
  }

  async function handleChangeStatus(status: TestPlanStatus) {
    if (!testPlan || status === testPlan.status) return;
    const updated = await testPlanService.changeStatus(testPlan.id, status);
    queryClient.setQueryData(queryKeys.testPlan(testPlan.id), updated);
    toast.current?.show({ severity: 'success', summary: `Status changed to ${TEST_PLAN_STATUS_LABEL[status]}` });
  }

  // --- Duplicate ---
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [duplicateName, setDuplicateName] = useState('');
  const [duplicateError, setDuplicateError] = useState<string | null>(null);
  const duplicateNameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (duplicateError && duplicateNameRef.current) {
      duplicateNameRef.current.focus();
      duplicateNameRef.current.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
    }
  }, [duplicateError]);

  function openDuplicateDialog() {
    if (!testPlan) return;
    setDuplicateName(`${testPlan.name} (Copy)`);
    setDuplicateError(null);
    setDuplicateDialogOpen(true);
  }

  async function handleDuplicate() {
    if (!testPlan) return;
    setDuplicateError(null);
    try {
      const newPlan = await testPlanService.duplicate(testPlan.id, duplicateName);
      setDuplicateDialogOpen(false);
      await queryClient.invalidateQueries({ queryKey: queryKeys.testPlans(testPlan.projectId) });
      toast.current?.show({ severity: 'success', summary: 'Test plan diduplikat' });
      navigate(`/test-plans/${newPlan.id}`);
    } catch (err) {
      setDuplicateError(err instanceof Error ? err.message : 'Failed to duplicate test plan');
    }
  }

  function handleDeleteRun(row: TestRun) {
    confirmDialog({
      header: 'Delete Test Run',
      message: `Test run "${row.name}" will be permanently deleted, including all execution results. Continue?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        await testRunService.remove(row.id);
        await reloadRuns();
        if (testPlan) await queryClient.invalidateQueries({ queryKey: queryKeys.testRunsByProject(testPlan.projectId) });
        toast.current?.show({ severity: 'success', summary: 'Test run deleted' });
      },
    });
  }

  const mobileRunNameBody = useCallback((row: TestRunWithSummary) => (
    <div className="flex flex-column gap-2 py-1">
      <span className="font-medium">{row.name}</span>
      <span className="text-sm text-color-secondary">{row.code}</span>
      <span><Tag value={TEST_RUN_STATUS_LABEL[row.status]} severity={TEST_RUN_STATUS_SEVERITY[row.status]} /></span>
      <div className="flex gap-1 align-items-center">
        <Tag value={String(row.pass)} severity={TEST_RESULT_STATUS_SEVERITY.pass} />
        <Tag value={String(row.fail)} severity={TEST_RESULT_STATUS_SEVERITY.fail} />
        <span className="text-color-secondary text-sm">/{row.total}</span>
      </div>
      <span className="text-sm text-color-secondary">
        Tester: {row.testers.length > 0 ? row.testers.map((t) => t.fullName ?? t.id).join(', ') : '-'}
      </span>
      <span className="text-sm text-color-secondary">
        Completed: {row.completedAt ? formatDateTime(row.completedAt) : '-'}
      </span>
    </div>
  ), []);

  const mobileCaseTitleBody = useCallback((row: TestPlanCaseWithDetails) => (
    <div className="flex flex-column gap-2 py-1">
      <span className="font-medium">{row.testCase.title}</span>
      <span className="text-sm text-color-secondary">
        <a className="entity-link" onClick={(e) => { e.stopPropagation(); navigate(`/test-cases/${row.testCase.id}?projectId=${testPlan?.projectId}`); }}>
          {row.testCase.code}
        </a>
      </span>
      <span className="text-sm text-color-secondary">Module: {row.testCase.module?.name ?? '-'}</span>
      <div className="flex flex-wrap gap-1">
        {row.testCase.tags.map((t) => (
          <Tag key={t.id} value={t.name} severity="info" />
        ))}
      </div>
      <span><Tag value={TEST_CASE_PRIORITY_LABEL[row.testCase.priority]} severity={TEST_CASE_PRIORITY_SEVERITY[row.testCase.priority]} /></span>
    </div>
  ), []);

  return (
    <div>
      <Toast ref={toast} position="bottom-center" />
      <ConfirmDialog />

      <Breadcrumb
        items={[
          { label: 'Projects', path: '/projects' },
          { label: testPlan ? (projectName ?? '…') : '…', path: testPlan ? `/projects/${testPlan.projectId}` : undefined },
          { label: testPlan ? testPlan.code : '…' },
        ]}
      />

      <PageHeader
        title={testPlan ? `${testPlan.code} — ${testPlan.name}` : 'Test Plan Detail'}
        actions={
          testPlan && (
            <div className="flex align-items-center gap-2">
              {canEditContent && (
                <Button text icon="pi pi-copy" size="small" outlined onClick={openDuplicateDialog} />
              )}
              {canEditContent ? (
                <Dropdown
                  value={testPlan.status}
                  options={TEST_PLAN_STATUS_OPTIONS}
                  onChange={(e) => handleChangeStatus(e.value)}
                  className="w-10rem"
                />
              ) : (
                <Tag value={TEST_PLAN_STATUS_LABEL[testPlan.status]} severity={TEST_PLAN_STATUS_SEVERITY[testPlan.status]} />
              )}
            </div>
          )
        }
      />

      <Dialog header="Duplicate Test Plan" visible={duplicateDialogOpen} onHide={() => setDuplicateDialogOpen(false)} style={{ width: '28rem' }}>
        <div className="flex flex-column gap-3">
          <div className="flex flex-column gap-1">
            <label htmlFor="duplicate-plan-name" className={duplicateError ? 'p-error' : ''}>New Test Plan Name</label>
            <InputText id="duplicate-plan-name" ref={duplicateNameRef} value={duplicateName} onChange={(e) => setDuplicateName(e.target.value)} className={duplicateError ? 'p-invalid' : ''} autoFocus />
            {duplicateError && <small className="p-error">{duplicateError}</small>}
          </div>
          <Button label="Duplicate" size="small" onClick={handleDuplicate} />
        </div>
      </Dialog>

      <TabView>
        <TabPanel header="Test Cases">
          <div className="flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
            <div />
            {canEditContent && (
              <div className="flex gap-2">
                <Button
                  icon={caseFilterVisible ? "pi pi-filter-fill" : "pi pi-filter"}
                  text
                  rounded
                  size="small"
                  severity={caseFilterVisible ? "warning" : "secondary"}
                  onClick={() => setCaseFilterVisible(!caseFilterVisible)}
                  tooltip={caseFilterVisible ? "Hide filters" : "Show filters"}
                  tooltipOptions={{ position: 'bottom' }}
                />
                <Button label="Add Test Case" icon="pi pi-plus" size="small" onClick={openAddCaseDialog} />
              </div>
            )}
          </div>
          {caseFilterVisible && (
            <div className="grid mb-2 p-1">
              <div className="col-12 md:col-2 p-1">
                <MultiSelect
                  value={casePriorityFilters}
                  options={PRIORITY_OPTIONS}
                  onChange={(e) => { setCasePriorityFilters(e.value); resetCasePage(); }}
                  placeholder="All Priorities"
                  className="w-full"
                  display="chip"
                />
              </div>
              <div className="col-12 md:col-2 p-1">
                <MultiSelect
                  value={caseModuleFilters}
                  options={modules.map((m) => ({ label: m.name, value: m.id }))}
                  onChange={(e) => { setCaseModuleFilters(e.value); resetCasePage(); }}
                  placeholder="All Modules"
                  className="w-full"
                  display="chip"
                  filter
                />
              </div>
              <div className="col-12 md:col-2 p-1">
                <MultiSelect
                  value={caseTagFilters}
                  options={tags.map((t) => ({ label: t.name, value: t.id }))}
                  onChange={(e) => { setCaseTagFilters(e.value); resetCasePage(); }}
                  placeholder="All Tags"
                  className="w-full"
                  display="chip"
                  filter
                />
              </div>
              <div className="col-12 md:col p-1">
                <div className="flex gap-2">
                  <SearchInput value={caseSearch} onChange={(v) => { setCaseSearch(v); resetCasePage(); }} placeholder="Search title/code..." className="flex-1" />
                  <Button icon="pi pi-refresh" size="small" severity="secondary" outlined
                    onClick={() => { setCaseSearch(''); setCasePriorityFilters([]); setCaseModuleFilters([]); setCaseTagFilters([]); resetCasePage(); setSelectedCases([]); }}
                    tooltip="Reset filters" />
                </div>
              </div>
            </div>
          )}
          {canEditContent && (
            <BulkActionsBar
              selectedCount={selectedCases.length}
              onClear={() => setSelectedCases([])}
              actions={<Button label="Remove Selected" icon="pi pi-times" size="small" severity="danger" outlined onClick={handleBulkRemoveCases} />}
            />
          )}
          {canEditContent && (
            <p className="text-color-secondary text-sm mb-2">
              <i className="pi pi-info-circle mr-1" />
              Up/Down reordering only applies within the current page.
            </p>
          )}
          <DataTable
            value={cases}
            loading={casesLoading}
            lazy
            totalRecords={totalCases}
            first={caseFirst}
            rows={caseRows}
            onPage={(e) => { setCaseFirst(e.first); setCaseRows(e.rows); }}
            paginator
            paginatorTemplate={dataTablePaginatorProps.paginatorTemplate}
            rowsPerPageOptions={[5, 10, 25, 50]}
            emptyMessage="No test cases in this plan yet"
            size="small"
            selection={selectedCases}
            onSelectionChange={(e: { value: TestPlanCaseWithDetails[] }) => setSelectedCases(e.value)}
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
                      navigate(`/test-cases/${row.testCase.id}?projectId=${testPlan?.projectId}`);
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
                body={(row: TestPlanCaseWithDetails, options: { rowIndex: number }) => {
                  const idx = options.rowIndex;
                  return (
                    <div className="flex flex-column md:flex-row gap-1">
                      {cases.length > 1 && (
                        <>
                          <Button icon="pi pi-angle-up" text rounded size="small" severity="secondary" aria-label="Move up" disabled={idx === 0} onClick={(e) => { e.stopPropagation(); handleMoveUp(idx); }} />
                          <Button icon="pi pi-angle-down" text rounded size="small" severity="secondary" aria-label="Move down" disabled={idx === cases.length - 1} onClick={(e) => { e.stopPropagation(); handleMoveDown(idx); }} />
                        </>
                      )}
                      <Button icon="pi pi-times" text rounded size="small" severity="danger" aria-label="Remove" onClick={(e) => { e.stopPropagation(); handleRemoveCase(row); }} />
                    </div>
                  );
                }}
              />
            )}
          </DataTable>
        </TabPanel>
        <TabPanel header="Test Runs">
          <div className="flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
            <div />
            {canRunTests && (
              <div className="flex gap-2">
                <Button
                  icon={runFilterVisible ? "pi pi-filter-fill" : "pi pi-filter"}
                  text
                  rounded
                  size="small"
                  severity={runFilterVisible ? "warning" : "secondary"}
                  onClick={() => setRunFilterVisible(!runFilterVisible)}
                  tooltip={runFilterVisible ? "Hide filters" : "Show filters"}
                  tooltipOptions={{ position: 'bottom' }}
                />
                <Button label="Start Test Run" icon="pi pi-play" size="small" onClick={openStartRunDialog} />
              </div>
            )}
          </div>
          {runFilterVisible && (
            <div className="grid mb-2 p-1">
              <div className="col-12 md:col-2 p-1">
                <MultiSelect
                  value={runStatusFilters}
                  options={TEST_RUN_STATUS_OPTIONS}
                  onChange={(e) => { setRunStatusFilters(e.value); setRunFirst(0); }}
                  placeholder="All Statuses"
                  className="w-full"
                  display="chip"
                />
              </div>
              <div className="col-12 md:col p-1">
                <div className="flex gap-2">
                  <SearchInput value={runSearch} onChange={(v) => { setRunSearch(v); setRunFirst(0); }} placeholder="Search name/code..." className="flex-1" />
                  <Button icon="pi pi-refresh" outlined size="small" severity="secondary"
                    onClick={() => { setRunSearch(''); setRunStatusFilters([]); setRunFirst(0); }}
                    tooltip="Reset filters" />
                </div>
              </div>
            </div>
          )}
          <DataTable
            value={testRuns}
            loading={runsLoading}
            lazy
            {...dataTablePaginatorProps}
            totalRecords={totalRuns}
            first={runFirst}
            rows={runRows}
            onPage={(e) => { setRunFirst(e.first); setRunRows(e.rows); }}
            rowsPerPageOptions={[5, 10, 25, 50]}
            emptyMessage="No test runs yet"
            onRowClick={(e) => navigate(`/test-runs/${(e.data as TestRun).id}`)}
            rowHover
            className="cursor-pointer"
            size="small"
          >
            {!isMobile && <Column field="code" header="Code" style={{ width: '7rem' }} />}
            <Column field="name" header="Run Name" body={isMobile ? mobileRunNameBody : undefined} />
            {!isMobile && <Column field="status" header="Status" body={(row: TestRun) => <Tag value={TEST_RUN_STATUS_LABEL[row.status]} severity={TEST_RUN_STATUS_SEVERITY[row.status]} />} />}
            {!isMobile && (
              <Column
                header="Results"
                body={(row: TestRunWithSummary) => (
                  <div className="flex gap-1 align-items-center">
                    <Tag value={String(row.pass)} severity={TEST_RESULT_STATUS_SEVERITY.pass} />
                    <Tag value={String(row.fail)} severity={TEST_RESULT_STATUS_SEVERITY.fail} />
                    <span className="text-color-secondary text-sm">/{row.total}</span>
                  </div>
                )}
                sortable
                sortField="pass"
              />
            )}
            {!isMobile && (
              <Column
                header="Tester"
                body={(row: TestRunWithSummary) =>
                  row.testers.length > 0
                    ? row.testers.map((t) => t.fullName ?? t.id).join(', ')
                    : '-'
                }
              />
            )}
            {!isMobile && <Column field="completedAt" header="Completed" body={(row: TestRun) => (row.completedAt ? formatDateTime(row.completedAt) : '-')} />}
            {canDeleteContent && (
              <Column
                header=""
                style={{ width: '4rem' }}
                body={(row: TestRun) => (
                  <Button
                    icon="pi pi-trash"
                    text
                    rounded
                    size="small"
                    severity="danger"
                    aria-label="Delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteRun(row);
                    }}
                  />
                )}
              />
            )}
          </DataTable>
        </TabPanel>
      </TabView>

      <Dialog header="Add Test Case to Plan" visible={addCaseDialogOpen} onHide={() => setAddCaseDialogOpen(false)} style={{ width: '30rem' }}>
        <div className="flex flex-column gap-3">
          <MultiSelect
            value={selectedCaseIds}
            options={availableCases.map((c) => ({ label: `${c.code} — ${c.title}`, value: c.id }))}
            onChange={(e) => setSelectedCaseIds(e.value)}
            placeholder="Select test case"
            filter
            display="chip"
            className="w-full"
          />
          <Button label="Add" size="small" onClick={handleAddCases} disabled={selectedCaseIds.length === 0} />
        </div>
      </Dialog>

      <Dialog header="Start Test Run" visible={runDialogOpen} onHide={() => setRunDialogOpen(false)} style={{ width: '25rem' }}>
        <div className="flex flex-column gap-3">
          <div className="flex flex-column gap-1">
            <label htmlFor="run-name" className={runError ? 'p-error' : ''}>Test Run Name</label>
            <InputText id="run-name" ref={runNameRef} value={runName} onChange={(e) => setRunName(e.target.value)} className={runError ? 'p-invalid' : ''} autoFocus />
            {runError && <small className="p-error">{runError}</small>}
          </div>
          <Button label="Start" size="small" onClick={handleStartRun} />
        </div>
      </Dialog>
    </div>
  );
}
