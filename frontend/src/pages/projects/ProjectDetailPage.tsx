import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from 'primereact/card';
import { Tag } from 'primereact/tag';
import { Button } from 'primereact/button';
import { DataTable, type DataTableStateEvent } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { TabView, TabPanel } from 'primereact/tabview';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Dropdown } from 'primereact/dropdown';
import { MultiSelect } from 'primereact/multiselect';
import { SelectButton } from 'primereact/selectbutton';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Toast } from 'primereact/toast';
import { IconField } from 'primereact/iconfield';
import { InputIcon } from 'primereact/inputicon';
import { RowActionsMenu } from '../../components/ui/RowActionsMenu';
import { BulkActionsBar } from '../../components/ui/BulkActionsBar';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import { ExcelImportPanel } from '../../components/ui/ExcelImportPanel';
import { projectService } from '../../services/projectService';
import { testPlanService } from '../../services/testPlanService';
import { testCaseService } from '../../services/testCaseService';
import { testRunService } from '../../services/testRunService';
import { issueService } from '../../services/issueService';
import { projectMemberService } from '../../services/projectMemberService';
import { moduleService } from '../../services/moduleService';
import { tagService } from '../../services/tagService';
import { testCaseTemplateService } from '../../services/testCaseTemplateService';
import { useProjectRole } from '../../hooks/useProjectRole';
import { useTabQueryParam } from '../../hooks/useTabQueryParam';
import { queryKeys } from '../../hooks/queryKeys';
import type {
  TestPlan,
  TestPlanStatus,
  TestCase,
  TestCaseWithDetails,
  TestCasePriority,
  TestCaseStatus,
  TestCaseTemplateItem,
  TestRun,
  TestRunStatus,
  IssueWithDetails,
  IssueStatus,
  IssuePriority,
  IssueType,
} from '../../types/domain';
import { formatDateTime } from '../../helpers/dateFormatter';
import {
  PROJECT_STATUS_LABEL,
  PROJECT_STATUS_SEVERITY,
  TEST_CASE_PRIORITY_LABEL,
  TEST_CASE_PRIORITY_SEVERITY,
  TEST_CASE_STATUS_LABEL,
  TEST_CASE_STATUS_SEVERITY,
  TEST_PLAN_STATUS_LABEL,
  TEST_PLAN_STATUS_SEVERITY,
  TEST_RUN_STATUS_LABEL,
  TEST_RUN_STATUS_SEVERITY,
  TEST_RESULT_STATUS_SEVERITY,
  ISSUE_PRIORITY_LABEL,
  ISSUE_PRIORITY_SEVERITY,
  ISSUE_STATUS_LABEL,
  ISSUE_TYPE_LABEL,
  ISSUE_TYPE_SEVERITY,
} from '../../helpers/statusLabels';

const PRIORITY_OPTIONS: { label: string; value: TestCasePriority }[] = [
  { label: TEST_CASE_PRIORITY_LABEL.low, value: 'low' },
  { label: TEST_CASE_PRIORITY_LABEL.medium, value: 'medium' },
  { label: TEST_CASE_PRIORITY_LABEL.high, value: 'high' },
  { label: TEST_CASE_PRIORITY_LABEL.critical, value: 'critical' },
];

const TEST_PLAN_STATUS_OPTIONS: { label: string; value: TestPlanStatus }[] = (
  ['draft', 'active', 'completed', 'archived'] as const
).map((v) => ({ label: TEST_PLAN_STATUS_LABEL[v], value: v }));

const TEST_CASE_STATUS_OPTIONS: { label: string; value: TestCaseStatus }[] = (
  ['active', 'archived'] as const
).map((v) => ({ label: TEST_CASE_STATUS_LABEL[v], value: v }));

const TEST_RUN_STATUS_OPTIONS: { label: string; value: TestRunStatus }[] = (
  ['in_progress', 'completed'] as const
).map((v) => ({ label: TEST_RUN_STATUS_LABEL[v], value: v }));

const ISSUE_STATUS_OPTIONS: { label: string; value: IssueStatus }[] = (
  ['open', 'in_progress', 'resolved', 'verified', 'closed'] as const
).map((v) => ({ label: ISSUE_STATUS_LABEL[v], value: v }));

const ISSUE_PRIORITY_OPTIONS: { label: string; value: IssuePriority }[] = (
  ['low', 'medium', 'high', 'critical'] as const
).map((v) => ({ label: ISSUE_PRIORITY_LABEL[v], value: v }));

const ISSUE_TYPE_OPTIONS: { label: string; value: IssueType }[] = (
  ['bug', 'feature', 'improvement', 'task'] as const
).map((v) => ({ label: ISSUE_TYPE_LABEL[v], value: v }));

type TestRunWithSummary = TestRun & {
  testPlanName: string | null;
  total: number;
  pass: number;
  fail: number;
  testers: { id: string; fullName: string | null }[];
};

// Index within the TabView -> which query keys that tab depends on, so loading state and
// invalidation on mutation both know exactly what to touch without over-fetching other tabs.
const TAB_QUERY_NAMES = ['testPlans', 'testCases', 'modules', 'tags', 'testRuns', 'issues', 'projectMembers'] as const;
// Stable empty-array reference — `data ?? []` alone allocates a new array every render
// when the query has no data yet, which defeats useMemo below it (dependency "changes"
// every render even though nothing meaningful did).
const EMPTY_ARRAY: never[] = [];
const TAB_DEPENDENCIES: (typeof TAB_QUERY_NAMES[number])[][] = [
  ['testPlans'],
  ['testCases', 'modules', 'tags'],
  ['testRuns'],
  ['issues', 'projectMembers'],
];

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useRef<Toast>(null);
  const { canEditContent, canDeleteContent, canManageIssues, canRunTests } = useProjectRole(id);
  const queryClient = useQueryClient();
  const [activeTabIndex, setActiveTabIndex] = useTabQueryParam(0);

  const projectQuery = useQuery({
    queryKey: queryKeys.project(id ?? ''),
    queryFn: () => projectService.getById(id!),
    enabled: !!id,
  });
  const project = projectQuery.data ?? null;
  const projectLoading = projectQuery.isLoading;

  const testPlansQuery = useQuery({
    queryKey: queryKeys.testPlans(id ?? ''),
    queryFn: () => testPlanService.listByProject(id!),
    enabled: !!id,
  });
  const testCasesQuery = useQuery({
    queryKey: queryKeys.testCasesWithDetails(id ?? ''),
    queryFn: () => testCaseService.listByProjectWithDetails(id!),
    enabled: !!id,
  });
  const modulesQuery = useQuery({
    queryKey: queryKeys.modules(id ?? ''),
    queryFn: () => moduleService.listByProject(id!),
    enabled: !!id,
  });
  const tagsQuery = useQuery({
    queryKey: queryKeys.tags(id ?? ''),
    queryFn: () => tagService.listByProject(id!),
    enabled: !!id,
  });
  const testRunsQuery = useQuery({
    queryKey: queryKeys.testRunsByProject(id ?? ''),
    queryFn: () => testRunService.listByProjectWithSummary(id!),
    enabled: !!id,
  });
  const issuesQuery = useQuery({
    queryKey: queryKeys.issuesByProject(id ?? ''),
    queryFn: () => issueService.listByProject(id!),
    enabled: !!id,
  });
  const projectMembersQuery = useQuery({
    queryKey: queryKeys.projectMembers(id ?? ''),
    queryFn: () => projectMemberService.listByProject(id!),
    enabled: !!id,
  });

  const testPlans = testPlansQuery.data ?? EMPTY_ARRAY;
  const testCases = (testCasesQuery.data ?? EMPTY_ARRAY) as TestCaseWithDetails[];
  const modules = modulesQuery.data ?? EMPTY_ARRAY;
  const tags = tagsQuery.data ?? EMPTY_ARRAY;
  const testRuns = (testRunsQuery.data ?? EMPTY_ARRAY) as TestRunWithSummary[];
  const issues = issuesQuery.data ?? EMPTY_ARRAY;
  const projectMembers = projectMembersQuery.data ?? EMPTY_ARRAY;

  const tabLoading: Record<number, boolean> = {
    0: testPlansQuery.isLoading,
    1: testCasesQuery.isLoading || modulesQuery.isLoading || tagsQuery.isLoading,
    2: testRunsQuery.isLoading,
    3: issuesQuery.isLoading || projectMembersQuery.isLoading,
  };

  const queryKeyByName: Record<(typeof TAB_QUERY_NAMES)[number], readonly unknown[]> = id
    ? {
      testPlans: queryKeys.testPlans(id),
      testCases: queryKeys.testCasesWithDetails(id),
      modules: queryKeys.modules(id),
      tags: queryKeys.tags(id),
      testRuns: queryKeys.testRunsByProject(id),
      issues: queryKeys.issuesByProject(id),
      projectMembers: queryKeys.projectMembers(id),
    }
    : ({} as Record<(typeof TAB_QUERY_NAMES)[number], readonly unknown[]>);

  // Re-fetches whatever the currently active tab depends on — used after any mutation on
  // this page. Cross-page staleness (e.g. completing a Test Run from its own detail page)
  // is handled by React Query itself: every page reads the same queryKeys.* cache entries,
  // so returning here after such a mutation shows fresh data without needing this call at all.
  async function loadAll() {
    if (!id) return;
    const keys = TAB_DEPENDENCIES[activeTabIndex] ?? [];
    await Promise.all(keys.map((k) => queryClient.invalidateQueries({ queryKey: queryKeyByName[k] })));
  }

  // Optimistic patch for the Issues tab's inline dropdowns (status/assignee) — updates the
  // cached list immediately instead of waiting on a refetch, same UX as before the migration.
  function patchIssue(issueId: string, changes: Partial<IssueWithDetails>) {
    if (!id) return;
    queryClient.setQueryData<IssueWithDetails[]>(queryKeys.issuesByProject(id), (prev) =>
      (prev ?? []).map((i) => (i.id === issueId ? { ...i, ...changes } : i)),
    );
  }

  const prevIdRef = useRef<string | undefined>(id);
  useEffect(() => {
    if (prevIdRef.current !== id) {
      prevIdRef.current = id;
      setActiveTabIndex(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // --- Test Plan dialog ---
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [planCode, setPlanCode] = useState('');
  const [planName, setPlanName] = useState('');
  const [planDescription, setPlanDescription] = useState('');
  const [planError, setPlanError] = useState<string | null>(null);

  // Test Plans: search/filter/sort/selection
  const [planSearch, setPlanSearch] = useState('');
  const [planStatusFilter, setPlanStatusFilter] = useState<TestPlanStatus | null>(null);
  const [planSortField, setPlanSortField] = useState('code');
  const [planSortOrder, setPlanSortOrder] = useState<1 | -1>(1);
  const [selectedPlans, setSelectedPlans] = useState<TestPlan[]>([]);

  const filteredPlans = useMemo(() => {
    const q = planSearch.trim().toLowerCase();
    return testPlans.filter((p) => {
      if (planStatusFilter && p.status !== planStatusFilter) return false;
      if (q && !p.name.toLowerCase().includes(q) && !p.code.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [testPlans, planSearch, planStatusFilter]);

  function openCreatePlanDialog() {
    setEditingPlanId(null);
    setPlanCode('');
    setPlanName('');
    setPlanDescription('');
    setPlanError(null);
    setPlanDialogOpen(true);
  }

  function openEditPlanDialog(row: TestPlan) {
    setEditingPlanId(row.id);
    setPlanCode(row.code);
    setPlanName(row.name);
    setPlanDescription(row.description ?? '');
    setPlanError(null);
    setPlanDialogOpen(true);
  }

  async function handleSavePlan() {
    if (!id) return;
    setPlanError(null);
    try {
      if (editingPlanId) {
        await testPlanService.update(editingPlanId, { name: planName, description: planDescription, code: planCode });
      } else {
        await testPlanService.create({ projectId: id, name: planName, description: planDescription, code: planCode });
      }
      setPlanDialogOpen(false);
      await loadAll();
      toast.current?.show({ severity: 'success', summary: editingPlanId ? 'Test plan diperbarui' : 'Test plan dibuat' });
    } catch (err) {
      setPlanError(err instanceof Error ? err.message : 'Gagal menyimpan test plan');
    }
  }

  function handleDeletePlan(row: TestPlan) {
    confirmDialog({
      header: 'Hapus Test Plan',
      message: `Test plan "${row.name}" akan dihapus permanen. Lanjutkan?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Hapus',
      rejectLabel: 'Batal',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        await testPlanService.remove(row.id);
        await loadAll();
        toast.current?.show({ severity: 'success', summary: 'Test plan dihapus' });
      },
    });
  }

  function handleBulkDeletePlans() {
    confirmDialog({
      header: 'Hapus Test Plan Terpilih',
      message: `${selectedPlans.length} test plan akan dihapus permanen. Lanjutkan?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Hapus',
      rejectLabel: 'Batal',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        await Promise.all(selectedPlans.map((p) => testPlanService.remove(p.id)));
        setSelectedPlans([]);
        await loadAll();
        toast.current?.show({ severity: 'success', summary: 'Test plan terpilih dihapus' });
      },
    });
  }

  // --- Module quick-add (from Test Case dialog) ---
  const [moduleDialogOpen, setModuleDialogOpen] = useState(false);
  const [moduleCode, setModuleCode] = useState('');
  const [moduleName, setModuleName] = useState('');
  const [moduleError, setModuleError] = useState<string | null>(null);
  const moduleNameRef = useRef<HTMLInputElement>(null);

  function openCreateModuleDialogFromCase() {
    setModuleCode('');
    setModuleName('');
    setModuleError(null);
    setModuleDialogOpen(true);
  }

  async function handleSaveModule() {
    if (!id) return;
    setModuleError(null);
    try {
      const created = await moduleService.create({ projectId: id, name: moduleName, code: moduleCode });
      setCaseModuleId(created.id);
      setModuleDialogOpen(false);
      await loadAll();
      toast.current?.show({ severity: 'success', summary: 'Module dibuat' });
    } catch (err) {
      setModuleError(err instanceof Error ? err.message : 'Gagal menyimpan module');
    }
  }

  // --- Tag quick-add (from Test Case dialog) ---
  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [tagError, setTagError] = useState<string | null>(null);
  const tagNameRef = useRef<HTMLInputElement>(null);

  function openCreateTagDialogFromCase() {
    setNewTagName('');
    setTagError(null);
    setTagDialogOpen(true);
  }

  async function handleSaveTag() {
    if (!id) return;
    setTagError(null);
    try {
      const created = await tagService.create(id, newTagName);
      setCaseTags((prev) => [...prev, created.name]);
      setTagDialogOpen(false);
      await loadAll();
      toast.current?.show({ severity: 'success', summary: 'Tag dibuat' });
    } catch (err) {
      setTagError(err instanceof Error ? err.message : 'Gagal menyimpan tag');
    }
  }

  // --- Test Case dialog ---
  const [caseDialogOpen, setCaseDialogOpen] = useState(false);
  const [editingCaseId, setEditingCaseId] = useState<string | null>(null);
  const [caseCode, setCaseCode] = useState('');
  const [caseModuleId, setCaseModuleId] = useState<string | null>(null);
  const [caseTitle, setCaseTitle] = useState('');
  const [caseObjective, setCaseObjective] = useState('');
  const [casePreconditions, setCasePreconditions] = useState('');
  const [caseSteps, setCaseSteps] = useState('');
  const [caseExpectedResult, setCaseExpectedResult] = useState('');
  const [casePriority, setCasePriority] = useState<TestCasePriority>('medium');
  const [caseTargetRole, setCaseTargetRole] = useState('');
  const [caseNotes, setCaseNotes] = useState('');
  const [caseTags, setCaseTags] = useState<string[]>([]);
  const [caseError, setCaseError] = useState<string | null>(null);
  const [caseStepType, setCaseStepType] = useState<TestCase['stepType']>('simple');
  const [caseDetailedSteps, setCaseDetailedSteps] = useState<{ action: string; expectedResult: string }[]>([]);

  // Test Cases: search/filter/sort/selection
  const [caseSearch, setCaseSearch] = useState('');
  const [caseStatusFilter, setCaseStatusFilter] = useState<TestCaseStatus | null>(null);
  const [casePriorityFilter, setCasePriorityFilter] = useState<TestCasePriority | null>(null);
  const [caseModuleFilter, setCaseModuleFilter] = useState<string | null>(null);
  const [caseTagFilter, setCaseTagFilter] = useState<string | null>(null);
  const [caseSortField, setCaseSortField] = useState('code');
  const [caseSortOrder, setCaseSortOrder] = useState<1 | -1>(1);
  const [selectedCases, setSelectedCases] = useState<TestCaseWithDetails[]>([]);

  const filteredCases = useMemo(() => {
    const q = caseSearch.trim().toLowerCase();
    return testCases.filter((c) => {
      if (caseStatusFilter && c.status !== caseStatusFilter) return false;
      if (casePriorityFilter && c.priority !== casePriorityFilter) return false;
      if (caseModuleFilter && c.moduleId !== caseModuleFilter) return false;
      if (caseTagFilter && !c.tags.some((t) => t.id === caseTagFilter)) return false;
      if (q && !c.title.toLowerCase().includes(q) && !c.code.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [testCases, caseSearch, caseStatusFilter, casePriorityFilter, caseModuleFilter, caseTagFilter]);

  function openCreateCaseDialog() {
    setEditingCaseId(null);
    setCaseCode('');
    setCaseModuleId(null);
    setCaseTitle('');
    setCaseObjective('');
    setCasePreconditions('');
    setCaseSteps('');
    setCaseExpectedResult('');
    setCasePriority('medium');
    setCaseTargetRole('');
    setCaseNotes('');
    setCaseTags([]);
    setCaseStepType('simple');
    setCaseDetailedSteps([]);
    setCaseError(null);
    setCaseDialogOpen(true);
  }

  async function openEditCaseDialog(row: TestCaseWithDetails) {
    setEditingCaseId(row.id);
    setCaseCode(row.code);
    setCaseModuleId(row.moduleId);
    setCaseTitle(row.title);
    setCaseObjective(row.objective ?? '');
    setCasePreconditions(row.preconditions ?? '');
    setCaseSteps(row.steps);
    setCaseExpectedResult(row.expectedResult);
    setCasePriority(row.priority);
    setCaseTargetRole(row.targetRole ?? '');
    setCaseNotes(row.notes ?? '');
    setCaseTags(row.tags.map((t) => t.name));
    setCaseStepType(row.stepType);
    setCaseError(null);
    setCaseDialogOpen(true);
    if (row.stepType === 'detailed') {
      const steps = await testCaseService.listSteps(row.id);
      setCaseDetailedSteps(steps.map((s) => ({ action: s.action, expectedResult: s.expectedResult ?? '' })));
    } else {
      setCaseDetailedSteps([]);
    }
  }

  async function handleSaveCase() {
    if (!id) return;
    setCaseError(null);
    try {
      if (editingCaseId) {
        await testCaseService.update(
          editingCaseId,
          id,
          {
            code: caseCode,
            moduleId: caseModuleId,
            title: caseTitle,
            objective: caseObjective.trim() || null,
            preconditions: casePreconditions.trim() || null,
            steps: caseSteps,
            expectedResult: caseExpectedResult,
            priority: casePriority,
            targetRole: caseTargetRole.trim() || null,
            notes: caseNotes.trim() || null,
            stepType: caseStepType,
          },
          caseTags,
          caseStepType === 'detailed' ? caseDetailedSteps : undefined,
        );
      } else {
        await testCaseService.create({
          projectId: id,
          moduleId: caseModuleId,
          code: caseCode,
          title: caseTitle,
          objective: caseObjective,
          preconditions: casePreconditions,
          steps: caseSteps,
          expectedResult: caseExpectedResult,
          priority: casePriority,
          targetRole: caseTargetRole,
          notes: caseNotes,
          tagNames: caseTags,
          stepType: caseStepType,
          detailedSteps: caseStepType === 'detailed' ? caseDetailedSteps : undefined,
        });
      }
      setCaseDialogOpen(false);
      await loadAll();
      toast.current?.show({ severity: 'success', summary: editingCaseId ? 'Test case diperbarui' : 'Test case dibuat' });
    } catch (err) {
      setCaseError(err instanceof Error ? err.message : 'Gagal menyimpan test case');
    }
  }

  // --- Import Test Case dari Template ---
  const [importTemplateDialogOpen, setImportTemplateDialogOpen] = useState(false);
  const [importTemplateId, setImportTemplateId] = useState<string | null>(null);
  const [importTemplateItems, setImportTemplateItems] = useState<TestCaseTemplateItem[]>([]);
  const [importTemplateItemIds, setImportTemplateItemIds] = useState<string[]>([]);
  const [importTemplateLoading, setImportTemplateLoading] = useState(false);

  const { data: availableTemplates = [] } = useQuery({
    queryKey: queryKeys.testCaseTemplates(),
    queryFn: () => testCaseTemplateService.listTemplates(),
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
    if (!nextTemplateId) {
      setImportTemplateItems([]);
      return;
    }
    setImportTemplateItems(await testCaseTemplateService.listItems(nextTemplateId));
  }

  async function handleImportFromTemplate() {
    if (!id || importTemplateItemIds.length === 0) return;
    setImportTemplateLoading(true);
    try {
      await testCaseTemplateService.cloneItemsToProject(id, importTemplateItemIds);
      setImportTemplateDialogOpen(false);
      await loadAll();
      toast.current?.show({ severity: 'success', summary: `${importTemplateItemIds.length} test case diimpor` });
    } catch (err) {
      toast.current?.show({ severity: 'error', summary: 'Gagal impor', detail: err instanceof Error ? err.message : undefined });
    } finally {
      setImportTemplateLoading(false);
    }
  }

  // --- Import Test Case dari Excel (state/handlers wired in the Excel import feature) ---
  const [importExcelDialogOpen, setImportExcelDialogOpen] = useState(false);

  function openImportExcelDialog() {
    setImportExcelDialogOpen(true);
  }

  function handleArchiveCase(row: TestCase) {
    confirmDialog({
      header: row.status === 'active' ? 'Arsipkan Test Case' : 'Aktifkan Kembali',
      message:
        row.status === 'active'
          ? `Test case "${row.title}" akan diarsipkan dan tidak muncul di pemilihan test plan baru. Lanjutkan?`
          : `Test case "${row.title}" akan diaktifkan kembali. Lanjutkan?`,
      icon: 'pi pi-info-circle',
      acceptLabel: row.status === 'active' ? 'Arsipkan' : 'Aktifkan',
      rejectLabel: 'Batal',
      accept: async () => {
        if (row.status === 'active') {
          await testCaseService.archive(row.id);
        } else {
          await testCaseService.reactivate(row.id);
        }
        await loadAll();
      },
    });
  }

  function handleDeleteCase(row: TestCase) {
    confirmDialog({
      header: 'Hapus Test Case',
      message: `Test case "${row.title}" akan dihapus permanen, termasuk seluruh riwayat hasil eksekusinya. Lanjutkan?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Hapus',
      rejectLabel: 'Batal',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        await testCaseService.remove(row.id);
        await loadAll();
        toast.current?.show({ severity: 'success', summary: 'Test case dihapus' });
      },
    });
  }

  function handleBulkDeleteCases() {
    confirmDialog({
      header: 'Hapus Test Case Terpilih',
      message: `${selectedCases.length} test case akan dihapus permanen, termasuk seluruh riwayat hasil eksekusinya. Lanjutkan?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Hapus',
      rejectLabel: 'Batal',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        await Promise.all(selectedCases.map((c) => testCaseService.remove(c.id)));
        setSelectedCases([]);
        await loadAll();
        toast.current?.show({ severity: 'success', summary: 'Test case terpilih dihapus' });
      },
    });
  }

  // --- Test Runs: search/filter/sort/selection ---
  const [runSearch, setRunSearch] = useState('');
  const [runStatusFilter, setRunStatusFilter] = useState<TestRunStatus | null>(null);
  const [runSortField, setRunSortField] = useState('code');
  const [runSortOrder, setRunSortOrder] = useState<1 | -1>(1);
  const [selectedRuns, setSelectedRuns] = useState<TestRunWithSummary[]>([]);

  // --- Create Test Run dialog: "from plan" (existing flow) or "unplanned/custom" ---
  const [runDialogOpen, setRunDialogOpen] = useState(false);
  const [runMode, setRunMode] = useState<'plan' | 'custom'>('plan');
  const [runFormName, setRunFormName] = useState('');
  const [runFormPlanId, setRunFormPlanId] = useState<string | null>(null);
  const [runFormCaseIds, setRunFormCaseIds] = useState<string[]>([]);
  const [runFormError, setRunFormError] = useState<string | null>(null);

  function openCreateRunDialog() {
    setRunMode('plan');
    setRunFormName(`Run ${new Date().toLocaleDateString('id-ID')}`);
    setRunFormPlanId(null);
    setRunFormCaseIds([]);
    setRunFormError(null);
    setRunDialogOpen(true);
  }

  async function handleCreateRun() {
    if (!id) return;
    setRunFormError(null);
    try {
      const run =
        runMode === 'plan'
          ? await (async () => {
            if (!runFormPlanId) throw new Error('Pilih test plan terlebih dahulu');
            return testRunService.start(runFormPlanId, runFormName);
          })()
          : await testRunService.startCustom(id, runFormName, runFormCaseIds);
      setRunDialogOpen(false);
      await loadAll();
      await queryClient.invalidateQueries({ queryKey: queryKeys.testRunsByProject(id) });
      navigate(`/test-runs/${run.id}`);
    } catch (err) {
      setRunFormError(err instanceof Error ? err.message : 'Gagal membuat test run');
    }
  }

  const filteredRuns = useMemo(() => {
    const q = runSearch.trim().toLowerCase();
    return testRuns.filter((r) => {
      if (runStatusFilter && r.status !== runStatusFilter) return false;
      if (q && !r.name.toLowerCase().includes(q) && !r.code.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [testRuns, runSearch, runStatusFilter]);

  function handleDeleteRun(row: TestRunWithSummary) {
    confirmDialog({
      header: 'Hapus Test Run',
      message: `Test run "${row.name}" akan dihapus permanen, termasuk seluruh hasil eksekusinya. Lanjutkan?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Hapus',
      rejectLabel: 'Batal',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        await testRunService.remove(row.id);
        await loadAll();
        toast.current?.show({ severity: 'success', summary: 'Test run dihapus' });
      },
    });
  }

  function handleBulkDeleteRuns() {
    confirmDialog({
      header: 'Hapus Test Run Terpilih',
      message: `${selectedRuns.length} test run akan dihapus permanen, termasuk seluruh hasil eksekusinya. Lanjutkan?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Hapus',
      rejectLabel: 'Batal',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        await Promise.all(selectedRuns.map((r) => testRunService.remove(r.id)));
        setSelectedRuns([]);
        await loadAll();
        toast.current?.show({ severity: 'success', summary: 'Test run terpilih dihapus' });
      },
    });
  }

  // --- Issues: search/filter/sort/selection ---
  const [issueSearch, setIssueSearch] = useState('');
  const [issueStatusFilter, setIssueStatusFilter] = useState<IssueStatus | null>(null);
  const [issuePriorityFilter, setIssuePriorityFilter] = useState<IssuePriority | null>(null);
  const [issueSortField, setIssueSortField] = useState('title');
  const [issueSortOrder, setIssueSortOrder] = useState<1 | -1>(1);
  const [selectedIssues, setSelectedIssues] = useState<IssueWithDetails[]>([]);
  const [issueModuleFilter, setIssueModuleFilter] = useState<string | null>(null);
  const [issueTagFilter, setIssueTagFilter] = useState<string | null>(null);

  const filteredIssues = useMemo(() => {
    const q = issueSearch.trim().toLowerCase();
    return issues.filter((i) => {
      if (issueStatusFilter && i.status !== issueStatusFilter) return false;
      if (issuePriorityFilter && i.priority !== issuePriorityFilter) return false;
      if (issueModuleFilter && i.moduleId !== issueModuleFilter) return false;
      if (issueTagFilter && !i.tags.some((t) => t.id === issueTagFilter)) return false;
      if (q && !i.title.toLowerCase().includes(q) && !i.code.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [issues, issueSearch, issueStatusFilter, issuePriorityFilter, issueModuleFilter, issueTagFilter]);

  // --- Issue create dialog (standalone, project-level) ---
  const [issueDialogOpen, setIssueDialogOpen] = useState(false);
  const [issueTitle, setIssueTitle] = useState('');
  const [issueType, setIssueType] = useState<IssueType>('bug');
  const [issueModuleId, setIssueModuleId] = useState<string | null>(null);
  const [issueDescription, setIssueDescription] = useState('');
  const [issuePriorityValue, setIssuePriorityValue] = useState<IssuePriority>('medium');
  const [issueTagNames, setIssueTagNames] = useState<string[]>([]);
  const [issueFormError, setIssueFormError] = useState<string | null>(null);

  function openCreateIssueDialog() {
    setIssueTitle('');
    setIssueType('bug');
    setIssueModuleId(null);
    setIssueDescription('');
    setIssuePriorityValue('medium');
    setIssueTagNames([]);
    setIssueFormError(null);
    setIssueDialogOpen(true);
  }

  async function handleSaveIssue() {
    if (!id) return;
    setIssueFormError(null);
    try {
      await issueService.create({
        projectId: id,
        moduleId: issueModuleId,
        type: issueType,
        title: issueTitle,
        description: issueDescription,
        priority: issuePriorityValue,
        tagNames: issueTagNames,
      });
      setIssueDialogOpen(false);
      await loadAll();
      toast.current?.show({ severity: 'success', summary: 'Issue dibuat' });
    } catch (err) {
      setIssueFormError(err instanceof Error ? err.message : 'Gagal membuat issue');
    }
  }

  function handleBulkDeleteIssues() {
    confirmDialog({
      header: 'Hapus Issue Terpilih',
      message: `${selectedIssues.length} issue akan dihapus permanen. Lanjutkan?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Hapus',
      rejectLabel: 'Batal',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        await Promise.all(selectedIssues.map((i) => issueService.remove(i.id)));
        setSelectedIssues([]);
        await loadAll();
        toast.current?.show({ severity: 'success', summary: 'Issue terpilih dihapus' });
      },
    });
  }

  if (!project) {
    return (
      <div className="page-fade-in">
        <Breadcrumb
          items={[
            { label: 'Projects', path: '/' },
            { label: projectLoading ? '…' : 'Project tidak ditemukan' },
          ]}
        />
        {!projectLoading && <p>Project tidak ditemukan.</p>}
      </div>
    );
  }

  const moduleOptions = modules.map((m) => ({ label: m.name, value: m.id }));
  const tagOptions = tags.map((t) => ({ label: t.name, value: t.id }));

  function sortHandler(setField: (f: string) => void, setOrder: (o: 1 | -1) => void) {
    return (e: DataTableStateEvent) => {
      setField(e.sortField);
      setOrder((e.sortOrder ?? 1) as 1 | -1);
    };
  }

  return (
    <div className="page-fade-in">
      <Toast ref={toast} />
      <ConfirmDialog />

      <Breadcrumb
        items={[
          { label: 'Projects', path: '/' },
          { label: project.name, path: `/projects/${id}` }
        ]}
      />

      <Card className="mb-3">
        <div className="flex align-items-start justify-content-between flex-wrap gap-2">
          <div>
            <div className="flex align-items-center gap-2 mb-1">
              <h2 className="m-0">{project.name}</h2>
              <Tag value={PROJECT_STATUS_LABEL[project.status]} severity={PROJECT_STATUS_SEVERITY[project.status]} />
            </div>
            <p className="text-color-secondary text-sm m-0">{project.description || 'Tidak ada deskripsi'}</p>
          </div>
          <div className="flex gap-2">
            <Button text icon="pi pi-cog" outlined size="small" onClick={() => navigate(`/projects/${id}/settings`)} />
          </div>
        </div>

        <div className="flex flex-wrap gap-4 mt-3 text-sm">
          <span className="text-color-secondary">Dibuat: <span className="text-color">{formatDateTime(project.createdAt)}</span></span>
          <span className="text-color-secondary">Update Terakhir: <span className="text-color">{formatDateTime(project.updatedAt)}</span></span>
          <span className="text-color-secondary">Test Plan: <span className="text-color">{testPlans.length}</span></span>
          <span className="text-color-secondary">Test Case: <span className="text-color">{testCases.length}</span></span>
        </div>
      </Card>

      <Card>
        <TabView activeIndex={activeTabIndex} onTabChange={(e) => setActiveTabIndex(e.index)}>
          <TabPanel header="Test Plans">
            <div className="flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
              <div className="flex align-items-center gap-2 flex-wrap">
                <IconField iconPosition="left">
                  <InputIcon className="pi pi-search" />
                  <InputText value={planSearch} onChange={(e) => setPlanSearch(e.target.value)} placeholder="Cari nama/kode..." />
                </IconField>
                <Dropdown
                  value={planStatusFilter}
                  options={TEST_PLAN_STATUS_OPTIONS}
                  onChange={(e) => setPlanStatusFilter(e.value)}
                  placeholder="Semua Status"
                  showClear
                  className="w-12rem"
                />
              </div>
              {canEditContent && <Button label="Test Plan Baru" icon="pi pi-plus" size="small" onClick={openCreatePlanDialog} />}
            </div>
            {canDeleteContent && (
              <BulkActionsBar
                selectedCount={selectedPlans.length}
                onClear={() => setSelectedPlans([])}
                actions={<Button label="Hapus Terpilih" icon="pi pi-trash" size="small" severity="danger" outlined onClick={handleBulkDeletePlans} />}
              />
            )}
            <DataTable
              value={filteredPlans}
              loading={tabLoading[0]}
              size="small"
              emptyMessage="Belum ada test plan"
              onRowClick={(e) => navigate(`/test-plans/${(e.data as TestPlan).id}`)}
              rowHover
              className="cursor-pointer"
              paginator
              rows={10}
              sortField={planSortField}
              sortOrder={planSortOrder}
              onSort={sortHandler(setPlanSortField, setPlanSortOrder)}
              selection={selectedPlans}
              onSelectionChange={(e) => setSelectedPlans(e.value as TestPlan[])}
              dataKey="id"
              selectionMode="checkbox"
            >
              <Column selectionMode="multiple" style={{ width: '3rem' }} />
              <Column field="code" header="Kode" sortable style={{ width: '7rem' }} />
              <Column field="name" header="Nama" sortable />
              <Column
                field="status"
                header="Status"
                sortable
                body={(row: TestPlan) => <Tag value={TEST_PLAN_STATUS_LABEL[row.status]} severity={TEST_PLAN_STATUS_SEVERITY[row.status]} />}
              />
              <Column field="updatedAt" header="Update Terakhir" sortable body={(row: TestPlan) => formatDateTime(row.updatedAt)} />
              <Column
                header=""
                style={{ width: '3.5rem' }}
                body={(row: TestPlan) => (
                  <RowActionsMenu
                    items={[
                      ...(canEditContent ? [{ label: 'Edit', icon: 'pi pi-pencil', command: () => openEditPlanDialog(row) }] : []),
                      ...(canDeleteContent
                        ? [{ label: 'Hapus', icon: 'pi pi-trash', className: 'p-error', command: () => handleDeletePlan(row) }]
                        : []),
                    ]}
                  />
                )}
              />
            </DataTable>
          </TabPanel>

          <TabPanel header="Test Cases">
            <div className="flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
              <div className="flex align-items-center gap-2 flex-wrap">
                <IconField iconPosition="left">
                  <InputIcon className="pi pi-search" />
                  <InputText value={caseSearch} onChange={(e) => setCaseSearch(e.target.value)} placeholder="Cari judul/kode..." />
                </IconField>
                <Dropdown
                  value={caseStatusFilter}
                  options={TEST_CASE_STATUS_OPTIONS}
                  onChange={(e) => setCaseStatusFilter(e.value)}
                  placeholder="Semua Status"
                  showClear
                  className="w-10rem"
                />
                <Dropdown
                  value={casePriorityFilter}
                  options={PRIORITY_OPTIONS}
                  onChange={(e) => setCasePriorityFilter(e.value)}
                  placeholder="Semua Prioritas"
                  showClear
                  className="w-10rem"
                />
                <Dropdown
                  value={caseModuleFilter}
                  options={moduleOptions}
                  onChange={(e) => setCaseModuleFilter(e.value)}
                  placeholder="Semua Module"
                  showClear
                  className="w-10rem"
                />
                <Dropdown
                  value={caseTagFilter}
                  options={tagOptions}
                  onChange={(e) => setCaseTagFilter(e.value)}
                  placeholder="Semua Tag"
                  showClear
                  className="w-10rem"
                />
              </div>
              {canEditContent && (
                <div className="flex gap-2">
                  <Button label="Import dari Template" icon="pi pi-copy" size="small" outlined onClick={openImportTemplateDialog} />
                  <Button label="Import dari Excel" icon="pi pi-file-excel" size="small" outlined onClick={openImportExcelDialog} />
                  <Button label="Test Case Baru" icon="pi pi-plus" size="small" onClick={openCreateCaseDialog} />
                </div>
              )}
            </div>
            {canDeleteContent && (
              <BulkActionsBar
                selectedCount={selectedCases.length}
                onClear={() => setSelectedCases([])}
                actions={<Button label="Hapus Terpilih" icon="pi pi-trash" size="small" severity="danger" outlined onClick={handleBulkDeleteCases} />}
              />
            )}
            <DataTable
              value={filteredCases}
              loading={tabLoading[1]}
              size="small"
              emptyMessage="Belum ada test case"
              onRowClick={(e) => navigate(`/test-cases/${(e.data as TestCaseWithDetails).id}?projectId=${id}`)}
              rowHover
              className="cursor-pointer"
              paginator
              rows={10}
              sortField={caseSortField}
              sortOrder={caseSortOrder}
              onSort={sortHandler(setCaseSortField, setCaseSortOrder)}
              selection={selectedCases}
              onSelectionChange={(e) => setSelectedCases(e.value as TestCaseWithDetails[])}
              dataKey="id"
              selectionMode="checkbox"
            >
              <Column selectionMode="multiple" style={{ width: '3rem' }} />
              <Column field="code" header="Kode" sortable style={{ width: '7rem' }} />
              <Column field="title" header="Judul" sortable />
              <Column field="module.name" header="Module" sortable body={(row: TestCaseWithDetails) => row.module?.name ?? '-'} />
              <Column
                field="priority"
                header="Prioritas"
                sortable
                body={(row: TestCaseWithDetails) => <Tag value={TEST_CASE_PRIORITY_LABEL[row.priority]} severity={TEST_CASE_PRIORITY_SEVERITY[row.priority]} />}
              />
              <Column
                field="status"
                header="Status"
                sortable
                body={(row: TestCaseWithDetails) => (
                  <Tag value={TEST_CASE_STATUS_LABEL[row.status]} severity={TEST_CASE_STATUS_SEVERITY[row.status]} />
                )}
              />
              <Column
                field="targetRole"
                header="Role Target"
                sortable
                body={(row: TestCaseWithDetails) => (row.targetRole ? <Tag value={row.targetRole} severity="secondary" /> : '-')}
              />
              <Column
                field="tags"
                header="Tag"
                body={(row: TestCaseWithDetails) => (
                  <div className="flex flex-wrap gap-1">
                    {row.tags.map((t) => (
                      <Tag key={t.id} value={t.name} severity="info" />
                    ))}
                  </div>
                )}
              />
              <Column
                header=""
                style={{ width: '3.5rem' }}
                body={(row: TestCaseWithDetails) => (
                  <RowActionsMenu
                    items={[
                      ...(canEditContent
                        ? [
                          { label: 'Edit', icon: 'pi pi-pencil', command: () => openEditCaseDialog(row) },
                          {
                            label: row.status === 'active' ? 'Arsipkan' : 'Aktifkan',
                            icon: row.status === 'active' ? 'pi pi-inbox' : 'pi pi-refresh',
                            command: () => handleArchiveCase(row),
                          },
                        ]
                        : []),
                      ...(canDeleteContent
                        ? [{ label: 'Hapus', icon: 'pi pi-trash', className: 'p-error', command: () => handleDeleteCase(row) }]
                        : []),
                    ]}
                  />
                )}
              />
            </DataTable>
          </TabPanel>

          <TabPanel header="Test Runs">
            <div className="flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
              <div className="flex align-items-center gap-2 flex-wrap">
                <IconField iconPosition="left">
                  <InputIcon className="pi pi-search" />
                  <InputText value={runSearch} onChange={(e) => setRunSearch(e.target.value)} placeholder="Cari nama/kode..." />
                </IconField>
                <Dropdown
                  value={runStatusFilter}
                  options={TEST_RUN_STATUS_OPTIONS}
                  onChange={(e) => setRunStatusFilter(e.value)}
                  placeholder="Semua Status"
                  showClear
                  className="w-12rem"
                />
              </div>
              {canRunTests && <Button label="Buat Test Run" icon="pi pi-plus" size="small" onClick={openCreateRunDialog} />}
            </div>
            {canDeleteContent && (
              <BulkActionsBar
                selectedCount={selectedRuns.length}
                onClear={() => setSelectedRuns([])}
                actions={<Button label="Hapus Terpilih" icon="pi pi-trash" size="small" severity="danger" outlined onClick={handleBulkDeleteRuns} />}
              />
            )}
            <DataTable
              value={filteredRuns}
              loading={tabLoading[2]}
              size="small"
              emptyMessage="Belum ada test run"
              onRowClick={(e) => navigate(`/test-runs/${(e.data as TestRun).id}`)}
              rowHover
              className="cursor-pointer"
              paginator
              rows={10}
              sortField={runSortField}
              sortOrder={runSortOrder}
              onSort={sortHandler(setRunSortField, setRunSortOrder)}
              selection={selectedRuns}
              onSelectionChange={(e) => setSelectedRuns(e.value as TestRunWithSummary[])}
              dataKey="id"
              selectionMode="checkbox"
            >
              <Column selectionMode="multiple" style={{ width: '3rem' }} />
              <Column field="code" header="Kode" sortable style={{ width: '7rem' }} />
              <Column field="name" header="Nama Run" sortable />
              <Column
                header="Test Plan"
                field="testPlanName"
                sortable
                body={(row: TestRunWithSummary) =>
                  row.testPlanId ? (
                    <a
                      className="entity-link"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/test-plans/${row.testPlanId}`);
                      }}
                    >
                      {row.testPlanName}
                    </a>
                  ) : (
                    <Tag value="Unplanned" severity="secondary" />
                  )
                }
              />
              <Column field="status" header="Status" sortable body={(row: TestRun) => <Tag value={TEST_RUN_STATUS_LABEL[row.status]} severity={TEST_RUN_STATUS_SEVERITY[row.status]} />} />
              <Column
                header="Hasil"
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
                body={(row: TestRunWithSummary) => (row.testers.length > 0 ? row.testers.map((t) => t.fullName ?? t.id).join(', ') : '-')}
              />
              <Column field="completedAt" header="Selesai" sortable body={(row: TestRun) => (row.completedAt ? formatDateTime(row.completedAt) : '-')} />
              <Column
                header=""
                style={{ width: '3.5rem' }}
                body={(row: TestRunWithSummary) => (
                  <RowActionsMenu
                    items={[
                      { label: 'Lihat Detail', icon: 'pi pi-eye', command: () => navigate(`/test-runs/${row.id}`) },
                      ...(canDeleteContent
                        ? [{ label: 'Hapus', icon: 'pi pi-trash', className: 'p-error', command: () => handleDeleteRun(row) }]
                        : []),
                    ]}
                  />
                )}
              />
            </DataTable>
          </TabPanel>

          <TabPanel header="Issues">
            <div className="flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
              <div className="flex align-items-center gap-2 flex-wrap">
                <IconField iconPosition="left">
                  <InputIcon className="pi pi-search" />
                  <InputText value={issueSearch} onChange={(e) => setIssueSearch(e.target.value)} placeholder="Cari judul..." />
                </IconField>
                <Dropdown
                  value={issueStatusFilter}
                  options={ISSUE_STATUS_OPTIONS}
                  onChange={(e) => setIssueStatusFilter(e.value)}
                  placeholder="Semua Status"
                  showClear
                  className="w-11rem"
                />
                <Dropdown
                  value={issuePriorityFilter}
                  options={ISSUE_PRIORITY_OPTIONS}
                  onChange={(e) => setIssuePriorityFilter(e.value)}
                  placeholder="Semua Prioritas"
                  showClear
                  className="w-11rem"
                />
                <Dropdown
                  value={issueModuleFilter}
                  options={moduleOptions}
                  onChange={(e) => setIssueModuleFilter(e.value)}
                  placeholder="Semua Module"
                  showClear
                  className="w-10rem"
                />
                <Dropdown
                  value={issueTagFilter}
                  options={tagOptions}
                  onChange={(e) => setIssueTagFilter(e.value)}
                  placeholder="Semua Tag"
                  showClear
                  className="w-10rem"
                />
              </div>
              {canManageIssues && <Button label="Issue Baru" icon="pi pi-plus" size="small" onClick={openCreateIssueDialog} />}
            </div>
            {canDeleteContent && (
              <BulkActionsBar
                selectedCount={selectedIssues.length}
                onClear={() => setSelectedIssues([])}
                actions={<Button label="Hapus Terpilih" icon="pi pi-trash" size="small" severity="danger" outlined onClick={handleBulkDeleteIssues} />}
              />
            )}
            <DataTable
              value={filteredIssues}
              loading={tabLoading[3]}
              size="small"
              emptyMessage="Belum ada issue"
              onRowClick={(e) => navigate(`/issues/${(e.data as IssueWithDetails).id}`)}
              rowHover
              className="cursor-pointer"
              paginator
              rows={10}
              sortField={issueSortField}
              sortOrder={issueSortOrder}
              onSort={sortHandler(setIssueSortField, setIssueSortOrder)}
              selection={selectedIssues}
              onSelectionChange={(e) => setSelectedIssues(e.value as IssueWithDetails[])}
              dataKey="id"
              selectionMode="checkbox"
            >
              <Column selectionMode="multiple" style={{ width: '3rem' }} />
              <Column field="code" header="Kode" sortable style={{ width: '7rem' }} />
              <Column field="title" header="Judul" sortable />
              <Column
                header="Tipe"
                body={(row: IssueWithDetails) => <Tag value={ISSUE_TYPE_LABEL[row.type]} severity={ISSUE_TYPE_SEVERITY[row.type]} />}
              />
              <Column
                header="Modul"
                body={(row: IssueWithDetails) => row.module?.name ?? '-'}
              />
              <Column
                header="Tag"
                body={(row: IssueWithDetails) => (
                  <div className="flex flex-wrap gap-1">
                    {row.tags.length > 0 ? row.tags.map((t) => <Tag key={t.id} value={t.name} severity="info" />) : '-'}
                  </div>
                )}
              />
              <Column
                header="Ditautkan"
                body={(row: IssueWithDetails) =>
                  row.linkedTestResults.length > 0 ? (
                    <span className="text-sm">{row.linkedTestResults.length} Test Result</span>
                  ) : (
                    '-'
                  )
                }
              />
              <Column field="priority" header="Prioritas" sortable body={(row: IssueWithDetails) => <Tag value={ISSUE_PRIORITY_LABEL[row.priority]} severity={ISSUE_PRIORITY_SEVERITY[row.priority]} />} />
              <Column
                field="status"
                header="Status"
                body={(row: IssueWithDetails) => (
                  <div onClick={(e) => e.stopPropagation()}>
                    <Dropdown
                      value={row.status}
                      options={ISSUE_STATUS_OPTIONS}
                      onChange={(e) => {
                        issueService.changeStatus(row.id, e.value);
                        patchIssue(row.id, { status: e.value });
                      }}
                      disabled={!canManageIssues}
                      className="w-11rem"
                    />
                  </div>
                )}
              />
              <Column
                field="assignedTo"
                header="Ditugaskan Ke"
                body={(row: IssueWithDetails) => (
                  <div onClick={(e) => e.stopPropagation()}>
                    <Dropdown
                      value={row.assignedTo}
                      options={projectMembers.map((m) => ({ label: m.profile.fullName ?? m.profile.email, value: m.userId }))}
                      onChange={(e) => {
                        issueService.assign(row.id, e.value);
                        patchIssue(row.id, { assignedTo: e.value });
                      }}
                      placeholder="Belum ditugaskan"
                      showClear
                      disabled={!canManageIssues}
                      className="w-11rem"
                    />
                  </div>
                )}
              />
              <Column
                header=""
                style={{ width: '3.5rem' }}
                body={(row: IssueWithDetails) => (
                  <RowActionsMenu
                    items={[
                      { label: 'Buka Detail', icon: 'pi pi-external-link', command: () => navigate(`/issues/${row.id}`) },
                      ...(canManageIssues && row.status !== 'closed'
                        ? [
                          {
                            label: 'Arsipkan',
                            icon: 'pi pi-inbox',
                            command: () => {
                              confirmDialog({
                                header: 'Arsipkan Issue',
                                message: `Issue "${row.title}" akan diarsipkan (ditutup). Lanjutkan?`,
                                icon: 'pi pi-info-circle',
                                acceptLabel: 'Arsipkan',
                                rejectLabel: 'Batal',
                                accept: async () => {
                                  await issueService.changeStatus(row.id, 'closed');
                                  patchIssue(row.id, { status: 'closed' });
                                  toast.current?.show({ severity: 'success', summary: 'Issue diarsipkan' });
                                },
                              });
                            },
                          },
                        ]
                        : []),
                      ...(canDeleteContent
                        ? [
                          {
                            label: 'Hapus',
                            icon: 'pi pi-trash',
                            className: 'p-error',
                            command: () => {
                              confirmDialog({
                                header: 'Hapus Issue',
                                message: `Issue "${row.title}" akan dihapus permanen. Lanjutkan?`,
                                icon: 'pi pi-exclamation-triangle',
                                acceptLabel: 'Hapus',
                                rejectLabel: 'Batal',
                                acceptClassName: 'p-button-danger',
                                accept: async () => {
                                  await issueService.remove(row.id);
                                  await loadAll();
                                  toast.current?.show({ severity: 'success', summary: 'Issue dihapus' });
                                },
                              });
                            },
                          },
                        ]
                        : []),
                    ]}
                  />
                )}
              />
            </DataTable>
          </TabPanel>
        </TabView>
      </Card>

      {/* --- Test Plan Dialog --- */}
      <Dialog
        header={editingPlanId ? 'Edit Test Plan' : 'Test Plan Baru'}
        visible={planDialogOpen}
        onHide={() => setPlanDialogOpen(false)}
        style={{ width: '30rem' }}
      >
        <div className="flex flex-column gap-3">
          {planError && <small className="p-error">{planError}</small>}
          <div className="flex flex-column gap-1">
            <label htmlFor="plan-code">Kode</label>
            <InputText id="plan-code" value={planCode} onChange={(e) => setPlanCode(e.target.value)} placeholder="Otomatis jika dikosongkan" />
          </div>
          <div className="flex flex-column gap-1">
            <label htmlFor="plan-name">Nama</label>
            <InputText id="plan-name" value={planName} onChange={(e) => setPlanName(e.target.value)} autoFocus />
          </div>
          <div className="flex flex-column gap-1">
            <label htmlFor="plan-description">Deskripsi</label>
            <InputTextarea id="plan-description" value={planDescription} onChange={(e) => setPlanDescription(e.target.value)} rows={3} />
          </div>
          <Button label="Simpan" size="small" onClick={handleSavePlan} />
        </div>
      </Dialog>

      {/* --- Create Test Run Dialog --- */}
      <Dialog header="Buat Test Run" visible={runDialogOpen} onHide={() => setRunDialogOpen(false)} style={{ width: '32rem' }}>
        <div className="flex flex-column gap-3">
          {runFormError && <small className="p-error">{runFormError}</small>}
          <SelectButton
            value={runMode}
            onChange={(e) => e.value && setRunMode(e.value)}
            options={[
              { label: 'Dari Test Plan', value: 'plan' },
              { label: 'Unplanned / Custom', value: 'custom' },
            ]}
          />
          <div className="flex flex-column gap-1">
            <label htmlFor="run-name">Nama Run</label>
            <InputText id="run-name" value={runFormName} onChange={(e) => setRunFormName(e.target.value)} autoFocus />
          </div>
          {runMode === 'plan' ? (
            <div className="flex flex-column gap-1">
              <label htmlFor="run-plan">Test Plan</label>
              <Dropdown
                id="run-plan"
                value={runFormPlanId}
                options={testPlans.map((p) => ({ label: `${p.code} — ${p.name}`, value: p.id }))}
                onChange={(e) => setRunFormPlanId(e.value)}
                placeholder="Pilih test plan"
                className="w-full"
                filter
              />
            </div>
          ) : (
            <div className="flex flex-column gap-1">
              <label htmlFor="run-cases">Test Case</label>
              <MultiSelect
                id="run-cases"
                value={runFormCaseIds}
                options={testCases.filter((c) => c.status === 'active').map((c) => ({ label: `${c.code} — ${c.title}`, value: c.id }))}
                onChange={(e) => setRunFormCaseIds(e.value)}
                placeholder="Pilih test case"
                filter
                display="chip"
                className="w-full"
              />
            </div>
          )}
          <Button label="Buat" size="small" onClick={handleCreateRun} />
        </div>
      </Dialog>

      {/* --- Module Dialog --- */}
      <Dialog
        header="Module Baru"
        visible={moduleDialogOpen}
        onHide={() => setModuleDialogOpen(false)}
        onShow={() => moduleNameRef.current?.focus()}
        style={{ width: '25rem' }}
      >
        <div className="flex flex-column gap-3">
          {moduleError && <small className="p-error">{moduleError}</small>}
          <div className="flex flex-column gap-1">
            <label htmlFor="module-code">Kode</label>
            <InputText id="module-code" value={moduleCode} onChange={(e) => setModuleCode(e.target.value)} placeholder="Otomatis jika dikosongkan" />
          </div>
          <div className="flex flex-column gap-1">
            <label htmlFor="module-name">Nama Module</label>
            <InputText
              id="module-name"
              ref={moduleNameRef}
              value={moduleName}
              onChange={(e) => setModuleName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveModule();
              }}
              placeholder="mis. Autentikasi, Dashboard, Pembelian"
            />
          </div>
          <Button label="Simpan" size="small" onClick={handleSaveModule} />
        </div>
      </Dialog>

      {/* --- Tag Dialog --- */}
      <Dialog
        header="Tag Baru"
        visible={tagDialogOpen}
        onHide={() => setTagDialogOpen(false)}
        onShow={() => tagNameRef.current?.focus()}
        style={{ width: '25rem' }}
      >
        <div className="flex flex-column gap-3">
          {tagError && <small className="p-error">{tagError}</small>}
          <div className="flex flex-column gap-1">
            <label htmlFor="tag-name">Nama Tag</label>
            <InputText
              id="tag-name"
              ref={tagNameRef}
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveTag();
              }}
              placeholder="mis. Regression, Smoke, UI"
            />
          </div>
          <Button label="Simpan" size="small" onClick={handleSaveTag} />
        </div>
      </Dialog>

      {/* --- Test Case Dialog --- */}
      <Dialog
        header={editingCaseId ? 'Edit Test Case' : 'Test Case Baru'}
        visible={caseDialogOpen}
        onHide={() => setCaseDialogOpen(false)}
        style={{ width: '40rem' }}
      >
        <div className="flex flex-column gap-3">
          {caseError && <small className="p-error">{caseError}</small>}

          <div className="flex flex-column gap-1">
            <label htmlFor="case-code">Kode</label>
            <InputText id="case-code" value={caseCode} onChange={(e) => setCaseCode(e.target.value)} placeholder="Otomatis jika dikosongkan" className="w-10rem" />
          </div>

          <div className="grid">
            <div className="col-12 md:col-6 flex flex-column gap-1">
              <label htmlFor="case-module">Module</label>
              <div className="flex align-items-center gap-1">
                <Dropdown
                  id="case-module"
                  value={caseModuleId}
                  options={moduleOptions}
                  onChange={(e) => setCaseModuleId(e.value)}
                  editable
                  placeholder="Pilih atau ketik module"
                  showClear
                  className="w-full"
                />
                <Button
                  icon="pi pi-plus"
                  type="button"
                  text
                  rounded
                  size="small"
                  aria-label="Module Baru"
                  onClick={openCreateModuleDialogFromCase}
                  style={{ width: '2rem', height: '2rem', flexShrink: 0 }}
                />
              </div>
            </div>
            <div className="col-12 md:col-6 flex flex-column gap-1">
              <label htmlFor="case-priority">Prioritas</label>
              <Dropdown
                id="case-priority"
                value={casePriority}
                options={PRIORITY_OPTIONS}
                onChange={(e) => setCasePriority(e.value)}
                className="w-full"
              />
            </div>
            <div className="col-12 md:col-6 flex flex-column gap-1">
              <label htmlFor="case-target-role">Role Target (opsional)</label>
              <InputText
                id="case-target-role"
                value={caseTargetRole}
                onChange={(e) => setCaseTargetRole(e.target.value)}
                placeholder="mis. Admin, Manager, Member"
              />
            </div>
          </div>

          <div className="flex flex-column gap-1">
            <label htmlFor="case-title">Judul</label>
            <InputText id="case-title" value={caseTitle} onChange={(e) => setCaseTitle(e.target.value)} autoFocus />
          </div>

          <div className="flex flex-column gap-1">
            <label htmlFor="case-objective">Tujuan (opsional)</label>
            <InputText id="case-objective" value={caseObjective} onChange={(e) => setCaseObjective(e.target.value)} />
          </div>

          <div className="flex flex-column gap-1">
            <label htmlFor="case-preconditions">Prasyarat</label>
            <InputTextarea id="case-preconditions" value={casePreconditions} onChange={(e) => setCasePreconditions(e.target.value)} rows={2} />
          </div>

          <div className="flex flex-column gap-1">
            <label>Mode Langkah</label>
            <SelectButton
              value={caseStepType}
              options={[
                { label: 'Simple', value: 'simple' },
                { label: 'Detailed', value: 'detailed' },
              ]}
              onChange={(e) => e.value && setCaseStepType(e.value)}
            />
          </div>

          {caseStepType === 'simple' ? (
            <>
              <div className="flex flex-column gap-1">
                <label htmlFor="case-steps">Langkah Pengujian</label>
                <InputTextarea id="case-steps" value={caseSteps} onChange={(e) => setCaseSteps(e.target.value)} rows={4} />
              </div>

              <div className="flex flex-column gap-1">
                <label htmlFor="case-expected">Hasil yang Diharapkan</label>
                <InputTextarea id="case-expected" value={caseExpectedResult} onChange={(e) => setCaseExpectedResult(e.target.value)} rows={3} />
              </div>
            </>
          ) : (
            <div className="flex flex-column gap-2">
              <label>Langkah Pengujian (Detailed)</label>
              {caseDetailedSteps.map((step, i) => (
                <div key={i} className="flex gap-2 align-items-start p-2 border-round surface-100">
                  <span className="text-color-secondary text-sm mt-2">{i + 1}.</span>
                  <div className="flex flex-column gap-1 flex-grow-1">
                    <InputText
                      placeholder="Aksi"
                      value={step.action}
                      onChange={(e) =>
                        setCaseDetailedSteps((prev) => prev.map((s, idx) => (idx === i ? { ...s, action: e.target.value } : s)))
                      }
                    />
                    <InputText
                      placeholder="Hasil yang diharapkan (opsional)"
                      value={step.expectedResult}
                      onChange={(e) =>
                        setCaseDetailedSteps((prev) => prev.map((s, idx) => (idx === i ? { ...s, expectedResult: e.target.value } : s)))
                      }
                    />
                  </div>
                  <Button icon="pi pi-times" text size="small" onClick={() => setCaseDetailedSteps((prev) => prev.filter((_, idx) => idx !== i))} />
                </div>
              ))}
              <Button
                label="Tambah Langkah"
                icon="pi pi-plus"
                text
                size="small"
                onClick={() => setCaseDetailedSteps((prev) => [...prev, { action: '', expectedResult: '' }])}
              />
            </div>
          )}

          <div className="flex flex-column gap-1">
            <label htmlFor="case-tags">Tag</label>
            <div className="flex align-items-center gap-1">
              <MultiSelect
                id="case-tags"
                value={caseTags}
                options={tags.map((t) => ({ label: t.name, value: t.name }))}
                onChange={(e) => setCaseTags(e.value ?? [])}
                placeholder="Pilih tag"
                display="chip"
                filter
                className="w-full"
              />
              <Button icon="pi pi-plus" type="button" text rounded size="small" aria-label="Tag Baru" onClick={openCreateTagDialogFromCase} style={{ width: '2rem', height: '2rem', flexShrink: 0 }} />
            </div>
          </div>

          <div className="flex flex-column gap-1">
            <label htmlFor="case-notes">Catatan (opsional)</label>
            <InputTextarea id="case-notes" value={caseNotes} onChange={(e) => setCaseNotes(e.target.value)} rows={2} />
          </div>

          <Button label="Simpan" size="small" onClick={handleSaveCase} />
        </div>
      </Dialog>

      {/* --- Import Test Case dari Template Dialog --- */}
      <Dialog header="Import dari Template" visible={importTemplateDialogOpen} onHide={() => setImportTemplateDialogOpen(false)} style={{ width: '34rem' }}>
        <div className="flex flex-column gap-3">
          <div className="flex flex-column gap-1">
            <label htmlFor="import-template">Template</label>
            <Dropdown
              id="import-template"
              value={importTemplateId}
              options={availableTemplates.map((t) => ({ label: t.name, value: t.id }))}
              onChange={(e) => handleSelectImportTemplate(e.value)}
              placeholder="Pilih template"
              className="w-full"
              filter
            />
          </div>
          {importTemplateId && (
            <div className="flex flex-column gap-1">
              <label htmlFor="import-template-items">Item</label>
              <MultiSelect
                id="import-template-items"
                value={importTemplateItemIds}
                options={importTemplateItems.map((i) => ({ label: i.title, value: i.id }))}
                onChange={(e) => setImportTemplateItemIds(e.value ?? [])}
                placeholder="Pilih item test case"
                filter
                display="chip"
                className="w-full"
              />
            </div>
          )}
          <Button
            label={`Import ${importTemplateItemIds.length > 0 ? importTemplateItemIds.length : ''} Test Case`}
            size="small"
            loading={importTemplateLoading}
            disabled={importTemplateItemIds.length === 0}
            onClick={handleImportFromTemplate}
          />
        </div>
      </Dialog>

      {/* --- Import Test Case dari Excel Dialog --- */}
      <Dialog header="Import dari Excel" visible={importExcelDialogOpen} onHide={() => setImportExcelDialogOpen(false)} style={{ width: '40rem' }}>
        <ExcelImportPanel projectId={id ?? ''} onImported={async () => { setImportExcelDialogOpen(false); await loadAll(); }} />
      </Dialog>

      {/* --- Issue Dialog (standalone, project-level) --- */}
      <Dialog header="Issue Baru" visible={issueDialogOpen} onHide={() => setIssueDialogOpen(false)} style={{ width: '32rem' }}>
        <div className="flex flex-column gap-3">
          {issueFormError && <small className="p-error">{issueFormError}</small>}
          <div className="flex flex-column gap-1">
            <label htmlFor="issue-new-title">Judul</label>
            <InputText id="issue-new-title" value={issueTitle} onChange={(e) => setIssueTitle(e.target.value)} autoFocus />
          </div>
          <div className="grid">
            <div className="col-12 md:col-6 flex flex-column gap-1">
              <label htmlFor="issue-new-type">Tipe</label>
              <Dropdown id="issue-new-type" value={issueType} options={ISSUE_TYPE_OPTIONS} onChange={(e) => setIssueType(e.value)} className="w-full" />
            </div>
            <div className="col-12 md:col-6 flex flex-column gap-1">
              <label htmlFor="issue-new-priority">Prioritas</label>
              <Dropdown id="issue-new-priority" value={issuePriorityValue} options={ISSUE_PRIORITY_OPTIONS} onChange={(e) => setIssuePriorityValue(e.value)} className="w-full" />
            </div>
          </div>
          <div className="flex flex-column gap-1">
            <label htmlFor="issue-new-module">Modul (opsional)</label>
            <Dropdown
              id="issue-new-module"
              value={issueModuleId}
              options={moduleOptions}
              onChange={(e) => setIssueModuleId(e.value)}
              showClear
              placeholder="Tidak terikat module"
              className="w-full"
            />
          </div>
          <div className="flex flex-column gap-1">
            <label htmlFor="issue-new-tags">Tag</label>
            <MultiSelect
              id="issue-new-tags"
              value={issueTagNames}
              options={tags.map((t) => ({ label: t.name, value: t.name }))}
              onChange={(e) => setIssueTagNames(e.value ?? [])}
              placeholder="Pilih tag"
              display="chip"
              filter
              className="w-full"
            />
          </div>
          <div className="flex flex-column gap-1">
            <label htmlFor="issue-new-description">Deskripsi (opsional)</label>
            <InputTextarea id="issue-new-description" value={issueDescription} onChange={(e) => setIssueDescription(e.target.value)} rows={3} />
          </div>
          <Button label="Simpan" size="small" onClick={handleSaveIssue} />
        </div>
      </Dialog>

    </div>
  );
}
