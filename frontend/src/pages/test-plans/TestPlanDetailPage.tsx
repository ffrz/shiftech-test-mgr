import { useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Tag } from 'primereact/tag';
import { Button } from 'primereact/button';
import { TabView, TabPanel } from 'primereact/tabview';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { IconField } from 'primereact/iconfield';
import { InputIcon } from 'primereact/inputicon';
import { Dropdown } from 'primereact/dropdown';
import { MultiSelect } from 'primereact/multiselect';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Toast } from 'primereact/toast';
import { BulkActionsBar } from '../../components/ui/BulkActionsBar';
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
  const { cases, loading: casesLoading, reload: reloadCases } = useTestPlanDetail(id ?? null);
  const { testRuns, loading: runsLoading, reload: reloadRuns } = useTestRuns(id ?? null);
  const { canEditContent, canDeleteContent, canRunTests } = useProjectRole(testPlan?.projectId);

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

  // --- Test Cases: search/filter ---
  const [caseSearch, setCaseSearch] = useState('');
  const [casePriorityFilter, setCasePriorityFilter] = useState<TestCasePriority | null>(null);
  const [caseModuleFilter, setCaseModuleFilter] = useState<string | null>(null);
  const [caseTagFilter, setCaseTagFilter] = useState<string | null>(null);
  const [selectedCases, setSelectedCases] = useState<TestPlanCaseWithDetails[]>([]);

  const filteredCases = useMemo(() => {
    const q = caseSearch.trim().toLowerCase();
    return cases.filter((c) => {
      if (casePriorityFilter && c.testCase.priority !== casePriorityFilter) return false;
      if (caseModuleFilter && c.testCase.module?.id !== caseModuleFilter) return false;
      if (caseTagFilter && !c.testCase.tags.some((t) => t.id === caseTagFilter)) return false;
      if (q && !c.testCase.title.toLowerCase().includes(q) && !c.testCase.code.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [cases, caseSearch, casePriorityFilter, caseModuleFilter, caseTagFilter]);

  // --- Test Runs: search/filter ---
  const [runSearch, setRunSearch] = useState('');
  const [runStatusFilter, setRunStatusFilter] = useState<TestRunStatus | null>(null);

  const filteredRuns = useMemo(() => {
    const q = runSearch.trim().toLowerCase();
    return testRuns.filter((r) => {
      if (runStatusFilter && r.status !== runStatusFilter) return false;
      if (q && !r.name.toLowerCase().includes(q) && !r.code.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [testRuns, runSearch, runStatusFilter]);

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

  // Sequence is a workflow guide, not an execution constraint — testers can still record
  // results out of order (see docs/PRD.md). Reordering only makes sense against the full,
  // unfiltered list, so it's only enabled when no filter/search is active.
  const isCaseFilterActive = Boolean(caseSearch.trim() || casePriorityFilter || caseModuleFilter || caseTagFilter);

  async function handleReorderCases(newOrder: TestPlanCaseWithDetails[]) {
    await testPlanService.reorderCases(newOrder.map((c) => c.id));
    await reloadCases();
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

  // --- Duplicate: new plan + same scope (same testCaseId rows re-attached, not duplicated) ---
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
      toast.current?.show({ severity: 'success', summary: 'Test plan duplicated' });
      navigate(`/test-plans/${newPlan.id}`);
    } catch (err) {
      setDuplicateError(err instanceof Error ? err.message : 'Failed to duplicate test plan');
    }
  }

  function handleDeleteRun(row: TestRun) {
    confirmDialog({
      header: 'Delete Test Run',
      message: `Test run "${row.name}" will be permanently deleted, including all of its execution results. Continue?`,
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
      <Toast ref={toast} />
      <ConfirmDialog />

      <Breadcrumb
        items={[
          { label: 'Projects', path: '/' },
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
                <Button label="Duplicate" icon="pi pi-copy" size="small" outlined onClick={openDuplicateDialog} />
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
          {duplicateError && <small className="p-error">{duplicateError}</small>}
          <div className="flex flex-column gap-1">
            <label htmlFor="duplicate-plan-name">New Test Plan Name</label>
            <InputText id="duplicate-plan-name" value={duplicateName} onChange={(e) => setDuplicateName(e.target.value)} autoFocus />
          </div>
          <Button label="Duplicate" size="small" onClick={handleDuplicate} />
        </div>
      </Dialog>

      <TabView>
        <TabPanel header="Test Runs">
          <div className="flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
            <div className="flex align-items-center gap-2 flex-wrap">
              <IconField iconPosition="left">
                <InputIcon className="pi pi-search" />
                <InputText value={runSearch} onChange={(e) => setRunSearch(e.target.value)} placeholder="Search name/code..." />
              </IconField>
              <Dropdown
                value={runStatusFilter}
                options={TEST_RUN_STATUS_OPTIONS}
                onChange={(e) => setRunStatusFilter(e.value)}
                placeholder="All Statuses"
                showClear
                className="w-10rem"
              />
            </div>
            {canRunTests && (
              <Button label="Start Test Run" icon="pi pi-play" size="small" onClick={openStartRunDialog} />
            )}
          </div>
          <DataTable
            value={filteredRuns}
            loading={runsLoading}
            paginator
            rows={5}
            emptyMessage="No test runs yet"
            onRowClick={(e) => navigate(`/test-runs/${(e.data as TestRun).id}`)}
            rowHover
            className="cursor-pointer"
            size="small"
          >
            <Column field="code" header="Code" style={{ width: '7rem' }} />
            <Column field="name" header="Run Name" />
            <Column field="status" header="Status" body={(row: TestRun) => <Tag value={TEST_RUN_STATUS_LABEL[row.status]} severity={TEST_RUN_STATUS_SEVERITY[row.status]} />} />
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
            <Column
              header="Tester"
              body={(row: TestRunWithSummary) =>
                row.testers.length > 0
                  ? row.testers.map((t) => t.fullName ?? t.id).join(', ')
                  : '-'
              }
            />
            <Column field="completedAt" header="Completed" body={(row: TestRun) => (row.completedAt ? formatDateTime(row.completedAt) : '-')} />
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
        <TabPanel header="Test Cases">
          <div className="flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
            <div className="flex align-items-center gap-2 flex-wrap">
              <IconField iconPosition="left">
                <InputIcon className="pi pi-search" />
                <InputText value={caseSearch} onChange={(e) => setCaseSearch(e.target.value)} placeholder="Search title/code..." />
              </IconField>
              <Dropdown
                value={casePriorityFilter}
                options={PRIORITY_OPTIONS}
                onChange={(e) => setCasePriorityFilter(e.value)}
                placeholder="All Priorities"
                showClear
                className="w-10rem"
              />
              <Dropdown
                value={caseModuleFilter}
                options={modules.map((m) => ({ label: m.name, value: m.id }))}
                onChange={(e) => setCaseModuleFilter(e.value)}
                placeholder="All Modules"
                showClear
                className="w-10rem"
              />
              <Dropdown
                value={caseTagFilter}
                options={tags.map((t) => ({ label: t.name, value: t.id }))}
                onChange={(e) => setCaseTagFilter(e.value)}
                placeholder="All Tags"
                showClear
                className="w-10rem"
              />
            </div>
            {canEditContent && (
              <Button label="Add Test Case" icon="pi pi-plus" size="small" onClick={openAddCaseDialog} />
            )}
          </div>
          {canEditContent && (
            <BulkActionsBar
              selectedCount={selectedCases.length}
              onClear={() => setSelectedCases([])}
              actions={<Button label="Remove Selected" icon="pi pi-times" size="small" severity="danger" outlined onClick={handleBulkRemoveCases} />}
            />
          )}
          {canEditContent && !isCaseFilterActive && cases.length > 1 && (
            <p className="text-color-secondary text-sm mb-2">
              <i className="pi pi-info-circle mr-1" />
              Drag rows (⠿ icon) to change the execution order — this order is inherited by new Test Runs, but testers can still test out of order.
            </p>
          )}
          {canEditContent && isCaseFilterActive && (
            <p className="text-color-secondary text-sm mb-2">
              <i className="pi pi-info-circle mr-1" />
              Clear the filter/search to change the execution order (reordering only works on the full list).
            </p>
          )}
          <DataTable
            value={filteredCases}
            loading={casesLoading}
            paginator={isCaseFilterActive}
            rows={5}
            emptyMessage="No test cases in this plan yet"
            size="small"
            selection={selectedCases}
            onSelectionChange={(e: { value: TestPlanCaseWithDetails[] }) => setSelectedCases(e.value)}
            dataKey="id"
            selectionMode={canEditContent ? 'checkbox' : null}
            reorderableRows={canEditContent && !isCaseFilterActive}
            onRowReorder={(e) => handleReorderCases(e.value)}
          >
            {canEditContent && !isCaseFilterActive && <Column rowReorder style={{ width: '3rem' }} />}
            {canEditContent && <Column selectionMode="multiple" style={{ width: '3rem' }} />}
            <Column
              field="testCase.code"
              header="Code"
              sortable
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
            <Column field="testCase.title" header="Test Case" sortable />
            <Column field="testCase.module.name" header="Module" sortable body={(row: TestPlanCaseWithDetails) => row.testCase.module?.name ?? '-'} />
            <Column
              header="Tags"
              body={(row: TestPlanCaseWithDetails) => (
                <div className="flex flex-wrap gap-1">
                  {row.testCase.tags.map((t) => (
                    <Tag key={t.id} value={t.name} severity="info" />
                  ))}
                </div>
              )}
            />
            <Column
              field="testCase.priority"
              header="Priority"
              sortable
              body={(row: TestPlanCaseWithDetails) => (
                <Tag value={TEST_CASE_PRIORITY_LABEL[row.testCase.priority]} severity={TEST_CASE_PRIORITY_SEVERITY[row.testCase.priority]} />
              )}
            />
            {canEditContent && (
              <Column
                header=""
                style={{ width: '4rem' }}
                body={(row: TestPlanCaseWithDetails) => (
                  <Button icon="pi pi-times" text rounded size="small" severity="danger" aria-label="Remove" onClick={() => handleRemoveCase(row)} />
                )}
              />
            )}
          </DataTable>
        </TabPanel>
      </TabView>

      {/* --- Add Test Case Dialog --- */}
      <Dialog header="Add Test Case to Plan" visible={addCaseDialogOpen} onHide={() => setAddCaseDialogOpen(false)} style={{ width: '30rem' }}>
        <div className="flex flex-column gap-3">
          <MultiSelect
            value={selectedCaseIds}
            options={availableCases.map((c) => ({ label: `${c.code} — ${c.title}`, value: c.id }))}
            onChange={(e) => setSelectedCaseIds(e.value)}
            placeholder="Select test cases"
            filter
            display="chip"
            className="w-full"
          />
          <Button label="Add" size="small" onClick={handleAddCases} disabled={selectedCaseIds.length === 0} />
        </div>
      </Dialog>

      {/* --- Start Test Run Dialog --- */}
      <Dialog header="Start Test Run" visible={runDialogOpen} onHide={() => setRunDialogOpen(false)} style={{ width: '25rem' }}>
        <div className="flex flex-column gap-3">
          {runError && <small className="p-error">{runError}</small>}
          <div className="flex flex-column gap-1">
            <label htmlFor="run-name">Test Run Name</label>
            <InputText id="run-name" value={runName} onChange={(e) => setRunName(e.target.value)} autoFocus />
          </div>
          <Button label="Start" size="small" onClick={handleStartRun} />
        </div>
      </Dialog>
    </div>
  );
}
