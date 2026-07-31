import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Tag } from 'primereact/tag';
import { Button } from 'primereact/button';
import { TabView, TabPanel } from 'primereact/tabview';
import { Card } from 'primereact/card';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { useAuthContext } from '../../hooks/useAuth';
import { useTestPlanDetail } from '../../hooks/useTestPlanDetail';
import { useTestRuns } from '../../hooks/useTestRuns';
import { testPlanService } from '../../services/testPlanService';
import { testCaseService } from '../../services/testCaseService';
import { testRunService } from '../../services/testRunService';
import { moduleService } from '../../services/moduleService';
import { tagService } from '../../services/tagService';
import type { TestCase, TestCasePriority, TestPlanCaseWithDetails, TestPlanStatus, TestRun, TestRunStatus } from '../../types/domain';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import { ActivityPanel } from '../../components/ui/ActivityPanel';
import { UserHoverCard } from '../../components/ui/UserHoverCard';
import { profileRepository } from '../../repositories/profileRepository';
import { formatDateTime } from '../../helpers/dateFormatter';
import { TestPlanDialog } from '../../components/dialogs/TestPlanDialog';
import { projectService } from '../../services/projectService';
import { useProjectRole } from '../../hooks/useProjectRole';
import { useProjectBreadcrumbItems } from '../../hooks/useProjectBreadcrumbItems';
import { queryKeys } from '../../hooks/queryKeys';
import { useScreenSize } from '../../hooks/useScreenSize';
import { TEST_PLAN_STATUS_LABEL, TEST_PLAN_STATUS_SEVERITY } from '../../helpers/statusLabels';
import { PlanTestCasesTab } from './components/tabs/PlanTestCasesTab';
import { PlanTestRunsTab } from './components/tabs/PlanTestRunsTab';
import { AddCaseToPlanDialog } from './components/dialogs/AddCaseToPlanDialog';
import { StartTestRunDialog } from './components/dialogs/StartTestRunDialog';
import { toastHelper } from '../../helpers/toast';

export function TestPlanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const queryClient = useQueryClient();
  const { data: testPlan = null } = useQuery({
    queryKey: queryKeys.testPlan(id ?? ''),
    queryFn: () => testPlanService.getById(id!),
    enabled: !!id,
  });
  const { canEditContent, canDeleteContent, canRunTests } = useProjectRole(testPlan?.projectId);
  const { user, profile: viewerProfile } = useAuthContext();

  const { lt } = useScreenSize();
  const isMobile = lt.sm;
  const [detailCollapsed, setDetailCollapsed] = useState(false);

  // --- Edit Test Plan dialog ---
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [planCode, setPlanCode] = useState('');
  const [planName, setPlanName] = useState('');
  const [planDescription, setPlanDescription] = useState('');
  const [planStatus, setPlanStatus] = useState<TestPlanStatus>('draft');
  const [planError, setPlanError] = useState<string | null>(null);

  function openEditPlanDialog() {
    if (!testPlan) return;
    setPlanCode(testPlan.code);
    setPlanName(testPlan.name);
    setPlanDescription(testPlan.description ?? '');
    setPlanStatus(testPlan.status);
    setPlanError(null);
    setPlanDialogOpen(true);
  }

  async function handleSavePlanEdit() {
    if (!testPlan) return;
    setPlanError(null);
    try {
      const updated = await testPlanService.update(testPlan.id, { name: planName, description: planDescription, code: planCode, status: planStatus });
      queryClient.setQueryData(queryKeys.testPlan(testPlan.id), updated);
      setPlanDialogOpen(false);
      toastHelper.success('Test plan updated');
    } catch (err) {
      setPlanError(err instanceof Error ? err.message : 'Failed to save test plan');
    }
  }

  const { data: project } = useQuery({
    queryKey: queryKeys.project(testPlan?.projectId ?? ''),
    queryFn: () => projectService.getById(testPlan!.projectId),
    enabled: !!testPlan?.projectId,
  });
  const projectBreadcrumbItems = useProjectBreadcrumbItems(project?.name, project?.ownerId, testPlan?.projectId ? `/projects/${testPlan.projectId}` : undefined);

  const { data: fetchedAuthorProfile = null } = useQuery({
    queryKey: queryKeys.profile(testPlan?.createdBy ?? ''),
    queryFn: () => profileRepository.findById(testPlan!.createdBy!),
    enabled: !!testPlan?.createdBy,
  });
  // Plans created before the created_by column existed have no recorded author — fall
  // back to whoever is currently viewing rather than showing nothing.
  const authorId = testPlan?.createdBy ?? user?.id ?? null;
  const authorProfile = fetchedAuthorProfile ?? viewerProfile;

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
    toastHelper.success('Test case added to plan');
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
        toastHelper.success('Selected test cases removed from plan');
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
    if (testPlan?.status === 'draft' || testPlan?.status === 'archived') {
      confirmDialog({
        header: 'Test Plan Belum Siap',
        message:
          testPlan.status === 'draft'
            ? 'Test plan ini masih berstatus Draft. Test run yang dibuat dari plan draft bisa saja belum final. Lanjutkan membuat test run?'
            : 'Test plan ini sudah diarsipkan. Biasanya test plan archived tidak dites lagi. Lanjutkan membuat test run?',
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: 'Lanjutkan',
        rejectLabel: 'Batal',
        acceptClassName: 'p-button-warning',
        accept: () => actuallyOpenStartRunDialog(),
      });
      return;
    }
    actuallyOpenStartRunDialog();
  }

  function actuallyOpenStartRunDialog() {
    setRunName(`Run ${new Date().toLocaleDateString('id-ID')}`);
    setRunError(null);
    setRunDialogOpen(true);
  }

  async function handleStartRun() {
    if (!id) return;
    setRunError(null);
    try {
      const run = await testRunService.start(id, runName, undefined, user?.id ?? null);
      setRunDialogOpen(false);
      await reloadRuns();
      if (testPlan) await queryClient.invalidateQueries({ queryKey: queryKeys.testRunsByProject(testPlan.projectId) });
      navigate(`/test-runs/${run.id}`);
    } catch (err) {
      setRunError(err instanceof Error ? err.message : 'Failed to start test run');
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
        toastHelper.success('Test run deleted');
      },
    });
  }

  return (
    <div>
      <ConfirmDialog />

      <Breadcrumb
        items={[
          { label: 'Projects', path: '/projects' },
          ...projectBreadcrumbItems,
          { label: testPlan ? 'Test Plans' : '', path: testPlan ? `/projects/${testPlan.projectId}?tab=testPlans` : undefined },
          { label: testPlan ? testPlan.code : '' },
        ]}
      />

      <Card className="mb-3">
        <div className="flex align-items-center justify-content-between gap-2">
          <div className="min-w-0 flex flex-column gap-1">
            <h2 className="m-0 white-space-nowrap overflow-hidden text-overflow-ellipsis">
              {testPlan ? `${testPlan.code} — ${testPlan.name}` : 'Test Plan Detail'}
            </h2>
          </div>
          <div className="flex gap-2 flex-shrink-0 header-actions">
            {testPlan && canEditContent && (
              <Button icon="pi pi-pencil" text rounded severity="secondary" size="small" onClick={openEditPlanDialog} />
            )}
            <Button
              text
              icon={detailCollapsed ? 'pi pi-chevron-down' : 'pi pi-chevron-up'}
              rounded
              size="small"
              onClick={() => setDetailCollapsed(!detailCollapsed)}
              aria-label={detailCollapsed ? 'Expand' : 'Collapse'}
            />
          </div>
        </div>

        {!detailCollapsed && testPlan && (
          <>
            <div>
              {testPlan && <Tag value={TEST_PLAN_STATUS_LABEL[testPlan.status]} severity={TEST_PLAN_STATUS_SEVERITY[testPlan.status]} />}
            </div>
            {testPlan.description && (
              <p className="text-sm text-color-secondary mt-2 mb-0">{testPlan.description}</p>
            )}

            <div className="flex flex-wrap column-gap-4 row-gap-1 mt-3 mb-0 text-xs">
              {authorId && authorProfile && (
                <span className="text-color-secondary">
                  <i className="pi pi-user mr-1" style={{ fontSize: '0.75rem' }} />
                  Created by{' '}
                  <UserHoverCard userId={authorId}>
                    <span className="text-color entity-link">{authorProfile.username}</span>
                  </UserHoverCard>
                </span>
              )}
              <span className="text-color-secondary">
                <i className="pi pi-calendar-plus mr-1" style={{ fontSize: '0.75rem' }} />
                Created <span className="text-color">{formatDateTime(testPlan.createdAt)}</span>
              </span>
              <span className="text-color-secondary">
                <i className="pi pi-clock mr-1" style={{ fontSize: '0.75rem' }} />
                Updated <span className="text-color">{formatDateTime(testPlan.updatedAt)}</span>
              </span>
            </div>
          </>
        )}
      </Card>

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
        <TabPanel header="Activity">
          <ActivityPanel projectId={testPlan?.projectId ?? ''} entityType="test_plan" entityId={testPlan?.id ?? null} />
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

      <TestPlanDialog
        visible={planDialogOpen}
        editing
        code={planCode}
        onCodeChange={setPlanCode}
        name={planName}
        onNameChange={setPlanName}
        description={planDescription}
        onDescriptionChange={setPlanDescription}
        status={planStatus}
        onStatusChange={setPlanStatus}
        error={planError}
        onHide={() => setPlanDialogOpen(false)}
        onSave={handleSavePlanEdit}
      />
    </div>
  );
}
