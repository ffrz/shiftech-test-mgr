import { useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Tag } from 'primereact/tag';
import { Button } from 'primereact/button';
import { TabView, TabPanel } from 'primereact/tabview';
import { Dropdown } from 'primereact/dropdown';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Toast } from 'primereact/toast';
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
import { useScreenSize } from '../../hooks/useScreenSize';
import { TEST_PLAN_STATUS_LABEL, TEST_PLAN_STATUS_SEVERITY } from '../../helpers/statusLabels';
import { PlanTestCasesTab } from './components/tabs/PlanTestCasesTab';
import { PlanTestRunsTab } from './components/tabs/PlanTestRunsTab';
import { AddCaseToPlanDialog } from './components/dialogs/AddCaseToPlanDialog';
import { StartTestRunDialog } from './components/dialogs/StartTestRunDialog';
import { DuplicateTestPlanDialog } from './components/dialogs/DuplicateTestPlanDialog';

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
  const isCaseFilterActive = Boolean(
    caseSearch.trim() || casePriorityFilters.length > 0 || caseModuleFilters.length > 0 || caseTagFilters.length > 0,
  );

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

  function resetCaseFilters() {
    setCaseSearch('');
    setCasePriorityFilters([]);
    setCaseModuleFilters([]);
    setCaseTagFilters([]);
    resetCasePage();
    setSelectedCases([]);
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

  async function swapCases(a: { id: string; order: number }, b: { id: string; order: number }) {
    await testPlanService.swapCaseOrder(a, b);
    await reloadCases();
  }

  // At a page boundary, the neighbor isn't in the loaded `cases` slice -- fetch it by
  // plan-wide order sequence (ignores active filters, since sequence is plan-wide) instead of
  // paginating over.
  async function handleMoveUp(index: number) {
    if (!testPlan) return;
    if (index > 0) {
      await swapCases(cases[index - 1], cases[index]);
      return;
    }
    const current = cases[index];
    const prev = await testPlanService.findAdjacentCase(testPlan.id, current.order, 'before');
    if (!prev) return;
    await swapCases(prev, current);
  }

  async function handleMoveDown(index: number) {
    if (!testPlan) return;
    if (index < cases.length - 1) {
      await swapCases(cases[index], cases[index + 1]);
      return;
    }
    const current = cases[index];
    const next = await testPlanService.findAdjacentCase(testPlan.id, current.order, 'after');
    if (!next) return;
    await swapCases(current, next);
  }

  // --- Test Run ---
  const [runDialogOpen, setRunDialogOpen] = useState(false);
  const [runName, setRunName] = useState('');
  const [runError, setRunError] = useState<string | null>(null);

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

      <DuplicateTestPlanDialog
        visible={duplicateDialogOpen}
        onHide={() => setDuplicateDialogOpen(false)}
        name={duplicateName}
        onNameChange={setDuplicateName}
        error={duplicateError}
        onDuplicate={handleDuplicate}
      />

      <TabView>
        <TabPanel header="Test Cases">
          <PlanTestCasesTab
            cases={cases}
            totalCases={totalCases}
            loading={casesLoading}
            isMobile={isMobile}
            canEditContent={canEditContent}
            isFilterActive={isCaseFilterActive}
            projectId={testPlan?.projectId}
            modules={modules}
            tags={tags}
            filterVisible={caseFilterVisible}
            onToggleFilterVisible={() => setCaseFilterVisible(!caseFilterVisible)}
            search={caseSearch}
            onSearchChange={(v) => { setCaseSearch(v); resetCasePage(); }}
            priorityFilters={casePriorityFilters}
            onPriorityFiltersChange={(v) => { setCasePriorityFilters(v); resetCasePage(); }}
            moduleFilters={caseModuleFilters}
            onModuleFiltersChange={(v) => { setCaseModuleFilters(v); resetCasePage(); }}
            tagFilters={caseTagFilters}
            onTagFiltersChange={(v) => { setCaseTagFilters(v); resetCasePage(); }}
            onResetFilters={resetCaseFilters}
            first={caseFirst}
            rows={caseRows}
            onPage={(first, rows) => { setCaseFirst(first); setCaseRows(rows); }}
            selected={selectedCases}
            onSelectedChange={setSelectedCases}
            onAddCase={openAddCaseDialog}
            onBulkRemove={handleBulkRemoveCases}
            onMoveUp={handleMoveUp}
            onMoveDown={handleMoveDown}
            onRemove={handleRemoveCase}
          />
        </TabPanel>
        <TabPanel header="Test Runs">
          <PlanTestRunsTab
            testRuns={testRuns}
            total={totalRuns}
            loading={runsLoading}
            isMobile={isMobile}
            canRunTests={canRunTests}
            canDeleteContent={canDeleteContent}
            filterVisible={runFilterVisible}
            onToggleFilterVisible={() => setRunFilterVisible(!runFilterVisible)}
            search={runSearch}
            onSearchChange={(v) => { setRunSearch(v); setRunFirst(0); }}
            statusFilters={runStatusFilters}
            onStatusFiltersChange={(v) => { setRunStatusFilters(v); setRunFirst(0); }}
            onResetFilters={() => { setRunSearch(''); setRunStatusFilters([]); setRunFirst(0); }}
            first={runFirst}
            rows={runRows}
            onPage={(first, rows) => { setRunFirst(first); setRunRows(rows); }}
            onStartRun={openStartRunDialog}
            onDeleteRun={handleDeleteRun}
          />
        </TabPanel>
      </TabView>

      <AddCaseToPlanDialog
        visible={addCaseDialogOpen}
        onHide={() => setAddCaseDialogOpen(false)}
        availableCases={availableCases}
        selectedCaseIds={selectedCaseIds}
        onSelectedCaseIdsChange={setSelectedCaseIds}
        onAdd={handleAddCases}
      />

      <StartTestRunDialog
        visible={runDialogOpen}
        onHide={() => setRunDialogOpen(false)}
        name={runName}
        onNameChange={setRunName}
        error={runError}
        onStart={handleStartRun}
      />
    </div>
  );
}
