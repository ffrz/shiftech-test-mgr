import { useEffect, useRef, useState } from 'react';
import { useScreenSize } from '../../hooks/useScreenSize';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from 'primereact/card';
import { Tag } from 'primereact/tag';
import { Button } from 'primereact/button';
import type { DataTablePageEvent, DataTableStateEvent } from 'primereact/datatable';
import { TabView, TabPanel } from 'primereact/tabview';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import { UserHoverCard } from '../../components/ui/UserHoverCard';
import { ActivityLogTab } from './components/tabs/ActivityLogTab';
import { ProjectDetailPageSkeleton } from './components/ProjectDetailPageSkeleton';
import { TestPlanTab } from './components/tabs/TestPlanTab';
import { TestCaseTab } from './components/tabs/TestCaseTab';
import { TestRunTab, type TestRunWithSummary } from './components/tabs/TestRunTab';
import { IssueTab } from './components/tabs/IssueTab';
import { TestPlanDialog } from '../../components/dialogs/TestPlanDialog';
import { DuplicateTestPlanDialog } from './components/dialogs/DuplicateTestPlanDialog';
import { CreateTestRunDialog } from './components/dialogs/CreateTestRunDialog';
import { QuickAddDialog } from './components/dialogs/QuickAddDialog';
import { TestCaseDialog } from './components/dialogs/TestCaseDialog';
import { ImportCasesDialog } from './components/dialogs/ImportCasesDialog';
import { ImportExcelDialog } from './components/dialogs/ImportExcelDialog';
import { IssueEditor, type IssueFormData } from '../../components/issues/IssueEditor';
import { CreateProjectDialog } from './components/CreateProjectDialog';
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
import { useAuthContext } from '../../hooks/useAuth';
import { useProjectAccessGuard } from '../../hooks/useProjectAccessGuard';
import { useTabQueryParam } from '../../hooks/useTabQueryParam';
import { useProjectBreadcrumbItems } from '../../hooks/useProjectBreadcrumbItems';
import { useProjectOwnerProfile } from '../../hooks/useProjectOwnerProfile';
import { useStoredState } from '../../hooks/useStoredState';
import { queryKeys } from '../../hooks/queryKeys';
import type {
  Module,
  Tag as DomainTag,
  TestRole,
  TestPlan,
  TestPlanStatus,
  TestCase,
  TestCaseWithDetails,
  TestCasePriority,
  TestCaseStatus,
  TestRunStatus,
  IssueWithDetails,
  IssueStatus,
  IssuePriority,
  IssueType,
} from '../../types/domain';
import { RelativeTime } from '../../components/ui/RelativeTime';
import { toastHelper } from '../../helpers/toast';
import {
  PROJECT_STATUS_LABEL,
  PROJECT_STATUS_SEVERITY,
} from '../../helpers/statusLabels';

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

// TabView panel order (index -> `tab` query param value) — keep in sync with the
// <TabPanel> order below. Names, not indices, so links built elsewhere (breadcrumbs,
// notifications) stay valid even if tabs are reordered.
const PROJECT_TAB_NAMES = ['testPlans', 'testCases', 'testRuns', 'issues', 'activity', 'activityLog'] as const;


export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { lt } = useScreenSize();
  const isMobile = lt.sm;
  const navigate = useNavigate();
  const { canEditContent, canDeleteContent, canManageIssues, canRunTests, canManageSettings } = useProjectRole(id);
  const { user, profile } = useAuthContext();
  const actorName = profile?.displayName ?? profile?.username ?? null;
  const queryClient = useQueryClient();
  useProjectAccessGuard(id, () => {
    toastHelper.warn('Removed from project', 'You no longer have access to this project.');
  });
  const [activeTabIndex, setActiveTabIndex] = useTabQueryParam(PROJECT_TAB_NAMES, 0);

  const projectQuery = useQuery({
    queryKey: queryKeys.project(id ?? ''),
    queryFn: () => projectService.getById(id!),
    enabled: !!id,
  });
  const project = projectQuery.data ?? null;
  const projectLoading = projectQuery.isLoading;
  const projectBreadcrumbItems = useProjectBreadcrumbItems(project?.name, project?.ownerId, `/projects/${id}`);
  // useProjectOwnerProfile deliberately returns null for your own project (it only
  // fetches to label projects someone else shared with you) — the "Owned by" line
  // wants to always show someone, so fall back to the viewer's own profile in that case.
  const projectOwnerProfile = useProjectOwnerProfile(project?.ownerId) ?? profile;

  const summaryCountsQuery = useQuery({
    queryKey: queryKeys.projectSummaryCounts(id ?? ''),
    queryFn: () => projectService.getSummaryCounts(id!),
    enabled: !!id,
  });
  const summaryCounts = summaryCountsQuery.data ?? {
    testPlanCount: 0,
    testCaseCount: 0,
    testRunCount: 0,
    issueCount: 0,
    memberCount: 0,
  };
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [detailCollapsed, setDetailCollapsed] = useStoredState(`project-${id ?? '__unknown__'}:detailCollapsed`, false);

  // --- Debounced search for each tab ---
  function useDebouncedSearch(immediate: string, setter: (v: string) => void) {
    const ref = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    useEffect(() => {
      const id = setTimeout(() => setter(immediate), 300);
      ref.current = id;
      return () => clearTimeout(id);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [immediate]);
  }

  const pfx = id ?? '__unknown__';

  // Test Plans — search/filter/server-side
  const [planSearch, setPlanSearch] = useStoredState(`project-${pfx}:planSearch`, '');
  const [planDebouncedSearch, setPlanDebouncedSearch] = useState(planSearch);
  useDebouncedSearch(planSearch, setPlanDebouncedSearch);
  const [planStatusFilter, setPlanStatusFilter] = useStoredState<TestPlanStatus[]>(`project-${pfx}:planStatusFilter:v2`, []);
  const [planSortField, setPlanSortField] = useStoredState(`project-${pfx}:planSortField`, 'code');
  const [planSortOrder, setPlanSortOrder] = useStoredState<1 | -1>(`project-${pfx}:planSortOrder`, 1);
  const [selectedPlans, setSelectedPlans] = useState<TestPlan[]>([]);

  const testPlansQuery = useQuery({
    queryKey: [...queryKeys.testPlans(id ?? ''), planDebouncedSearch, planStatusFilter],
    queryFn: () => testPlanService.listByProject(id!, { search: planDebouncedSearch || undefined, statuses: planStatusFilter.length ? planStatusFilter : undefined }),
    enabled: !!id,
  });

  // Test Cases — search/filter/server-side
  const [caseSearch, setCaseSearch] = useStoredState(`project-${pfx}:caseSearch`, '');
  const [caseDebouncedSearch, setCaseDebouncedSearch] = useState(caseSearch);
  useDebouncedSearch(caseSearch, setCaseDebouncedSearch);
  const [caseStatusFilter, setCaseStatusFilter] = useStoredState<TestCaseStatus[]>(`project-${pfx}:caseStatusFilter:v2`, []);
  const [casePriorityFilter, setCasePriorityFilter] = useStoredState<TestCasePriority[]>(`project-${pfx}:casePriorityFilter:v2`, []);
  const [caseModuleFilter, setCaseModuleFilter] = useStoredState<string[]>(`project-${pfx}:caseModuleFilter:v2`, []);
  const [caseTagFilter, setCaseTagFilter] = useStoredState<string[]>(`project-${pfx}:caseTagFilter:v2`, []);
  const [caseTestRoleFilter, setCaseTestRoleFilter] = useStoredState<string[]>(`project-${pfx}:caseTestRoleFilter:v2`, []);
  const [caseSortField, setCaseSortField] = useStoredState(`project-${pfx}:caseSortField`, 'code');
  const [caseSortOrder, setCaseSortOrder] = useStoredState<1 | -1>(`project-${pfx}:caseSortOrder`, 1);
  const [selectedCases, setSelectedCases] = useState<TestCaseWithDetails[]>([]);

  const testCasesQuery = useQuery({
    queryKey: [...queryKeys.testCasesWithDetails(id ?? ''), caseDebouncedSearch, caseStatusFilter, casePriorityFilter, caseModuleFilter, caseTagFilter, caseTestRoleFilter],
    queryFn: () => testCaseService.listByProjectWithDetails(id!, {
      search: caseDebouncedSearch || undefined,
      statuses: caseStatusFilter.length ? caseStatusFilter : undefined,
      priorities: casePriorityFilter.length ? casePriorityFilter : undefined,
      moduleIds: caseModuleFilter.length ? caseModuleFilter : undefined,
      tagIds: caseTagFilter.length ? caseTagFilter : undefined,
      testRoleIds: caseTestRoleFilter.length ? caseTestRoleFilter : undefined,
    }),
    enabled: !!id,
  });

  // Test Runs — search/filter/server-side
  const [runSearch, setRunSearch] = useStoredState(`project-${pfx}:runSearch`, '');
  const [runDebouncedSearch, setRunDebouncedSearch] = useState(runSearch);
  useDebouncedSearch(runSearch, setRunDebouncedSearch);
  const [runStatusFilter, setRunStatusFilter] = useStoredState<TestRunStatus[]>(`project-${pfx}:runStatusFilter:v2`, []);
  const [runSortField, setRunSortField] = useStoredState(`project-${pfx}:runSortField`, 'code');
  const [runSortOrder, setRunSortOrder] = useStoredState<1 | -1>(`project-${pfx}:runSortOrder`, 1);
  const [selectedRuns, setSelectedRuns] = useState<TestRunWithSummary[]>([]);

  const testRunsQuery = useQuery({
    queryKey: [...queryKeys.testRunsByProject(id ?? ''), runDebouncedSearch, runStatusFilter],
    queryFn: () => testRunService.listByProjectWithSummary(id!, { search: runDebouncedSearch || undefined, statuses: runStatusFilter.length ? runStatusFilter : undefined }),
    enabled: !!id,
  });

  // Issues — search/filter/server-side
  const [issueSearch, setIssueSearch] = useStoredState(`project-${pfx}:issueSearch`, '');
  const [issueDebouncedSearch, setIssueDebouncedSearch] = useState(issueSearch);
  useDebouncedSearch(issueSearch, setIssueDebouncedSearch);
  const [issueStatusFilter, setIssueStatusFilter] = useStoredState<IssueStatus[]>(`project-${pfx}:issueStatusFilter:v2`, []);
  const [issuePriorityFilter, setIssuePriorityFilter] = useStoredState<IssuePriority[]>(`project-${pfx}:issuePriorityFilter:v2`, []);
  const [issueSortField, setIssueSortField] = useStoredState(`project-${pfx}:issueSortField`, 'title');
  const [issueSortOrder, setIssueSortOrder] = useStoredState<1 | -1>(`project-${pfx}:issueSortOrder`, 1);
  const [selectedIssues, setSelectedIssues] = useState<IssueWithDetails[]>([]);
  const [issueModuleFilter, setIssueModuleFilter] = useStoredState<string[]>(`project-${pfx}:issueModuleFilter:v2`, []);
  const [issueTagFilter, setIssueTagFilter] = useStoredState<string[]>(`project-${pfx}:issueTagFilter:v2`, []);
  const [issueTypeFilter, setIssueTypeFilter] = useStoredState<IssueType[]>(`project-${pfx}:issueTypeFilter:v2`, []);
  const [issueTestRoleFilter, setIssueTestRoleFilter] = useStoredState<string[]>(`project-${pfx}:issueTestRoleFilter:v2`, []);
  const [issuePage, setIssuePage] = useState(1);
  const [issueRowsPerPage, setIssueRowsPerPage] = useStoredState('table:rowsPerPage', 10);

  const issueFilterDeps = [issueDebouncedSearch, issueStatusFilter, issuePriorityFilter, issueModuleFilter, issueTagFilter, issueTypeFilter, issueTestRoleFilter];
  useEffect(() => { setIssuePage(1); }, issueFilterDeps); // eslint-disable-line react-hooks/exhaustive-deps

  const issuesQuery = useQuery({
    queryKey: [...queryKeys.issuesByProject(id ?? ''), issueDebouncedSearch, issueStatusFilter, issuePriorityFilter, issueModuleFilter, issueTagFilter, issueTypeFilter, issueTestRoleFilter, issuePage, issueRowsPerPage, issueSortField, issueSortOrder],
    queryFn: () => issueService.listByProjectPaginated(id!, {
      search: issueDebouncedSearch || undefined,
      statuses: issueStatusFilter.length ? issueStatusFilter : undefined,
      priorities: issuePriorityFilter.length ? issuePriorityFilter : undefined,
      moduleIds: issueModuleFilter.length ? issueModuleFilter : undefined,
      tagIds: issueTagFilter.length ? issueTagFilter : undefined,
      types: issueTypeFilter.length ? issueTypeFilter : undefined,
      testRoleIds: issueTestRoleFilter.length ? issueTestRoleFilter : undefined,
      page: issuePage,
      pageSize: issueRowsPerPage,
      sortField: issueSortField,
      sortOrder: issueSortOrder === 1 ? 'asc' : 'desc',
    }),
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
  const issuesData = issuesQuery.data as { data: IssueWithDetails[]; total: number } | undefined;
  const issues = issuesData?.data ?? EMPTY_ARRAY;
  const totalIssues = issuesData?.total ?? 0;
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
    await Promise.all([
      ...keys.map((k) => queryClient.invalidateQueries({ queryKey: queryKeyByName[k] })),
      queryClient.invalidateQueries({ queryKey: queryKeys.projectSummaryCounts(id) }),
    ]);
  }

  function patchIssue(_issueId: string, _changes: Partial<IssueWithDetails>) {
    if (!id) return;
    queryClient.invalidateQueries({ queryKey: queryKeys.issuesByProject(id) });
  }

  function onIssuePage(e: DataTablePageEvent) {
    setIssuePage((e.page ?? 0) + 1);
    if (e.rows) setIssueRowsPerPage(e.rows);
  }

  function toastSuccess(summary: string) {
    toastHelper.success(summary);
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
  const [planStatus, setPlanStatus] = useState<TestPlanStatus>('draft');
  const [planError, setPlanError] = useState<string | null>(null);

  // --- Duplicate test plan from the project's test plan list ---
  const [duplicatePlanDialogOpen, setDuplicatePlanDialogOpen] = useState(false);
  const [duplicatePlanSource, setDuplicatePlanSource] = useState<TestPlan | null>(null);
  const [duplicatePlanName, setDuplicatePlanName] = useState('');
  const [duplicatePlanError, setDuplicatePlanError] = useState<string | null>(null);

  function openCreatePlanDialog() {
    setEditingPlanId(null);
    setPlanCode('');
    setPlanName('');
    setPlanDescription('');
    setPlanStatus('draft');
    setPlanError(null);
    setPlanDialogOpen(true);
  }

  function openEditPlanDialog(row: TestPlan) {
    setEditingPlanId(row.id);
    setPlanCode(row.code);
    setPlanName(row.name);
    setPlanDescription(row.description ?? '');
    setPlanStatus(row.status);
    setPlanError(null);
    setPlanDialogOpen(true);
  }

  async function handleSavePlan() {
    if (!id) return;
    setPlanError(null);
    try {
      if (editingPlanId) {
        await testPlanService.update(editingPlanId, { name: planName, description: planDescription, code: planCode, status: planStatus }, { projectId: id, actorId: user?.id });
      } else {
        await testPlanService.create({ projectId: id, name: planName, description: planDescription, code: planCode, createdBy: user?.id ?? null });
      }
      setPlanDialogOpen(false);
      await loadAll();
      toastSuccess(editingPlanId ? 'Test plan updated' : 'Test plan created');
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
        await testPlanService.remove(row.id, { actorId: user?.id });
        await loadAll();
        toastSuccess('Test plan deleted');
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
        await Promise.all(selectedPlans.map((p) => testPlanService.remove(p.id, { actorId: user?.id })));
        setSelectedPlans([]);
        await loadAll();
        toastSuccess('Selected test plans deleted');
      },
    });
  }

  async function handleBulkChangeStatusPlans(status: TestPlanStatus) {
    if (!id || !user) return;
    await testPlanService.bulkChangeStatus(selectedPlans.map((p) => p.id), status, { projectId: id, actorId: user.id });
    setSelectedPlans([]);
    await loadAll();
    toastSuccess('Selected test plans updated');
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
      toastSuccess('Test plan duplicated');
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
      toastSuccess('Module created');
    } catch (err) {
      setModuleError(err instanceof Error ? err.message : 'Failed to save module');
    }
  }

  // --- Test Role quick-add (from Test Case dialog) ---
  const [testRoleDialogOpen, setTestRoleDialogOpen] = useState(false);
  const [testRoleName, setTestRoleName] = useState('');
  const [testRoleError, setTestRoleError] = useState<string | null>(null);

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
      toastSuccess('Role created');
    } catch (err) {
      setTestRoleError(err instanceof Error ? err.message : 'Failed to save role');
    }
  }

  // --- Tag quick-add for Test Case dialog ---
  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [tagError, setTagError] = useState<string | null>(null);

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
      toastSuccess('Tag created');
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
          user?.id ?? null,
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
          createdBy: user?.id ?? null,
        });
      }
      setCaseDialogOpen(false);
      await loadAll();
      toastSuccess(editingCaseId ? 'Test case updated' : 'Test case created');
    } catch (err) {
      setCaseError(err instanceof Error ? err.message : 'Failed to save test case');
    }
  }

  // --- Import Test Case from Suite/Project ---
  const [importTemplateDialogOpen, setImportTemplateDialogOpen] = useState(false);
  const [importTemplateLoading, setImportTemplateLoading] = useState(false);

  function openImportTemplateDialog() {
    setImportTemplateDialogOpen(true);
  }

  async function handleImportFromTemplate(source: { kind: 'suite'; suiteId: string } | { kind: 'project'; projectId: string }, ids: string[]) {
    if (!id || ids.length === 0) return;
    setImportTemplateLoading(true);
    try {
      if (source.kind === 'suite') {
        await testSuiteService.cloneItemsToProject(id, ids);
      } else {
        await testCaseService.cloneToProject(ids, id);
      }
      setImportTemplateDialogOpen(false);
      await loadAll();
      toastSuccess(`${ids.length} test case(s) imported`);
    } catch (err) {
      toastHelper.errorFromCatch('Import failed', err);
    } finally {
      setImportTemplateLoading(false);
    }
  }

  // --- Import Test Case from Excel (state/handlers wired in the Excel import feature) ---
  const [importExcelDialogOpen, setImportExcelDialogOpen] = useState(false);

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
        if (!user) return;
        if (row.status === 'active') {
          await testCaseService.archive(row.id, { projectId: id!, actorId: user.id });
        } else {
          await testCaseService.reactivate(row.id, { projectId: id!, actorId: user.id });
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
        await testCaseService.remove(row.id, { actorId: user?.id });
        await loadAll();
        toastSuccess('Test case deleted');
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
        await Promise.all(selectedCases.map((c) => testCaseService.remove(c.id, { actorId: user?.id })));
        setSelectedCases([]);
        await loadAll();
        toastSuccess('Selected test cases deleted');
      },
    });
  }

  async function handleBulkEditCases(changes: { moduleId?: string | null; priority?: TestCasePriority; status?: TestCaseStatus; targetRoleId?: string | null }) {
    await testCaseService.bulkUpdate(selectedCases.map((c) => c.id), changes, { projectId: id ?? '', actorId: user?.id });
    setSelectedCases([]);
    await loadAll();
    toastSuccess('Selected test cases updated');
  }

  // --- Create Test Run dialog: "from plan" (existing flow) or "unplanned/custom" ---
  const [runDialogOpen, setRunDialogOpen] = useState(false);
  const [runMode, setRunMode] = useState<'plan' | 'custom'>('plan');
  const [runFormName, setRunFormName] = useState('');
  const [runFormPlanId, setRunFormPlanId] = useState<string | null>(null);
  const [runFormCaseIds, setRunFormCaseIds] = useState<string[]>([]);
  const [runFormCases, setRunFormCases] = useState<TestCaseWithDetails[]>([]);
  const [runFormError, setRunFormError] = useState<string | null>(null);

  async function openCreateRunDialog() {
    setRunMode('plan');
    setRunFormName(`Run ${new Date().toLocaleDateString('en-US')}`);
    setRunFormPlanId(null);
    setRunFormCaseIds([]);
    setRunFormError(null);
    if (id) {
      // Load the full active-case list so the custom-mode picker can filter by
      // module/tag/priority/role independent of the Test Cases tab's own filters.
      setRunFormCases(await testCaseService.listByProjectWithDetails(id, { statuses: ['active'] }));
    }
    setRunDialogOpen(true);
  }

  async function handleCreateRun() {
    if (!id) return;
    if (runMode === 'plan') {
      const selectedPlan = testPlans.find((p) => p.id === runFormPlanId);
      if (selectedPlan && (selectedPlan.status === 'draft' || selectedPlan.status === 'archived')) {
        confirmDialog({
          header: 'Test Plan Belum Siap',
          message:
            selectedPlan.status === 'draft'
              ? 'Test plan ini masih berstatus Draft. Test run yang dibuat dari plan draft bisa saja belum final. Lanjutkan membuat test run?'
              : 'Test plan ini sudah diarsipkan. Biasanya test plan archived tidak dites lagi. Lanjutkan membuat test run?',
          icon: 'pi pi-exclamation-triangle',
          acceptLabel: 'Lanjutkan',
          rejectLabel: 'Batal',
          acceptClassName: 'p-button-warning',
          accept: () => actuallyCreateRun(),
        });
        return;
      }
    }
    await actuallyCreateRun();
  }

  async function actuallyCreateRun() {
    if (!id) return;
    setRunFormError(null);
    try {
      const run =
        runMode === 'plan'
          ? await (async () => {
            if (!runFormPlanId) throw new Error('Select a test plan first');
            return testRunService.start(runFormPlanId, runFormName, undefined, user?.id ?? null);
          })()
          : await testRunService.startCustom(id, runFormName, runFormCaseIds, undefined, user?.id ?? null);
      setRunDialogOpen(false);
      await loadAll();
      await queryClient.invalidateQueries({ queryKey: queryKeys.testRunsByProject(id) });
      navigate(`/test-runs/${run.id}`);
    } catch (err) {
      setRunFormError(err instanceof Error ? err.message : 'Failed to create test run');
    }
  }

  function handleDeleteRun(row: TestRunWithSummary) {
    confirmDialog({
      header: 'Delete Test Run',
      message: `Test run "${row.name}" will be permanently deleted, including all its execution results. Continue?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        await testRunService.remove(row.id, { actorId: user?.id });
        await loadAll();
        toastSuccess('Test run deleted');
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
        await Promise.all(selectedRuns.map((r) => testRunService.remove(r.id, { actorId: user?.id })));
        setSelectedRuns([]);
        await loadAll();
        toastSuccess('Selected test runs deleted');
      },
    });
  }

  // --- Issue Editor (shared IssueEditor component for create/edit/duplicate) ---
  const [issueEditor, setIssueEditor] = useState<{
    mode: 'create' | 'edit';
    issueId?: string;
    initialData?: IssueFormData;
  } | null>(null);

  function openCreateIssueDialog() {
    setIssueEditor({ mode: 'create' });
  }

  function openEditIssueDialog(row: IssueWithDetails) {
    setIssueEditor({
      mode: 'edit',
      issueId: row.id,
      initialData: {
        code: row.code,
        title: row.title,
        type: row.type,
        priority: row.priority,
        status: row.status,
        moduleId: row.moduleId,
        assignedTo: row.assignedTo,
        targetRoleId: row.targetRoleId,
        description: row.description ?? '',
        actualResult: row.actualResult ?? '',
        expectedResult: row.expectedResult ?? '',
        tagNames: row.tags.map((t) => t.name),
        externalLinks: row.externalLinks,
      },
    });
  }

  function openDuplicateIssueDialog(row: IssueWithDetails) {
    setIssueEditor({
      mode: 'create',
      initialData: {
        code: '',
        title: `${row.title} (Copy)`,
        type: row.type,
        priority: row.priority,
        status: 'open',
        moduleId: row.moduleId,
        assignedTo: null,
        targetRoleId: row.targetRoleId,
        description: row.description ?? '',
        actualResult: '',
        expectedResult: '',
        tagNames: row.tags.map((t) => t.name),
        externalLinks: [],
      },
    });
  }

  async function handleIssueEditorSave(data: IssueFormData) {
    if (!id) return;
    if (issueEditor?.mode === 'edit' && issueEditor.issueId) {
      await issueService.update(issueEditor.issueId, id, {
        code: data.code,
        title: data.title,
        description: data.description,
        actualResult: data.actualResult,
        expectedResult: data.expectedResult,
        priority: data.priority,
        type: data.type,
        moduleId: data.moduleId,
        targetRoleId: data.targetRoleId,
        externalLinks: data.externalLinks,
      }, data.tagNames, user?.id ?? null);
      toastSuccess('Issue updated');
    } else {
      const created = await issueService.create({
        projectId: id,
        moduleId: data.moduleId,
        type: data.type,
        code: data.code,
        title: data.title,
        description: data.description,
        priority: data.priority,
        status: data.status,
        targetRoleId: data.targetRoleId,
        tagNames: data.tagNames,
        assignedTo: data.assignedTo,
        createdBy: user?.id ?? null,
      });
      toastSuccess('Issue created');
      setIssueEditor(null);
      await loadAll();
      return created;
    }
    setIssueEditor(null);
    await loadAll();
  }

  async function handleIssueEditorStatusChange(status: IssueStatus) {
    if (!id || !user || issueEditor?.mode !== 'edit' || !issueEditor.issueId) return;
    await issueService.changeStatus(issueEditor.issueId, status, { projectId: id, actorId: user.id, actorName });
  }

  async function handleIssueEditorAssigneeChange(assignedTo: string | null) {
    if (!id || !user || issueEditor?.mode !== 'edit' || !issueEditor.issueId) return;
    const assigneeName = assignedTo
      ? projectMembers.find((m) => m.userId === assignedTo)?.profile?.displayName ?? projectMembers.find((m) => m.userId === assignedTo)?.profile?.username
      : null;
    await issueService.assign(issueEditor.issueId, assignedTo, { projectId: id, actorId: user.id, actorName, assigneeName });
  }

  // Mutable copies so IssueEditor's quick-add can extend them without cache invalidation.
  const [editableModules, setEditableModules] = useState<Module[]>([]);
  const [editableTags, setEditableTags] = useState<DomainTag[]>([]);
  const [editableTestRoles, setEditableTestRoles] = useState<TestRole[]>([]);
  if (editableModules.length === 0 && modules.length > 0) setEditableModules(modules);
  if (editableTags.length === 0 && tags.length > 0) setEditableTags(tags);
  if (editableTestRoles.length === 0 && testRoles.length > 0) setEditableTestRoles(testRoles);

  function handleBulkDeleteIssues() {
    confirmDialog({
      header: 'Delete Selected Issues',
      message: `${selectedIssues.length} issue will be permanently deleted. Continue?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        await Promise.all(selectedIssues.map((i) => issueService.remove(i.id, { actorId: user?.id })));
        setSelectedIssues([]);
        await loadAll();
        toastSuccess('Selected issues deleted');
      },
    });
  }

  async function handleBulkEditIssues(changes: { status?: IssueStatus; assignedTo?: string | null }) {
    if (!id || !user) return;
    const ids = selectedIssues.map((i) => i.id);
    if (changes.status !== undefined) {
      await issueService.bulkChangeStatus(ids, changes.status, { projectId: id, actorId: user.id, actorName });
    }
    if (changes.assignedTo !== undefined) {
      const assigneeName = changes.assignedTo
        ? projectMembers.find((m) => m.userId === changes.assignedTo)?.profile?.displayName ?? projectMembers.find((m) => m.userId === changes.assignedTo)?.profile?.username
        : null;
      await issueService.bulkAssign(ids, changes.assignedTo, { projectId: id, actorId: user.id, actorName, assigneeName });
    }
    setSelectedIssues([]);
    await loadAll();
    toastSuccess('Selected issues updated');
  }

  if (!project) {
    if (projectLoading) return <ProjectDetailPageSkeleton />;
    return (
      <div className="page-fade-in">
        <Breadcrumb
          items={[
            { label: 'Projects', path: '/projects' },
            { label: 'Project not found' },
          ]}
        />
        <p>Project not found.</p>
      </div>
    );
  }

  const moduleOptions = [...modules].sort((a, b) => a.name.localeCompare(b.name)).map((m) => ({ label: m.name, value: m.id }));
  const tagOptions = tags.map((t) => ({ label: t.name, value: t.id }));
  const testRoleOptions = testRoles.map((r) => ({ label: r.name, value: r.id }));
  const caseTagOptions = tags.map((t) => ({ label: t.name, value: t.name }));

  function sortHandler(setField: (f: string) => void, setOrder: (o: 1 | -1) => void) {
    return (e: DataTableStateEvent) => {
      setField(e.sortField);
      setOrder((e.sortOrder ?? 1) as 1 | -1);
    };
  }

  return (
    <div className="page-fade-in">
      <ConfirmDialog />

      <Breadcrumb
        items={[
          { label: 'Projects', path: '/projects' },
          ...projectBreadcrumbItems,
        ]}
      />

      <Card className="mb-3">
        <div className="flex align-items-center justify-content-between gap-2">
          <div className="min-w-0 flex align-items-center gap-2">
            <h2 className="m-0 white-space-nowrap overflow-hidden text-overflow-ellipsis">{project.name}</h2>
            <Tag value={PROJECT_STATUS_LABEL[project.status]} severity={PROJECT_STATUS_SEVERITY[project.status]} />
          </div>
          <div className="flex gap-2 flex-shrink-0 header-actions">
            {canManageSettings && (
              <Button text icon="pi pi-cog" rounded size="small" severity="secondary" onClick={() => navigate(`/projects/${id}/settings`)} />
            )}
            <Button
              text
              icon={detailCollapsed ? 'pi pi-chevron-down' : 'pi pi-chevron-up'}
              rounded
              size="small"
              severity="secondary"
              onClick={() => setDetailCollapsed(!detailCollapsed)}
              aria-label={detailCollapsed ? 'Expand' : 'Collapse'}
            />
          </div>
        </div>

        {!detailCollapsed && (
          <>
            <p className="text-color-secondary text-sm mt-2 mb-0">{project.description || 'No description'}</p>

            <div className="flex flex-column sm:flex-row sm:flex-wrap gap-2 sm:column-gap-4 sm:row-gap-1 mt-3 mb-3 text-xs">
              {projectOwnerProfile && project && (
                <span className="text-color-secondary">
                  <i className="pi pi-user mr-1" style={{ fontSize: '0.75rem' }} />
                  Owned by{' '}
                  <UserHoverCard userId={project.ownerId}>
                    <span className="font-bold username-text cursor-pointer">{projectOwnerProfile.username}</span>
                  </UserHoverCard>
                </span>
              )}
              <span className="text-color-secondary">
                <i className="pi pi-calendar-plus mr-1" style={{ fontSize: '0.75rem' }} />
                Created <RelativeTime value={project.createdAt} className="text-color" />
              </span>
              <span className="text-color-secondary">
                <i className="pi pi-clock mr-1" style={{ fontSize: '0.75rem' }} />
                Updated <RelativeTime value={project.updatedAt} className="text-color" />
              </span>
            </div>

            <div className="project-stat-grid">
              <div className="project-stat-tile">
                <i className="pi pi-map text-primary" />
                <div className="project-stat-tile-body">
                  <span className="project-stat-value">{summaryCounts.testPlanCount}</span>
                  <span className="project-stat-label">Test Plan</span>
                </div>
              </div>
              <div className="project-stat-tile">
                <i className="pi pi-check-square text-primary" />
                <div className="project-stat-tile-body">
                  <span className="project-stat-value">{summaryCounts.testCaseCount}</span>
                  <span className="project-stat-label">Test Case</span>
                </div>
              </div>
              <div className="project-stat-tile">
                <i className="pi pi-play-circle text-primary" />
                <div className="project-stat-tile-body">
                  <span className="project-stat-value">{summaryCounts.testRunCount}</span>
                  <span className="project-stat-label">Test Run</span>
                </div>
              </div>
              <div className="project-stat-tile">
                <i className="pi pi-exclamation-circle text-primary" />
                <div className="project-stat-tile-body">
                  <span className="project-stat-value">{summaryCounts.issueCount}</span>
                  <span className="project-stat-label">Issue</span>
                </div>
              </div>
              <div className="project-stat-tile">
                <i className="pi pi-users text-primary" />
                <div className="project-stat-tile-body">
                  <span className="project-stat-value">{summaryCounts.memberCount}</span>
                  <span className="project-stat-label">Member</span>
                </div>
              </div>
            </div>
          </>
        )}
      </Card>

      <TabView scrollable activeIndex={activeTabIndex} onTabChange={(e) => setActiveTabIndex(e.index)}>

        <TabPanel header="Issues">
          <IssueTab
            issues={issues}
            loading={tabLoading[3]}
            isMobile={isMobile}
            search={issueSearch}
            onSearchChange={setIssueSearch}
            statusFilter={issueStatusFilter}
            onStatusFilterChange={setIssueStatusFilter}
            priorityFilter={issuePriorityFilter}
            onPriorityFilterChange={setIssuePriorityFilter}
            moduleFilter={issueModuleFilter}
            onModuleFilterChange={setIssueModuleFilter}
            tagFilter={issueTagFilter}
            onTagFilterChange={setIssueTagFilter}
            typeFilter={issueTypeFilter}
            onTypeFilterChange={setIssueTypeFilter}
            testRoleFilter={issueTestRoleFilter}
            onTestRoleFilterChange={setIssueTestRoleFilter}
            hasActiveFilters={!!issueSearch || issueStatusFilter.length > 0 || issuePriorityFilter.length > 0 || issueModuleFilter.length > 0 || issueTagFilter.length > 0 || issueTypeFilter.length > 0 || issueTestRoleFilter.length > 0}
            onClearFilters={() => { setIssueSearch(''); setIssueStatusFilter([]); setIssuePriorityFilter([]); setIssueModuleFilter([]); setIssueTagFilter([]); setIssueTypeFilter([]); setIssueTestRoleFilter([]); }}
            moduleOptions={moduleOptions}
            tagOptions={tagOptions}
            testRoleOptions={testRoleOptions}
            sortField={issueSortField}
            sortOrder={issueSortOrder}
            onSort={sortHandler(setIssueSortField, setIssueSortOrder)}
            selected={selectedIssues}
            onSelectedChange={setSelectedIssues}
            projectMembers={projectMembers}
            canManageIssues={canManageIssues}
            canDeleteContent={canDeleteContent}
            onCreate={openCreateIssueDialog}
            onEdit={openEditIssueDialog}
            onDuplicate={openDuplicateIssueDialog}
            onBulkDelete={handleBulkDeleteIssues}
            onBulkEdit={handleBulkEditIssues}
            onRowClick={(row) => navigate(`/issues/${row.id}`)}
            onPatchIssue={patchIssue}
            onReload={loadAll}
            onToastSuccess={toastSuccess}
            lazy
            totalRecords={totalIssues}
            first={(issuePage - 1) * issueRowsPerPage}
            rows={issueRowsPerPage}
            onPage={onIssuePage}
          />
        </TabPanel>

        <TabPanel header="Test Plans">
          <TestPlanTab
            plans={testPlans}
            loading={tabLoading[0]}
            isMobile={isMobile}
            projectId={id ?? ''}
            search={planSearch}
            onSearchChange={setPlanSearch}
            statusFilter={planStatusFilter}
            onStatusFilterChange={setPlanStatusFilter}
            hasActiveFilters={!!planSearch || planStatusFilter.length > 0}
            onClearFilters={() => { setPlanSearch(''); setPlanStatusFilter([]); }}
            sortField={planSortField}
            sortOrder={planSortOrder}
            onSort={sortHandler(setPlanSortField, setPlanSortOrder)}
            selected={selectedPlans}
            onSelectedChange={setSelectedPlans}
            canEditContent={canEditContent}
            canDeleteContent={canDeleteContent}
            onCreate={openCreatePlanDialog}
            onEdit={openEditPlanDialog}
            onDuplicate={openDuplicatePlanDialog}
            onDelete={handleDeletePlan}
            onBulkDelete={handleBulkDeletePlans}
            onBulkChangeStatus={handleBulkChangeStatusPlans}
            onPatchPlan={() => queryClient.invalidateQueries({ queryKey: queryKeys.testPlans(id ?? '') })}
            onRowClick={(row) => navigate(`/test-plans/${row.id}`)}
          />
        </TabPanel>

        <TabPanel header="Test Cases">
          <TestCaseTab
            cases={testCases}
            loading={tabLoading[1]}
            isMobile={isMobile}
            search={caseSearch}
            onSearchChange={setCaseSearch}
            statusFilter={caseStatusFilter}
            onStatusFilterChange={setCaseStatusFilter}
            priorityFilter={casePriorityFilter}
            onPriorityFilterChange={setCasePriorityFilter}
            moduleFilter={caseModuleFilter}
            onModuleFilterChange={setCaseModuleFilter}
            tagFilter={caseTagFilter}
            onTagFilterChange={setCaseTagFilter}
            testRoleFilter={caseTestRoleFilter}
            onTestRoleFilterChange={setCaseTestRoleFilter}
            hasActiveFilters={!!caseSearch || caseStatusFilter.length > 0 || casePriorityFilter.length > 0 || caseModuleFilter.length > 0 || caseTagFilter.length > 0 || caseTestRoleFilter.length > 0}
            onClearFilters={() => { setCaseSearch(''); setCaseStatusFilter([]); setCasePriorityFilter([]); setCaseModuleFilter([]); setCaseTagFilter([]); setCaseTestRoleFilter([]); }}
            moduleOptions={moduleOptions}
            tagOptions={tagOptions}
            testRoleOptions={testRoleOptions}
            sortField={caseSortField}
            sortOrder={caseSortOrder}
            onSort={sortHandler(setCaseSortField, setCaseSortOrder)}
            selected={selectedCases}
            onSelectedChange={setSelectedCases}
            canEditContent={canEditContent}
            canDeleteContent={canDeleteContent}
            onCreate={openCreateCaseDialog}
            onImportTemplate={openImportTemplateDialog}
            onImportExcel={() => setImportExcelDialogOpen(true)}
            onEdit={openEditCaseDialog}
            onDuplicate={openDuplicateCaseDialog}
            onArchive={handleArchiveCase}
            onDelete={handleDeleteCase}
            onBulkDelete={handleBulkDeleteCases}
            onBulkEdit={handleBulkEditCases}
            onPatchCase={() => queryClient.invalidateQueries({ queryKey: queryKeys.testCasesWithDetails(id ?? '') })}
            onRowClick={(row) => navigate(`/test-cases/${row.id}?projectId=${id}`)}
          />
        </TabPanel>

        <TabPanel header="Test Runs">
          <TestRunTab
            runs={testRuns}
            loading={tabLoading[2]}
            isMobile={isMobile}
            search={runSearch}
            onSearchChange={setRunSearch}
            statusFilter={runStatusFilter}
            onStatusFilterChange={setRunStatusFilter}
            hasActiveFilters={!!runSearch || runStatusFilter.length > 0}
            onClearFilters={() => { setRunSearch(''); setRunStatusFilter([]); }}
            sortField={runSortField}
            sortOrder={runSortOrder}
            onSort={sortHandler(setRunSortField, setRunSortOrder)}
            selected={selectedRuns}
            onSelectedChange={setSelectedRuns}
            canRunTests={canRunTests}
            canDeleteContent={canDeleteContent}
            onCreate={openCreateRunDialog}
            onDelete={handleDeleteRun}
            onBulkDelete={handleBulkDeleteRuns}
            onRowClick={(row) => navigate(`/test-runs/${row.id}`)}
            onPlanLinkClick={(planId) => navigate(`/test-plans/${planId}`)}
          />
        </TabPanel>

        <TabPanel header="Activity Log">
          {id && <ActivityLogTab projectId={id} />}
        </TabPanel>
      </TabView>

      <TestPlanDialog
        visible={planDialogOpen}
        editing={!!editingPlanId}
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
        onSave={handleSavePlan}
      />

      <DuplicateTestPlanDialog
        visible={duplicatePlanDialogOpen}
        name={duplicatePlanName}
        onNameChange={setDuplicatePlanName}
        error={duplicatePlanError}
        onHide={() => setDuplicatePlanDialogOpen(false)}
        onDuplicate={handleDuplicatePlan}
      />

      <CreateTestRunDialog
        visible={runDialogOpen}
        mode={runMode}
        onModeChange={setRunMode}
        name={runFormName}
        onNameChange={setRunFormName}
        planId={runFormPlanId}
        onPlanIdChange={setRunFormPlanId}
        caseIds={runFormCaseIds}
        onCaseIdsChange={setRunFormCaseIds}
        error={runFormError}
        testPlans={testPlans}
        testCases={runFormCases}
        modules={modules}
        tags={tags}
        testRoles={testRoles}
        onHide={() => setRunDialogOpen(false)}
        onCreate={handleCreateRun}
      />

      <QuickAddDialog
        visible={moduleDialogOpen}
        title="New Module"
        label="Module Name"
        placeholder="ex. Auth, Dashboard"
        showCode
        codeValue={moduleCode}
        onCodeChange={setModuleCode}
        name={moduleName}
        onNameChange={setModuleName}
        error={moduleError}
        onHide={() => setModuleDialogOpen(false)}
        onSave={handleSaveModule}
      />

      <QuickAddDialog
        visible={tagDialogOpen}
        title="New Tag"
        label="Tag"
        placeholder="ex. Regression, Smoke, UI"
        name={newTagName}
        onNameChange={setNewTagName}
        error={tagError}
        onHide={() => setTagDialogOpen(false)}
        onSave={handleSaveTag}
      />

      <QuickAddDialog
        visible={testRoleDialogOpen}
        title="New Test Role"
        label="Role Name"
        placeholder="ex. Admin, Manager, Member"
        name={testRoleName}
        onNameChange={setTestRoleName}
        error={testRoleError}
        onHide={() => setTestRoleDialogOpen(false)}
        onSave={handleSaveTestRole}
      />

      <TestCaseDialog
        visible={caseDialogOpen}
        editing={!!editingCaseId}
        code={caseCode}
        onCodeChange={setCaseCode}
        moduleId={caseModuleId}
        onModuleIdChange={setCaseModuleId}
        moduleOptions={moduleOptions}
        onQuickAddModule={openCreateModuleDialogFromCase}
        priority={casePriority}
        onPriorityChange={setCasePriority}
        targetRoleId={caseTargetRoleId}
        onTargetRoleIdChange={setCaseTargetRoleId}
        testRoleOptions={testRoleOptions}
        onQuickAddTestRole={openCreateTestRoleDialogFromCase}
        title={caseTitle}
        onTitleChange={setCaseTitle}
        objective={caseObjective}
        onObjectiveChange={setCaseObjective}
        preconditions={casePreconditions}
        onPreconditionsChange={setCasePreconditions}
        stepType={caseStepType}
        onStepTypeChange={setCaseStepType}
        steps={caseSteps}
        onStepsChange={setCaseSteps}
        expectedResult={caseExpectedResult}
        onExpectedResultChange={setCaseExpectedResult}
        detailedSteps={caseDetailedSteps}
        onDetailedStepsChange={setCaseDetailedSteps}
        tags={caseTags}
        onTagsChange={setCaseTags}
        tagOptions={caseTagOptions}
        onQuickAddTag={openCreateTagDialogFromCase}
        notes={caseNotes}
        onNotesChange={setCaseNotes}
        error={caseError}
        onHide={() => setCaseDialogOpen(false)}
        onSave={handleSaveCase}
      />

      <ImportCasesDialog
        visible={importTemplateDialogOpen}
        loading={importTemplateLoading}
        onHide={() => setImportTemplateDialogOpen(false)}
        onImport={handleImportFromTemplate}
        excludeProjectId={id}
      />

      <ImportExcelDialog
        visible={importExcelDialogOpen}
        projectId={id ?? ''}
        onHide={() => setImportExcelDialogOpen(false)}
        onImported={loadAll}
      />

      {issueEditor && (
        <IssueEditor
          visible
          onHide={() => setIssueEditor(null)}
          onSave={handleIssueEditorSave}
          onStatusChange={handleIssueEditorStatusChange}
          onAssigneeChange={handleIssueEditorAssigneeChange}
          projectId={id ?? ''}
          mode={issueEditor.mode}
          issueId={issueEditor.issueId}
          projectMembers={projectMembers}
          initialData={issueEditor.initialData ?? null}
          modules={editableModules}
          tags={editableTags}
          testRoles={editableTestRoles}
          onModulesChange={setEditableModules}
          onTagsChange={setEditableTags}
          onTestRolesChange={setEditableTestRoles}
        />
      )}

      <CreateProjectDialog
        visible={settingsDialogOpen}
        editingProject={project}
        onHide={() => setSettingsDialogOpen(false)}
        onSaved={() => {
          setSettingsDialogOpen(false);
          queryClient.invalidateQueries({ queryKey: queryKeys.project(id ?? '') });
          toastSuccess('Project settings updated');
        }}
      />
    </div>
  );
}
