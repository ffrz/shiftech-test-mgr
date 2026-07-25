import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useScreenSize } from '../../hooks/useScreenSize';
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
import { testRoleService } from '../../services/testRoleService';
import { testSuiteService } from '../../services/testSuiteService';
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
  TestSuiteItem,
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
  PROJECT_VISIBILITY_LABEL,
  PROJECT_VISIBILITY_SEVERITY,
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
  ISSUE_STATUS_SEVERITY,
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
const TAB_QUERY_NAMES = ['testPlans', 'testCases', 'modules', 'tags', 'testRoles', 'testRuns', 'issues', 'projectMembers'] as const;
// Stable empty-array reference — `data ?? []` alone allocates a new array every render
// when the query has no data yet, which defeats useMemo below it (dependency "changes"
// every render even though nothing meaningful did).
const EMPTY_ARRAY: never[] = [];
const TAB_DEPENDENCIES: (typeof TAB_QUERY_NAMES[number])[][] = [
  ['testPlans'],
  ['testCases', 'modules', 'tags', 'testRoles'],
  ['testRuns'],
  ['issues', 'projectMembers'],
];

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { lt } = useScreenSize();
  const isMobile = lt.sm;
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
  const testRolesQuery = useQuery({
    queryKey: queryKeys.testRoles(id ?? ''),
    queryFn: () => testRoleService.listByProject(id!),
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
  const testRoles = testRolesQuery.data ?? EMPTY_ARRAY;
  const testRuns = (testRunsQuery.data ?? EMPTY_ARRAY) as TestRunWithSummary[];
  const issues = issuesQuery.data ?? EMPTY_ARRAY;
  const projectMembers = projectMembersQuery.data ?? EMPTY_ARRAY;

  const tabLoading: Record<number, boolean> = {
    0: testPlansQuery.isLoading,
    1: testCasesQuery.isLoading || modulesQuery.isLoading || tagsQuery.isLoading || testRolesQuery.isLoading,
    2: testRunsQuery.isLoading,
    3: issuesQuery.isLoading || projectMembersQuery.isLoading,
  };

  const queryKeyByName: Record<(typeof TAB_QUERY_NAMES)[number], readonly unknown[]> = id
    ? {
      testPlans: queryKeys.testPlans(id),
      testCases: queryKeys.testCasesWithDetails(id),
      modules: queryKeys.modules(id),
      tags: queryKeys.tags(id),
      testRoles: queryKeys.testRoles(id),
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

  // --- Duplicate test plan from the project's test plan list ---
  const [duplicatePlanDialogOpen, setDuplicatePlanDialogOpen] = useState(false);
  const [duplicatePlanSource, setDuplicatePlanSource] = useState<TestPlan | null>(null);
  const [duplicatePlanName, setDuplicatePlanName] = useState('');
  const [duplicatePlanError, setDuplicatePlanError] = useState<string | null>(null);

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
      toast.current?.show({ severity: 'success', summary: editingPlanId ? 'Test plan updated' : 'Test plan created' });
    } catch (err) {
      setPlanError(err instanceof Error ? err.message : 'Failed to save test plan');
    }
  }

  function handleDeletePlan(row: TestPlan) {
    confirmDialog({
      header: 'Delete Test Plan',
      message: `Test plan "${row.name}" will be permanently deleted. Continue?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        await testPlanService.remove(row.id);
        await loadAll();
        toast.current?.show({ severity: 'success', summary: 'Test plan deleted' });
      },
    });
  }

  function handleBulkDeletePlans() {
    confirmDialog({
      header: 'Delete Selected Test Plans',
      message: `${selectedPlans.length} test plan(s) will be permanently deleted. Continue?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        await Promise.all(selectedPlans.map((p) => testPlanService.remove(p.id)));
        setSelectedPlans([]);
        await loadAll();
        toast.current?.show({ severity: 'success', summary: 'Selected test plans deleted' });
      },
    });
  }

  function openDuplicatePlanDialog(row: TestPlan) {
    setDuplicatePlanSource(row);
    setDuplicatePlanName(`${row.name} (Copy)`);
    setDuplicatePlanError(null);
    setDuplicatePlanDialogOpen(true);
  }

  async function handleDuplicatePlan() {
    if (!duplicatePlanSource) return;
    setDuplicatePlanError(null);
    try {
      const newPlan = await testPlanService.duplicate(duplicatePlanSource.id, duplicatePlanName);
      setDuplicatePlanDialogOpen(false);
      setDuplicatePlanSource(null);
      await loadAll();
      toast.current?.show({ severity: 'success', summary: 'Test plan duplicated' });
      navigate(`/test-plans/${newPlan.id}`);
    } catch (err) {
      setDuplicatePlanError(err instanceof Error ? err.message : 'Failed to duplicate test plan');
    }
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
      toast.current?.show({ severity: 'success', summary: 'Module created' });
    } catch (err) {
      setModuleError(err instanceof Error ? err.message : 'Failed to save module');
    }
  }

  // --- Test Role quick-add (from Test Case dialog) ---
  const [testRoleDialogOpen, setTestRoleDialogOpen] = useState(false);
  const [testRoleName, setTestRoleName] = useState('');
  const [testRoleError, setTestRoleError] = useState<string | null>(null);
  const testRoleNameRef = useRef<HTMLInputElement>(null);

  function openCreateTestRoleDialogFromCase() {
    setTestRoleName('');
    setTestRoleError(null);
    setTestRoleDialogOpen(true);
  }

  async function handleSaveTestRole() {
    if (!id) return;
    setTestRoleError(null);
    try {
      const created = await testRoleService.create({ projectId: id, name: testRoleName });
      setCaseTargetRoleId(created.id);
      setTestRoleDialogOpen(false);
      await loadAll();
      toast.current?.show({ severity: 'success', summary: 'Role created' });
    } catch (err) {
      setTestRoleError(err instanceof Error ? err.message : 'Failed to save role');
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
      toast.current?.show({ severity: 'success', summary: 'Tag created' });
    } catch (err) {
      setTagError(err instanceof Error ? err.message : 'Failed to save tag');
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
  const [caseTargetRoleId, setCaseTargetRoleId] = useState<string | null>(null);
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
  const [caseTestRoleFilter, setCaseTestRoleFilter] = useState<string | null>(null);
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
      if (caseTestRoleFilter && c.targetRoleId !== caseTestRoleFilter) return false;
      if (q && !c.title.toLowerCase().includes(q) && !c.code.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [testCases, caseSearch, caseStatusFilter, casePriorityFilter, caseModuleFilter, caseTagFilter, caseTestRoleFilter]);

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
    setCaseTargetRoleId(null);
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
    setCaseTargetRoleId(row.targetRoleId);
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

  // Opens the same Test Case dialog as create/edit, but pre-filled from an existing row with
  // editingCaseId left null — submitting creates a brand-new test case instead of updating
  // the source one. Code is left blank so the DB trigger auto-generates a fresh TC-####.
  async function openDuplicateCaseDialog(row: TestCaseWithDetails) {
    setEditingCaseId(null);
    setCaseCode('');
    setCaseModuleId(row.moduleId);
    setCaseTitle(`${row.title} (Copy)`);
    setCaseObjective(row.objective ?? '');
    setCasePreconditions(row.preconditions ?? '');
    setCaseSteps(row.steps);
    setCaseExpectedResult(row.expectedResult);
    setCasePriority(row.priority);
    setCaseTargetRoleId(row.targetRoleId);
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
            targetRoleId: caseTargetRoleId,
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
          targetRoleId: caseTargetRoleId,
          notes: caseNotes,
          tagNames: caseTags,
          stepType: caseStepType,
          detailedSteps: caseStepType === 'detailed' ? caseDetailedSteps : undefined,
        });
      }
      setCaseDialogOpen(false);
      await loadAll();
      toast.current?.show({ severity: 'success', summary: editingCaseId ? 'Test case updated' : 'Test case created' });
    } catch (err) {
      setCaseError(err instanceof Error ? err.message : 'Failed to save test case');
    }
  }

  // --- Import Test Case from Template ---
  const [importTemplateDialogOpen, setImportTemplateDialogOpen] = useState(false);
  const [importTemplateId, setImportTemplateId] = useState<string | null>(null);
  const [importTemplateItems, setImportTemplateItems] = useState<TestSuiteItem[]>([]);
  const [importTemplateItemIds, setImportTemplateItemIds] = useState<string[]>([]);
  const [importTemplateLoading, setImportTemplateLoading] = useState(false);

  const { data: availableTemplates = [] } = useQuery({
    queryKey: queryKeys.testSuites(),
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
    if (!nextTemplateId) {
      setImportTemplateItems([]);
      return;
    }
    setImportTemplateItems(await testSuiteService.listItems(nextTemplateId));
  }

  async function handleImportFromTemplate() {
    if (!id || importTemplateItemIds.length === 0) return;
    setImportTemplateLoading(true);
    try {
      await testSuiteService.cloneItemsToProject(id, importTemplateItemIds);
      setImportTemplateDialogOpen(false);
      await loadAll();
      toast.current?.show({ severity: 'success', summary: `${importTemplateItemIds.length} test case(s) imported` });
    } catch (err) {
      toast.current?.show({ severity: 'error', summary: 'Import failed', detail: err instanceof Error ? err.message : undefined });
    } finally {
      setImportTemplateLoading(false);
    }
  }

  // --- Import Test Case from Excel (state/handlers wired in the Excel import feature) ---
  const [importExcelDialogOpen, setImportExcelDialogOpen] = useState(false);

  function openImportExcelDialog() {
    setImportExcelDialogOpen(true);
  }

  function handleArchiveCase(row: TestCase) {
    confirmDialog({
      header: row.status === 'active' ? 'Archive Test Case' : 'Reactivate Test Case',
      message:
        row.status === 'active'
          ? `Test case "${row.title}" will be archived and won't appear when selecting cases for a new test plan. Continue?`
          : `Test case "${row.title}" will be reactivated. Continue?`,
      icon: 'pi pi-info-circle',
      acceptLabel: row.status === 'active' ? 'Archive' : 'Reactivate',
      rejectLabel: 'Cancel',
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
      header: 'Delete Test Case',
      message: `Test case "${row.title}" will be permanently deleted, including its full execution result history. Continue?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        await testCaseService.remove(row.id);
        await loadAll();
        toast.current?.show({ severity: 'success', summary: 'Test case deleted' });
      },
    });
  }

  function handleBulkDeleteCases() {
    confirmDialog({
      header: 'Delete Selected Test Cases',
      message: `${selectedCases.length} test case will be permanently deleted, including its full execution result history. Continue?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        await Promise.all(selectedCases.map((c) => testCaseService.remove(c.id)));
        setSelectedCases([]);
        await loadAll();
        toast.current?.show({ severity: 'success', summary: 'Selected test cases deleted' });
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
    setRunFormName(`Run ${new Date().toLocaleDateString('en-US')}`);
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
            if (!runFormPlanId) throw new Error('Select a test plan first');
            return testRunService.start(runFormPlanId, runFormName);
          })()
          : await testRunService.startCustom(id, runFormName, runFormCaseIds);
      setRunDialogOpen(false);
      await loadAll();
      await queryClient.invalidateQueries({ queryKey: queryKeys.testRunsByProject(id) });
      navigate(`/test-runs/${run.id}`);
    } catch (err) {
      setRunFormError(err instanceof Error ? err.message : 'Failed to create test run');
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
      header: 'Delete Test Run',
      message: `Test run "${row.name}" will be permanently deleted, including all its execution results. Continue?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        await testRunService.remove(row.id);
        await loadAll();
        toast.current?.show({ severity: 'success', summary: 'Test run deleted' });
      },
    });
  }

  function handleBulkDeleteRuns() {
    confirmDialog({
      header: 'Delete Selected Test Runs',
      message: `${selectedRuns.length} test run will be permanently deleted, including all its execution results. Continue?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        await Promise.all(selectedRuns.map((r) => testRunService.remove(r.id)));
        setSelectedRuns([]);
        await loadAll();
        toast.current?.show({ severity: 'success', summary: 'Selected test runs deleted' });
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

  // Prefills the same "Issue Baru" dialog from an existing row instead of opening a blank
  // one — submitting always creates a new issue (this dialog has no edit mode), so no
  // separate editingId bookkeeping is needed here unlike the Test Case dialog.
  function openDuplicateIssueDialog(row: IssueWithDetails) {
    setIssueTitle(`${row.title} (Copy)`);
    setIssueType(row.type);
    setIssueModuleId(row.moduleId);
    setIssueDescription(row.description ?? '');
    setIssuePriorityValue(row.priority);
    setIssueTagNames(row.tags.map((t) => t.name));
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
      toast.current?.show({ severity: 'success', summary: 'Issue created' });
    } catch (err) {
      setIssueFormError(err instanceof Error ? err.message : 'Failed to create issue');
    }
  }

  function handleBulkDeleteIssues() {
    confirmDialog({
      header: 'Delete Selected Issues',
      message: `${selectedIssues.length} issue will be permanently deleted. Continue?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        await Promise.all(selectedIssues.map((i) => issueService.remove(i.id)));
        setSelectedIssues([]);
        await loadAll();
        toast.current?.show({ severity: 'success', summary: 'Selected issues deleted' });
      },
    });
  }

  const mobilePlanBody = useCallback((row: TestPlan) => (
    <div className="flex flex-column gap-1">
      <div className="font-medium">{row.name}</div>
      <div className="flex gap-2 align-items-center text-sm flex-wrap">
        <span className="text-color-secondary">{row.code}</span>
        <Tag value={TEST_PLAN_STATUS_LABEL[row.status]} severity={TEST_PLAN_STATUS_SEVERITY[row.status]} />
        <span className="text-color-secondary">{formatDateTime(row.updatedAt)}</span>
      </div>
    </div>
  ), []);

  const mobileCaseBody = useCallback((row: TestCaseWithDetails) => (
    <div className="flex flex-column gap-1">
      <div className="font-medium">{row.title}</div>
      <div className="flex gap-2 align-items-center text-sm flex-wrap">
        <span className="text-color-secondary">{row.code}</span>
        <Tag value={TEST_CASE_PRIORITY_LABEL[row.priority]} severity={TEST_CASE_PRIORITY_SEVERITY[row.priority]} />
        <Tag value={TEST_CASE_STATUS_LABEL[row.status]} severity={TEST_CASE_STATUS_SEVERITY[row.status]} />
        {row.module && <span className="text-color-secondary">{row.module.name}</span>}
      </div>
    </div>
  ), []);

  const mobileRunBody = useCallback((row: TestRunWithSummary) => (
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
  ), []);

  const mobileIssueBody = useCallback((row: IssueWithDetails) => (
    <div className="flex flex-column gap-1">
      <div className="font-medium">{row.title}</div>
      <div className="flex gap-2 align-items-center text-sm flex-wrap">
        <span className="text-color-secondary">{row.code}</span>
        <Tag value={ISSUE_PRIORITY_LABEL[row.priority]} severity={ISSUE_PRIORITY_SEVERITY[row.priority]} />
        <Tag value={ISSUE_STATUS_LABEL[row.status]} severity={ISSUE_STATUS_SEVERITY[row.status]} />
        <Tag value={ISSUE_TYPE_LABEL[row.type]} severity={ISSUE_TYPE_SEVERITY[row.type]} />
      </div>
      <div className="text-sm text-color-secondary flex gap-2">
        <span>Assignee: {row.assignee?.displayName ?? row.assignedTo ?? '-'}</span>
        <span>{formatDateTime(row.updatedAt)}</span>
      </div>
    </div>
  ), []);

  if (!project) {
    return (
      <div className="page-fade-in">
        <Breadcrumb
          items={[
            { label: 'Projects', path: '/projects' },
            { label: projectLoading ? '…' : 'Project not found' },
          ]}
        />
        {!projectLoading && <p>Project not found.</p>}
      </div>
    );
  }

  const moduleOptions = modules.map((m) => ({ label: m.name, value: m.id }));
  const tagOptions = tags.map((t) => ({ label: t.name, value: t.id }));
  const testRoleOptions = testRoles.map((r) => ({ label: r.name, value: r.id }));

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
          { label: 'Projects', path: '/projects' },
          { label: project.name, path: `/projects/${id}` }
        ]}
      />

      <Card className="mb-3">
        <div className="flex align-items-start justify-content-between flex-wrap gap-2">
          <div>
            <div className="flex align-items-center gap-2 mb-1">
              <h2 className="m-0">{project.name}</h2>
              <Tag value={PROJECT_STATUS_LABEL[project.status]} severity={PROJECT_STATUS_SEVERITY[project.status]} />
              <Tag value={PROJECT_VISIBILITY_LABEL[project.visibility]} severity={PROJECT_VISIBILITY_SEVERITY[project.visibility]} />
            </div>
            <p className="text-color-secondary text-sm m-0">{project.description || 'No description'}</p>
          </div>
          <div className="flex gap-2">
            <Button text icon="pi pi-cog" outlined size="small" onClick={() => navigate(`/projects/${id}/settings`)} />
          </div>
        </div>

        <div className="flex flex-wrap gap-4 mt-3 text-sm">
          <span className="text-color-secondary">Created: <span className="text-color">{formatDateTime(project.createdAt)}</span></span>
          <span className="text-color-secondary">Last Updated: <span className="text-color">{formatDateTime(project.updatedAt)}</span></span>
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
                  <InputText value={planSearch} onChange={(e) => setPlanSearch(e.target.value)} placeholder="Search name/code..." />
                </IconField>
                <Dropdown
                  value={planStatusFilter}
                  options={TEST_PLAN_STATUS_OPTIONS}
                  onChange={(e) => setPlanStatusFilter(e.value)}
                  placeholder="All Statuses"
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
                actions={<Button label="Delete Selected" icon="pi pi-trash" size="small" severity="danger" outlined onClick={handleBulkDeletePlans} />}
              />
            )}
            <DataTable
              value={filteredPlans}
              loading={tabLoading[0]}
              size="small"
              emptyMessage="No test plans yet"
              onRowClick={(e) => navigate(`/test-plans/${(e.data as TestPlan).id}`)}
              rowHover
              className="cursor-pointer"
              paginator
              rows={10} rowsPerPageOptions={[5, 10, 25, 50]}
              sortField={isMobile ? undefined : planSortField}
              sortOrder={isMobile ? undefined : planSortOrder}
              onSort={isMobile ? undefined : sortHandler(setPlanSortField, setPlanSortOrder)}
              selection={selectedPlans}
              onSelectionChange={(e: any) => setSelectedPlans(e.value as TestPlan[])}
              dataKey="id"
              selectionMode={isMobile ? null : 'checkbox'}
            >
              <Column selectionMode="multiple" style={{ width: '3rem' }} hidden={isMobile} />
              <Column field="code" header="Code" sortable style={{ width: '7rem' }} hidden={isMobile} />
              <Column field="name" header="Nama" sortable={!isMobile} body={isMobile ? mobilePlanBody : undefined} />
              <Column
                field="status"
                header="Status"
                sortable
                hidden={isMobile}
                body={(row: TestPlan) => <Tag value={TEST_PLAN_STATUS_LABEL[row.status]} severity={TEST_PLAN_STATUS_SEVERITY[row.status]} />}
              />
              <Column field="updatedAt" header="Update Terakhir" sortable hidden={isMobile} body={(row: TestPlan) => formatDateTime(row.updatedAt)} />
              <Column
                header=""
                style={{ width: '3.5rem' }}
                body={(row: TestPlan) => (
                  <RowActionsMenu
                    items={[
                      ...(canEditContent ? [{ label: 'Duplikat', icon: 'pi pi-copy', command: () => openDuplicatePlanDialog(row) }] : []),
                      ...(canEditContent ? [{ label: 'Edit', icon: 'pi pi-pencil', command: () => openEditPlanDialog(row) }] : []),
                      ...(canDeleteContent
                        ? [{ label: 'Delete', icon: 'pi pi-trash', className: 'p-error', command: () => handleDeletePlan(row) }]
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
                  <InputText value={caseSearch} onChange={(e) => setCaseSearch(e.target.value)} placeholder="Search title/code..." />
                </IconField>
                <Dropdown
                  value={caseStatusFilter}
                  options={TEST_CASE_STATUS_OPTIONS}
                  onChange={(e) => setCaseStatusFilter(e.value)}
                  placeholder="All Statuses"
                  showClear
                  className="w-10rem"
                />
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
                  options={moduleOptions}
                  onChange={(e) => setCaseModuleFilter(e.value)}
                  placeholder="All Modules"
                  showClear
                  className="w-10rem"
                />
                <Dropdown
                  value={caseTagFilter}
                  options={tagOptions}
                  onChange={(e) => setCaseTagFilter(e.value)}
                  placeholder="All Tags"
                  showClear
                  className="w-10rem"
                />
                <Dropdown
                  value={caseTestRoleFilter}
                  options={testRoleOptions}
                  onChange={(e) => setCaseTestRoleFilter(e.value)}
                  placeholder="All Roles"
                  showClear
                  className="w-10rem"
                />
              </div>
              {canEditContent && (
                <div className="flex gap-2">
                  <Button label="Import from Template" icon="pi pi-copy" size="small" outlined onClick={openImportTemplateDialog} />
                  <Button label="Import from Excel" icon="pi pi-file-excel" size="small" outlined onClick={openImportExcelDialog} />
                  <Button label="New Test Case" icon="pi pi-plus" size="small" onClick={openCreateCaseDialog} />
                </div>
              )}
            </div>
            {canDeleteContent && (
              <BulkActionsBar
                selectedCount={selectedCases.length}
                onClear={() => setSelectedCases([])}
                actions={<Button label="Delete Selected" icon="pi pi-trash" size="small" severity="danger" outlined onClick={handleBulkDeleteCases} />}
              />
            )}
            <DataTable
              value={filteredCases}
              loading={tabLoading[1]}
              size="small"
              emptyMessage="No test cases yet"
              onRowClick={(e) => navigate(`/test-cases/${(e.data as TestCaseWithDetails).id}?projectId=${id}`)}
              rowHover
              className="cursor-pointer"
              paginator
              rows={10} rowsPerPageOptions={[5, 10, 25, 50]}
              sortField={isMobile ? undefined : caseSortField}
              sortOrder={isMobile ? undefined : caseSortOrder}
              onSort={isMobile ? undefined : sortHandler(setCaseSortField, setCaseSortOrder)}
              selection={selectedCases}
              onSelectionChange={(e: any) => setSelectedCases(e.value as TestCaseWithDetails[])}
              dataKey="id"
              selectionMode={isMobile ? null : 'checkbox'}
            >
              <Column selectionMode="multiple" style={{ width: '3rem' }} hidden={isMobile} />
              <Column field="code" header="Code" sortable style={{ width: '7rem' }} hidden={isMobile} />
              <Column field="title" header="Title" sortable={!isMobile} body={isMobile ? mobileCaseBody : undefined} />
              <Column field="module.name" header="Module" sortable body={(row: TestCaseWithDetails) => row.module?.name ?? '-'} hidden={isMobile} />
              <Column
                field="priority"
                header="Priority"
                sortable
                hidden={isMobile}
                body={(row: TestCaseWithDetails) => <Tag value={TEST_CASE_PRIORITY_LABEL[row.priority]} severity={TEST_CASE_PRIORITY_SEVERITY[row.priority]} />}
              />
              <Column
                field="status"
                header="Status"
                sortable
                hidden={isMobile}
                body={(row: TestCaseWithDetails) => (
                  <Tag value={TEST_CASE_STATUS_LABEL[row.status]} severity={TEST_CASE_STATUS_SEVERITY[row.status]} />
                )}
              />
              <Column
                field="targetRole.name"
                header="Role Target"
                sortable
                hidden={isMobile}
                body={(row: TestCaseWithDetails) => (row.targetRole ? <Tag value={row.targetRole.name} severity="secondary" /> : '-')}
              />
              <Column
                field="tags"
                header="Tag"
                hidden={isMobile}
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
                          { label: 'Duplikat', icon: 'pi pi-copy', command: () => openDuplicateCaseDialog(row) },
                          {
                            label: row.status === 'active' ? 'Arsipkan' : 'Aktifkan',
                            icon: row.status === 'active' ? 'pi pi-inbox' : 'pi pi-refresh',
                            command: () => handleArchiveCase(row),
                          },
                        ]
                        : []),
                      ...(canDeleteContent
                        ? [{ label: 'Delete', icon: 'pi pi-trash', className: 'p-error', command: () => handleDeleteCase(row) }]
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
                  <InputText value={runSearch} onChange={(e) => setRunSearch(e.target.value)} placeholder="Search name/code..." />
                </IconField>
                <Dropdown
                  value={runStatusFilter}
                  options={TEST_RUN_STATUS_OPTIONS}
                  onChange={(e) => setRunStatusFilter(e.value)}
                  placeholder="All Statuses"
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
                actions={<Button label="Delete Selected" icon="pi pi-trash" size="small" severity="danger" outlined onClick={handleBulkDeleteRuns} />}
              />
            )}
            <DataTable
              value={filteredRuns}
              loading={tabLoading[2]}
              size="small"
              emptyMessage="No test runs yet"
              onRowClick={(e) => navigate(`/test-runs/${(e.data as TestRun).id}`)}
              rowHover
              className="cursor-pointer"
              paginator
              rows={10} rowsPerPageOptions={[5, 10, 25, 50]}
              sortField={isMobile ? undefined : runSortField}
              sortOrder={isMobile ? undefined : runSortOrder}
              onSort={isMobile ? undefined : sortHandler(setRunSortField, setRunSortOrder)}
              selection={selectedRuns}
              onSelectionChange={(e: any) => setSelectedRuns(e.value as TestRunWithSummary[])}
              dataKey="id"
              selectionMode={isMobile ? null : 'checkbox'}
            >
              <Column selectionMode="multiple" style={{ width: '3rem' }} hidden={isMobile} />
              <Column field="code" header="Code" sortable style={{ width: '7rem' }} hidden={isMobile} />
              <Column field="name" header="Nama Run" sortable={!isMobile} body={isMobile ? mobileRunBody : undefined} />
              <Column
                header="Test Plan"
                field="testPlanName"
                sortable
                hidden={isMobile}
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
              <Column field="status" header="Status" sortable hidden={isMobile} body={(row: TestRun) => <Tag value={TEST_RUN_STATUS_LABEL[row.status]} severity={TEST_RUN_STATUS_SEVERITY[row.status]} />} />
              <Column
                header="Hasil"
                hidden={isMobile}
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
                body={(row: TestRunWithSummary) => (row.testers.length > 0 ? row.testers.map((t) => t.fullName ?? t.id).join(', ') : '-')}
              />
              <Column field="completedAt" header="Completed" sortable hidden={isMobile} body={(row: TestRun) => (row.completedAt ? formatDateTime(row.completedAt) : '-')} />
              <Column
                header=""
                style={{ width: '3.5rem' }}
                body={(row: TestRunWithSummary) => (
                  <RowActionsMenu
                    items={[
                      { label: 'Lihat Detail', icon: 'pi pi-eye', command: () => navigate(`/test-runs/${row.id}`) },
                      ...(canDeleteContent
                        ? [{ label: 'Delete', icon: 'pi pi-trash', className: 'p-error', command: () => handleDeleteRun(row) }]
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
                  <InputText value={issueSearch} onChange={(e) => setIssueSearch(e.target.value)} placeholder="Search title..." />
                </IconField>
                <Dropdown
                  value={issueStatusFilter}
                  options={ISSUE_STATUS_OPTIONS}
                  onChange={(e) => setIssueStatusFilter(e.value)}
                  placeholder="All Statuses"
                  showClear
                  className="w-11rem"
                />
                <Dropdown
                  value={issuePriorityFilter}
                  options={ISSUE_PRIORITY_OPTIONS}
                  onChange={(e) => setIssuePriorityFilter(e.value)}
                  placeholder="All Priorities"
                  showClear
                  className="w-11rem"
                />
                <Dropdown
                  value={issueModuleFilter}
                  options={moduleOptions}
                  onChange={(e) => setIssueModuleFilter(e.value)}
                  placeholder="All Modules"
                  showClear
                  className="w-10rem"
                />
                <Dropdown
                  value={issueTagFilter}
                  options={tagOptions}
                  onChange={(e) => setIssueTagFilter(e.value)}
                  placeholder="All Tags"
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
                actions={<Button label="Delete Selected" icon="pi pi-trash" size="small" severity="danger" outlined onClick={handleBulkDeleteIssues} />}
              />
            )}
            <DataTable
              value={filteredIssues}
              loading={tabLoading[3]}
              size="small"
              emptyMessage="No issues yet"
              onRowClick={(e) => navigate(`/issues/${(e.data as IssueWithDetails).id}`)}
              rowHover
              className="cursor-pointer"
              paginator
              rows={10} rowsPerPageOptions={[5, 10, 25, 50]}
              sortField={isMobile ? undefined : issueSortField}
              sortOrder={isMobile ? undefined : issueSortOrder}
              onSort={isMobile ? undefined : sortHandler(setIssueSortField, setIssueSortOrder)}
              selection={selectedIssues}
              onSelectionChange={(e: any) => setSelectedIssues(e.value as IssueWithDetails[])}
              dataKey="id"
              selectionMode={isMobile ? null : 'checkbox'}
            >
              <Column selectionMode="multiple" style={{ width: '3rem' }} hidden={isMobile} />
              <Column field="code" header="Code" sortable style={{ width: '7rem' }} hidden={isMobile} />
              <Column field="title" header="Title" sortable={!isMobile} body={isMobile ? mobileIssueBody : undefined} />
              <Column
                header="Tipe"
                hidden={isMobile}
                body={(row: IssueWithDetails) => <Tag value={ISSUE_TYPE_LABEL[row.type]} severity={ISSUE_TYPE_SEVERITY[row.type]} />}
              />
              <Column
                header="Modul"
                hidden={isMobile}
                body={(row: IssueWithDetails) => row.module?.name ?? '-'}
              />
              <Column
                header="Tag"
                hidden={isMobile}
                body={(row: IssueWithDetails) => (
                  <div className="flex flex-wrap gap-1">
                    {row.tags.length > 0 ? row.tags.map((t) => <Tag key={t.id} value={t.name} severity="info" />) : '-'}
                  </div>
                )}
              />
              <Column
                header="Linked"
                hidden={isMobile}
                body={(row: IssueWithDetails) =>
                  row.linkedTestResults.length > 0 ? (
                    <span className="text-sm">{row.linkedTestResults.length} Test Result</span>
                  ) : (
                    '-'
                  )
                }
              />
              <Column field="priority" header="Priority" sortable hidden={isMobile} body={(row: IssueWithDetails) => <Tag value={ISSUE_PRIORITY_LABEL[row.priority]} severity={ISSUE_PRIORITY_SEVERITY[row.priority]} />} />
              <Column
                field="status"
                header="Status"
                hidden={isMobile}
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
                header="Assigned To"
                hidden={isMobile}
                body={(row: IssueWithDetails) => (
                  <div onClick={(e) => e.stopPropagation()}>
                    <Dropdown
                      value={row.assignedTo}
                      options={projectMembers.map((m) => ({ label: m.profile.displayName ?? m.profile.username, value: m.userId }))}
                      onChange={(e) => {
                        issueService.assign(row.id, e.value);
                        patchIssue(row.id, { assignedTo: e.value });
                      }}
                      placeholder="Unassigned"
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
                      ...(canManageIssues
                        ? [{ label: 'Duplikat', icon: 'pi pi-copy', command: () => openDuplicateIssueDialog(row) }]
                        : []),
                      ...(canManageIssues && row.status !== 'closed'
                        ? [
                          {
                            label: 'Arsipkan',
                            icon: 'pi pi-inbox',
                            command: () => {
                              confirmDialog({
                                header: 'Arsipkan Issue',
                                message: `Issue "${row.title}" will be archived (closed). Continue?`,
                                icon: 'pi pi-info-circle',
                                acceptLabel: 'Arsipkan',
                                rejectLabel: 'Cancel',
                                accept: async () => {
                                  await issueService.changeStatus(row.id, 'closed');
                                  patchIssue(row.id, { status: 'closed' });
                                  toast.current?.show({ severity: 'success', summary: 'Issue archived' });
                                },
                              });
                            },
                          },
                        ]
                        : []),
                      ...(canDeleteContent
                        ? [
                          {
                            label: 'Delete',
                            icon: 'pi pi-trash',
                            className: 'p-error',
                            command: () => {
                              confirmDialog({
                                header: 'Delete Issue',
                                message: `Issue "${row.title}" will be permanently deleted. Continue?`,
                                icon: 'pi pi-exclamation-triangle',
                                acceptLabel: 'Delete',
                                rejectLabel: 'Cancel',
                                acceptClassName: 'p-button-danger',
                                accept: async () => {
                                  await issueService.remove(row.id);
                                  await loadAll();
                                  toast.current?.show({ severity: 'success', summary: 'Issue deleted' });
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
            <label htmlFor="plan-code">Code</label>
            <InputText id="plan-code" value={planCode} onChange={(e) => setPlanCode(e.target.value)} placeholder="Automatic if left empty" />
          </div>
          <div className="flex flex-column gap-1">
            <label htmlFor="plan-name">Nama</label>
            <InputText id="plan-name" value={planName} onChange={(e) => setPlanName(e.target.value)} autoFocus />
          </div>
          <div className="flex flex-column gap-1">
            <label htmlFor="plan-description">Description</label>
            <InputTextarea id="plan-description" value={planDescription} onChange={(e) => setPlanDescription(e.target.value)} rows={3} />
          </div>
          <Button label="Save" size="small" onClick={handleSavePlan} />
        </div>
      </Dialog>

      {/* --- Duplicate Test Plan Dialog --- */}
      <Dialog
        header="Duplikat Test Plan"
        visible={duplicatePlanDialogOpen}
        onHide={() => setDuplicatePlanDialogOpen(false)}
        style={{ width: '28rem' }}
      >
        <div className="flex flex-column gap-3">
          {duplicatePlanError && <small className="p-error">{duplicatePlanError}</small>}
          <div className="flex flex-column gap-1">
            <label htmlFor="duplicate-plan-name">Nama Test Plan Baru</label>
            <InputText id="duplicate-plan-name" value={duplicatePlanName} onChange={(e) => setDuplicatePlanName(e.target.value)} autoFocus />
          </div>
          <Button label="Duplikat" size="small" onClick={handleDuplicatePlan} />
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
              { label: 'From Test Plan', value: 'plan' },
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
                placeholder="Select test plan"
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
                placeholder="Select test case"
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
        header="New Module"
        visible={moduleDialogOpen}
        onHide={() => setModuleDialogOpen(false)}
        onShow={() => moduleNameRef.current?.focus()}
        style={{ width: '25rem' }}
      >
        <div className="flex flex-column gap-3">
          {moduleError && <small className="p-error">{moduleError}</small>}
          <div className="flex flex-column gap-1">
            <label htmlFor="module-code">Code</label>
            <InputText id="module-code" value={moduleCode} onChange={(e) => setModuleCode(e.target.value)} placeholder="Automatic if left empty" />
          </div>
          <div className="flex flex-column gap-1">
            <label htmlFor="module-name">Module Name</label>
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
          <Button label="Save" size="small" onClick={handleSaveModule} />
        </div>
      </Dialog>

      {/* --- Tag Dialog --- */}
      <Dialog
        header="New Tag"
        visible={tagDialogOpen}
        onHide={() => setTagDialogOpen(false)}
        onShow={() => tagNameRef.current?.focus()}
        style={{ width: '25rem' }}
      >
        <div className="flex flex-column gap-3">
          {tagError && <small className="p-error">{tagError}</small>}
          <div className="flex flex-column gap-1">
            <label htmlFor="tag-name">Tag</label>
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
          <Button label="Save" size="small" onClick={handleSaveTag} />
        </div>
      </Dialog>

      {/* --- Test Role Dialog --- */}
      <Dialog
        header="New Test Role"
        visible={testRoleDialogOpen}
        onHide={() => setTestRoleDialogOpen(false)}
        onShow={() => testRoleNameRef.current?.focus()}
        style={{ width: '25rem' }}
      >
        <div className="flex flex-column gap-3">
          {testRoleError && <small className="p-error">{testRoleError}</small>}
          <div className="flex flex-column gap-1">
            <label htmlFor="test-role-name">Role Name</label>
            <InputText
              id="test-role-name"
              ref={testRoleNameRef}
              value={testRoleName}
              onChange={(e) => setTestRoleName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveTestRole();
              }}
              placeholder="mis. Admin, Manager, Member"
            />
          </div>
          <Button label="Save" size="small" onClick={handleSaveTestRole} />
        </div>
      </Dialog>

      {/* --- Test Case Dialog --- */}
      <Dialog
        header={editingCaseId ? 'Edit Test Case' : 'New Test Case'}
        visible={caseDialogOpen}
        onHide={() => setCaseDialogOpen(false)}
        style={{ width: '40rem' }}
      >
        <div className="flex flex-column gap-3">
          {caseError && <small className="p-error">{caseError}</small>}

          <div className="flex flex-column gap-1">
            <label htmlFor="case-code">Code</label>
            <InputText id="case-code" value={caseCode} onChange={(e) => setCaseCode(e.target.value)} placeholder="Automatic if left empty" className="w-10rem" />
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
                  placeholder="Select or type a module"
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
              <label htmlFor="case-priority">Priority</label>
              <Dropdown
                id="case-priority"
                value={casePriority}
                options={PRIORITY_OPTIONS}
                onChange={(e) => setCasePriority(e.value)}
                className="w-full"
              />
            </div>
            <div className="col-12 md:col-6 flex flex-column gap-1">
              <label htmlFor="case-target-role">Target Role (optional)</label>
              <div className="flex align-items-center gap-1">
                <Dropdown
                  id="case-target-role"
                  value={caseTargetRoleId}
                  options={testRoleOptions}
                  onChange={(e) => setCaseTargetRoleId(e.value)}
                  editable
                  placeholder="Select or type a role"
                  showClear
                  className="w-full"
                />
                <Button
                  icon="pi pi-plus"
                  type="button"
                  text
                  rounded
                  size="small"
                  aria-label="Role Baru"
                  onClick={openCreateTestRoleDialogFromCase}
                  style={{ width: '2rem', height: '2rem', flexShrink: 0 }}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-column gap-1">
            <label htmlFor="case-title">Title</label>
            <InputText id="case-title" value={caseTitle} onChange={(e) => setCaseTitle(e.target.value)} autoFocus />
          </div>

          <div className="flex flex-column gap-1">
            <label htmlFor="case-objective">Objective (optional)</label>
            <InputText id="case-objective" value={caseObjective} onChange={(e) => setCaseObjective(e.target.value)} />
          </div>

          <div className="flex flex-column gap-1">
            <label htmlFor="case-preconditions">Preconditions</label>
            <InputTextarea id="case-preconditions" value={casePreconditions} onChange={(e) => setCasePreconditions(e.target.value)} rows={2} />
          </div>

          <div className="flex flex-column gap-1">
            <label>Step Mode</label>
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
                <label htmlFor="case-steps">Test Steps</label>
                <InputTextarea id="case-steps" value={caseSteps} onChange={(e) => setCaseSteps(e.target.value)} rows={4} />
              </div>

              <div className="flex flex-column gap-1">
                <label htmlFor="case-expected">Expected Result</label>
                <InputTextarea id="case-expected" value={caseExpectedResult} onChange={(e) => setCaseExpectedResult(e.target.value)} rows={3} />
              </div>
            </>
          ) : (
            <div className="flex flex-column gap-2">
              <label>Test Steps (Detailed)</label>
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
                      placeholder="Expected result (optional)"
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
                label="Add Step"
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
                placeholder="Select tags"
                display="chip"
                filter
                className="w-full"
              />
              <Button icon="pi pi-plus" type="button" text rounded size="small" aria-label="New Tag" onClick={openCreateTagDialogFromCase} style={{ width: '2rem', height: '2rem', flexShrink: 0 }} />
            </div>
          </div>

          <div className="flex flex-column gap-1">
            <label htmlFor="case-notes">Notes (optional)</label>
            <InputTextarea id="case-notes" value={caseNotes} onChange={(e) => setCaseNotes(e.target.value)} rows={2} />
          </div>

          <Button label="Save" size="small" onClick={handleSaveCase} />
        </div>
      </Dialog>

      {/* --- Import Test Case from Template Dialog --- */}
      <Dialog header="Import from Template" visible={importTemplateDialogOpen} onHide={() => setImportTemplateDialogOpen(false)} style={{ width: '34rem' }}>
        <div className="flex flex-column gap-3">
          <div className="flex flex-column gap-1">
            <label htmlFor="import-template">Template</label>
            <Dropdown
              id="import-template"
              value={importTemplateId}
              options={availableTemplates.map((t) => ({ label: t.name, value: t.id }))}
              onChange={(e) => handleSelectImportTemplate(e.value)}
              placeholder="Select template"
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
                placeholder="Select test case items"
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

      {/* --- Import Test Case from Excel Dialog --- */}
      <Dialog header="Import from Excel" visible={importExcelDialogOpen} onHide={() => setImportExcelDialogOpen(false)} style={{ width: '40rem' }}>
        <ExcelImportPanel projectId={id ?? ''} onImported={async () => { setImportExcelDialogOpen(false); await loadAll(); }} />
      </Dialog>

      {/* --- Issue Dialog (standalone, project-level) --- */}
      <Dialog header="Issue Baru" visible={issueDialogOpen} onHide={() => setIssueDialogOpen(false)} style={{ width: '32rem' }}>
        <div className="flex flex-column gap-3">
          {issueFormError && <small className="p-error">{issueFormError}</small>}
          <div className="flex flex-column gap-1">
            <label htmlFor="issue-new-title">Title</label>
            <InputText id="issue-new-title" value={issueTitle} onChange={(e) => setIssueTitle(e.target.value)} autoFocus />
          </div>
          <div className="grid">
            <div className="col-12 md:col-6 flex flex-column gap-1">
              <label htmlFor="issue-new-type">Tipe</label>
              <Dropdown id="issue-new-type" value={issueType} options={ISSUE_TYPE_OPTIONS} onChange={(e) => setIssueType(e.value)} className="w-full" />
            </div>
            <div className="col-12 md:col-6 flex flex-column gap-1">
              <label htmlFor="issue-new-priority">Priority</label>
              <Dropdown id="issue-new-priority" value={issuePriorityValue} options={ISSUE_PRIORITY_OPTIONS} onChange={(e) => setIssuePriorityValue(e.value)} className="w-full" />
            </div>
          </div>
          <div className="flex flex-column gap-1">
            <label htmlFor="issue-new-module">Module (optional)</label>
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
              placeholder="Select tags"
              display="chip"
              filter
              className="w-full"
            />
          </div>
          <div className="flex flex-column gap-1">
            <label htmlFor="issue-new-description">Description (optional)</label>
            <InputTextarea id="issue-new-description" value={issueDescription} onChange={(e) => setIssueDescription(e.target.value)} rows={3} />
          </div>
          <Button label="Save" size="small" onClick={handleSaveIssue} />
        </div>
      </Dialog>

    </div>
  );
}
