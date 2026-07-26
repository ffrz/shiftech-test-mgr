import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from 'primereact/card';
import { Panel } from 'primereact/panel';
import { Tag } from 'primereact/tag';
import { Button } from 'primereact/button';
import { ProgressBar } from 'primereact/progressbar';
import { Dropdown } from 'primereact/dropdown';
import { Dialog } from 'primereact/dialog';
import { InputTextarea } from 'primereact/inputtextarea';
import { AutoComplete, type AutoCompleteCompleteEvent } from 'primereact/autocomplete';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import SearchInput from '../../components/ui/SearchInput';
import { Toast } from 'primereact/toast';
import { useTestRunDetail } from '../../hooks/useTestRunDetail';
import { useIssuesByTestRun } from '../../hooks/useIssues';
import { useAuthContext } from '../../hooks/useAuth';
import { useProjectRole } from '../../hooks/useProjectRole';
import { testRunService } from '../../services/testRunService';
import { projectMemberService } from '../../services/projectMemberService';
import { issueService } from '../../services/issueService';
import { moduleService } from '../../services/moduleService';
import { tagService } from '../../services/tagService';
import { testPlanService } from '../../services/testPlanService';
import { projectService } from '../../services/projectService';
import { IssueEditor, type IssueFormData } from '../../components/issues/IssueEditor';
import { PageHeader } from '../../components/ui/PageHeader';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import { queryKeys } from '../../hooks/queryKeys';
import type {
  IssueWithDetails,
  Module,
  Tag as DomainTag,
  TestCasePriority,
  TestResultStatus,
} from '../../types/domain';
import {
  ISSUE_PRIORITY_LABEL,
  ISSUE_PRIORITY_SEVERITY,
  ISSUE_TYPE_LABEL,
  ISSUE_TYPE_SEVERITY,
  TEST_CASE_PRIORITY_LABEL,
  TEST_CASE_PRIORITY_SEVERITY,
  TEST_RESULT_STATUS_LABEL,
  TEST_RESULT_STATUS_SEVERITY,
  TEST_RUN_STATUS_LABEL,
  TEST_RUN_STATUS_SEVERITY,
} from '../../helpers/statusLabels';

const RESULT_OPTIONS: { label: string; value: TestResultStatus }[] = [
  { label: 'Not Run', value: 'not_run' },
  { label: 'Pass', value: 'pass' },
  { label: 'Fail', value: 'fail' },
  { label: 'Skip', value: 'skip' },
  { label: 'Blocked', value: 'blocked' },
];

const STATUS_FILTER_OPTIONS: { label: string; value: TestResultStatus }[] = [
  { label: 'Not Run', value: 'not_run' },
  { label: 'Pass', value: 'pass' },
  { label: 'Fail', value: 'fail' },
  { label: 'Skip', value: 'skip' },
  { label: 'Blocked', value: 'blocked' },
];

const PRIORITY_FILTER_OPTIONS: { label: string; value: TestCasePriority }[] = (
  ['low', 'medium', 'high', 'critical'] as const
).map((v) => ({ label: TEST_CASE_PRIORITY_LABEL[v], value: v }));

// Max height for the test case list (left panel) and the right panel — each scrolls
// independently if its content exceeds this, but isn't forced to this height if its
// content is shorter (e.g. the Filter panel is collapsed, or the list has few items).
const MAX_PANEL_HEIGHT = 'calc(100vh - 14rem)';

export function TestRunResultDetailPage() {
  const { id: runId = null } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const resultId = searchParams.get('resultId');
  const navigate = useNavigate();
  const toast = useRef<Toast>(null);
  const { profile: currentProfile } = useAuthContext();

  const queryClient = useQueryClient();
  const { testRun, results, summary, loading, reload } = useTestRunDetail(runId);
  const { reload: reloadRunIssues } = useIssuesByTestRun(runId);

  const { data: testPlan = null } = useQuery({
    queryKey: queryKeys.testPlan(testRun?.testPlanId ?? ''),
    queryFn: () => testPlanService.getById(testRun!.testPlanId!),
    enabled: !!testRun?.testPlanId,
  });

  // Project comes straight off the run itself (test_runs.project_id, E16) — not through
  // testPlan, since a custom/unplanned run has no test_plan_id and therefore no testPlan.
  const projectId = testRun?.projectId;

  const { canRunTests, canManageIssues } = useProjectRole(projectId);
  const isCompleted = testRun?.status === 'completed';

  const { data: projectMembers = [] } = useQuery({
    queryKey: queryKeys.projectMembers(projectId ?? ''),
    queryFn: () => projectMemberService.listByProject(projectId!),
    enabled: !!projectId,
  });

  const { data: project } = useQuery({
    queryKey: queryKeys.project(projectId ?? ''),
    queryFn: () => projectService.getById(projectId!),
    enabled: !!projectId,
  });
  const projectName = project?.name ?? null;

  const { data: modules = [] } = useQuery({
    queryKey: queryKeys.modules(projectId ?? ''),
    queryFn: () => moduleService.listByProject(projectId!),
    enabled: !!projectId,
  });
  const { data: projectTags = [] } = useQuery({
    queryKey: queryKeys.tags(projectId ?? ''),
    queryFn: () => tagService.listByProject(projectId!),
    enabled: !!projectId,
  });

  const activeResult = results.find((r) => r.id === resultId) ?? null;

  // Selecting a test case updates the resultId query param instead of navigating to a
  // different route — keeps this on the same route match as the bare /test-runs/:id URL,
  // so React Router never unmounts/remounts the page (and its breadcrumb) between the two.
  function selectResult(id: string, options?: { replace?: boolean }) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('resultId', id);
        return next;
      },
      { replace: options?.replace },
    );
  }

  // Auto-select the first test case once results have loaded, so opening a run doesn't
  // show a blank "pick a test case" placeholder when there's an obvious first choice.
  // Only fires when the URL doesn't already name a result (fresh open, not a reload/nav).
  // `replace: true` so this doesn't add a spurious back-button entry.
  useEffect(() => {
    if (resultId || results.length === 0) return;
    selectResult(results[0].id, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultId, results]);

  // --- Panel kiri: filter/search ---
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<TestResultStatus | null>(null);
  const [moduleFilter, setModuleFilter] = useState<string | null>(null);
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<TestCasePriority | null>(null);

  const filteredResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    return results.filter((r) => {
      if (statusFilter && r.status !== statusFilter) return false;
      if (priorityFilter && r.testCasePriority !== priorityFilter) return false;
      if (moduleFilter && r.testCase?.moduleId !== moduleFilter) return false;
      if (tagFilter && !r.testCase?.tags.some((t) => t.id === tagFilter)) return false;
      if (q && !r.testCaseTitle.toLowerCase().includes(q) && !r.testCaseCode?.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [results, search, statusFilter, priorityFilter, moduleFilter, tagFilter]);

  // Prev/Next walks the same filtered+ordered list shown in the left panel, so navigating
  // matches what the user sees there rather than the unfiltered run order.
  const activeIndex = activeResult ? filteredResults.findIndex((r) => r.id === activeResult.id) : -1;
  const prevResult = activeIndex > 0 ? filteredResults[activeIndex - 1] : null;
  const nextResult = activeIndex !== -1 && activeIndex < filteredResults.length - 1 ? filteredResults[activeIndex + 1] : null;

  // --- Record result form (inline) ---
  const [resultStatus, setResultStatus] = useState<TestResultStatus>('pass');
  const [resultTesterId, setResultTesterId] = useState<string | null>(null);
  const [resultNotes, setResultNotes] = useState('');

  useEffect(() => {
    if (!activeResult) return;
    setResultStatus(activeResult.status);
    setResultTesterId(activeResult.testerId ?? currentProfile?.id ?? null);
    setResultNotes(activeResult.notes ?? '');
    setRightPanelScrolled(false);
    rightPanelRef.current?.scrollTo({ top: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultId]);

  async function handleSyncResult() {
    if (!runId || !activeResult) return;
    try {
      await testRunService.syncResultWithTestCase(runId, activeResult.id);
      await reload();
      toast.current?.show({ severity: 'success', summary: 'Test case synced' });
    } catch (err) {
      toast.current?.show({ severity: 'error', summary: 'Sync failed', detail: err instanceof Error ? err.message : undefined });
    }
  }

  // Autosave — status/tester/notes each persist as soon as they change, no explicit Save
  // button. Every call re-sends all three current values since recordResult replaces the
  // whole row; only the field that actually changed drives when this fires.
  async function saveResult(next: { status?: TestResultStatus; testerId?: string | null; notes?: string }) {
    if (!activeResult) return;
    const status = next.status ?? resultStatus;
    const testerId = next.testerId ?? resultTesterId;
    const notes = next.notes ?? resultNotes;
    if (!testerId) return;
    await testRunService.recordResult(activeResult.id, testerId, status, notes.trim() || null);
    await reload();
    // Pass/fail counts shown in the run summary lists on ProjectDetailPage/TestPlanDetailPage
    // come from this same recorded result — keep them in sync too.
    await invalidateTestRunSummaries();
  }

  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [notesDraft, setNotesDraft] = useState('');

  function openNotesDialog() {
    setNotesDraft(resultNotes);
    setNotesDialogOpen(true);
  }

  async function handleSaveNotes() {
    setResultNotes(notesDraft);
    setNotesDialogOpen(false);
    await saveResult({ notes: notesDraft });
    toast.current?.show({ severity: 'success', summary: 'Notes saved' });
  }

  async function handleClearNotes() {
    setResultNotes('');
    setNotesDialogOpen(false);
    await saveResult({ notes: '' });
    toast.current?.show({ severity: 'success', summary: 'Notes cleared' });
  }

  // --- Link Issue: AutoComplete (no dialog, no MultiSelect) — type to search server-side,
  // pick a suggestion to link it immediately. Suggestions exclude already-linked issues so
  // there's no duplicate info between the input and the linked list below it.
  const [linkedIssues, setLinkedIssues] = useState<IssueWithDetails[]>([]);
  const [linkedIssueIds, setLinkedIssueIds] = useState<Set<string>>(new Set());
  const [issueQuery, setIssueQuery] = useState('');
  const [issueSuggestions, setIssueSuggestions] = useState<IssueWithDetails[]>([]);

  useEffect(() => {
    // activeResult resolves from `results`, which loads asynchronously — on a fresh page
    // load resultId is already set from the URL before results has been fetched, so this
    // effect must also re-run once activeResult itself resolves (not just resultId), or the
    // linked-issues fetch below never fires and the card stays empty. Depend on
    // activeResult?.id rather than the object itself, so a reload() that produces a new
    // `results` array reference doesn't refetch this unnecessarily.
    if (!activeResult) return;
    issueService.listByTestResult(activeResult.id).then((linked) => {
      setLinkedIssues(linked);
      setLinkedIssueIds(new Set(linked.map((i) => i.id)));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultId, activeResult?.id]);

  async function refreshLinkedIssues() {
    if (!activeResult) return;
    const linked = await issueService.listByTestResult(activeResult.id);
    setLinkedIssues(linked);
    setLinkedIssueIds(new Set(linked.map((i) => i.id)));
    await reloadRunIssues();
  }

  // On focus (empty query) this fetches a plain first page; once the user types, each
  // keystroke re-queries the server (title/code ilike) instead of filtering a client cache.
  async function searchIssues(e: AutoCompleteCompleteEvent) {
    if (!projectId) return;
    const found = await issueService.listByProject(projectId, { search: e.query, limit: 20 });
    setIssueSuggestions(found.filter((i) => !linkedIssueIds.has(i.id)));
  }

  async function handlePickIssue(issue: IssueWithDetails) {
    if (!activeResult) return;
    setIssueQuery('');
    await issueService.linkToTestResult(issue.id, activeResult.id);
    await refreshLinkedIssues();
  }

  function handleUnlinkIssue(issue: IssueWithDetails) {
    if (!activeResult) return;
    confirmDialog({
      header: 'Unlink Issue',
      message: `Issue "${issue.code} — ${issue.title}" will be unlinked from this test case. The issue itself will not be deleted. Continue?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Unlink',
      rejectLabel: 'Cancel',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        await issueService.unlinkFromTestResult(issue.id, activeResult!.id);
        await refreshLinkedIssues();
      },
    });
  }

  // --- Create Issue via shared IssueEditor, auto-links to activeResult on save ---
  const [issueEditorOpen, setIssueEditorOpen] = useState(false);
  const [issueEditorInitialData, setIssueEditorInitialData] = useState<IssueFormData | null>(null);

  // Mutable copies so IssueEditor's quick-add can extend them without cache invalidation.
  const [editableModules, setEditableModules] = useState<Module[]>([]);
  const [editableTags, setEditableTags] = useState<DomainTag[]>([]);
  if (editableModules.length === 0 && modules.length > 0) setEditableModules(modules);
  if (editableTags.length === 0 && projectTags.length > 0) setEditableTags(projectTags);

  function openCreateIssueDialog() {
    if (!activeResult) return;
    setIssueEditorInitialData({
      title: activeResult.status === 'fail' ? `${activeResult.testCaseTitle} failed` : '',
      type: 'bug',
      priority: 'medium',
      moduleId: null,
      description: '',
      actualResult: '',
      expectedResult: activeResult.testCaseExpectedResult,
      tagNames: [],
      githubLinks: [],
    });
    setIssueEditorOpen(true);
  }

  async function handleIssueEditorSave(data: IssueFormData) {
    if (!activeResult || !projectId) return;
    await issueService.create({
      projectId,
      linkToTestResultId: activeResult.id,
      moduleId: data.moduleId,
      type: data.type,
      tagNames: data.tagNames,
      title: data.title,
      description: data.description,
      actualResult: data.actualResult,
      expectedResult: data.expectedResult,
      priority: data.priority,
    });
    setIssueEditorOpen(false);
    setIssueEditorInitialData(null);
    await refreshLinkedIssues();
    toast.current?.show({ severity: 'success', summary: 'Issue created and linked' });
  }

  // --- Complete run dialog ---
  // Shadow below the Prev/Next toolbar only appears once the content below it has scrolled —
  // a visual cue that "there's more content above", not permanent decoration.
  const [rightPanelScrolled, setRightPanelScrolled] = useState(false);
  const rightPanelRef = useRef<HTMLDivElement>(null);

  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [completeNotes, setCompleteNotes] = useState('');

  function openCompleteDialog() {
    setCompleteNotes(testRun?.notes ?? '');
    setCompleteDialogOpen(true);
  }

  // Test run status also feeds the summary list shown on ProjectDetailPage's Test Runs tab
  // and TestPlanDetailPage — those pages read different query keys (testRunsByProject /
  // testRunsByPlan) than this page's own testRun/testRunResults, so completing or reopening
  // a run here has to invalidate those too or they'd keep showing the old status until a
  // manual refresh.
  async function invalidateTestRunSummaries() {
    if (!projectId) return;
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.testRunsByProject(projectId) }),
      ...(testPlan ? [queryClient.invalidateQueries({ queryKey: queryKeys.testRunsByPlan(testPlan.id) })] : []),
    ]);
  }

  async function handleCompleteRun() {
    if (!runId) return;
    await testRunService.complete(runId, completeNotes.trim() || null);
    setCompleteDialogOpen(false);
    await reload();
    await invalidateTestRunSummaries();
    toast.current?.show({ severity: 'success', summary: 'Test run completed' });
  }

  async function handleReopenRun() {
    if (!runId) return;
    await testRunService.reopen(runId);
    await reload();
    await invalidateTestRunSummaries();
  }

  const moduleOptions = modules.map((m) => ({ label: m.name, value: m.id }));
  const tagOptions = projectTags.map((t) => ({ label: t.name, value: t.id }));

  return (
    <div className="page-fade-in">
      <Toast ref={toast} />
      <ConfirmDialog />

      <Breadcrumb
        items={[
          { label: 'Projects', path: '/projects' },
          { label: projectId ? (projectName ?? '…') : '…', path: projectId ? `/projects/${projectId}` : undefined },
          // Custom/unplanned runs (E16) have no test_plan_id — skip this crumb entirely
          // instead of showing a permanently-unresolved "…".
          ...(testRun?.testPlanId
            ? [{ label: testPlan ? testPlan.code : '…', path: testPlan ? `/test-plans/${testPlan.id}` : undefined }]
            : []),
          { label: testRun ? testRun.code : '…', path: testRun ? `/test-runs/${testRun.id}` : undefined },
        ]}
      />

      <PageHeader
        title={testRun ? `${testRun.code} — ${testRun.name}` : 'Test Run'}
        actions={
          canRunTests ? (
            testRun?.status === 'completed' ? (
              <Button label="Reopen" icon="pi pi-replay" size="small" severity="secondary" outlined onClick={handleReopenRun} />
            ) : (
              <Button label="Complete Run" icon="pi pi-check" size="small" onClick={openCompleteDialog} />
            )
          ) : undefined
        }
      />

      {/* --- Summary/progress: always visible, doesn't scroll with either panel --- */}
      {testRun && (
        <div className="flex align-items-center flex-wrap gap-2 mb-3">
          <Tag value={TEST_RUN_STATUS_LABEL[testRun.status]} severity={TEST_RUN_STATUS_SEVERITY[testRun.status]} />
          <span className="text-color-secondary text-sm">
            {summary.pass} pass · {summary.fail} fail · {summary.skip} skip · {summary.blocked} blocked · {summary.notRun} not run
          </span>
          {testPlan && (
            <span className="text-color-secondary text-sm">
              · Test Plan:{' '}
              <a className="entity-link" onClick={() => navigate(`/test-plans/${testPlan.id}`)}>
                {testPlan.code} - {testPlan.name}
              </a>
            </span>
          )}
        </div>
      )}

      {testRun?.notes && (
        <div className="mb-3 p-0 surface-100 border-round">
          <div className="text-sm font-medium mb-1">Notes</div>
          <div className="text-sm white-space-pre-line">{testRun.notes}</div>
        </div>
      )}

      <div className="mb-4">
        <div className="flex justify-content-between mb-1">
          <span>
            {summary.executed} / {summary.total} executed
          </span>
          <span>{summary.progressPercent}%</span>
        </div>
        <ProgressBar value={summary.progressPercent} showValue={false} />
      </div>

      <div className="grid">
        {/* --- Panel kiri: daftar test case + filter (scroll independen) --- */}
        <div className="col-12 md:col-4 test-run-detail-filter">
          <Panel
            header="Test Cases"
            toggleable
            collapsed
            expandIcon="pi pi-filter"
            collapseIcon="pi pi-filter"
            style={{
              borderBottom: 'none',
              borderBottomLeftRadius: 0,
              borderBottomRightRadius: 0,
            }}
          >
            <div className="flex flex-column gap-1">
              <SearchInput value={search} onChange={setSearch} placeholder="Search title/code..." />
              <Dropdown value={statusFilter} options={STATUS_FILTER_OPTIONS} onChange={(e) => setStatusFilter(e.value)} placeholder="All Statuses" showClear className="w-full" />
              <Dropdown value={priorityFilter} options={PRIORITY_FILTER_OPTIONS} onChange={(e) => setPriorityFilter(e.value)} placeholder="All Priorities" showClear className="w-full" />
              <Dropdown value={moduleFilter} options={moduleOptions} onChange={(e) => setModuleFilter(e.value)} placeholder="All Modules" showClear className="w-full" />
              <Dropdown value={tagFilter} options={tagOptions} onChange={(e) => setTagFilter(e.value)} placeholder="All Tags" showClear className="w-full" />
            </div>
          </Panel>

          <div
            className="flex flex-column gap-1"
            style={{
              maxHeight: MAX_PANEL_HEIGHT,
              overflowY: 'auto',
              border: '1px solid var(--surface-border)',
              borderTop: 'none',
              borderTopLeftRadius: 0,
              borderTopRightRadius: 0,
              borderBottomLeftRadius: 'var(--border-radius, 6px)',
              borderBottomRightRadius: 'var(--border-radius, 6px)',
            }}
          >
            {!loading && filteredResults.length === 0 && <p className="text-color-secondary text-sm px-2">No matching test cases.</p>}
            {filteredResults.map((r, index) => (
              <div
                key={r.id}
                onClick={() => selectResult(r.id)}
                className="p-2 border-round cursor-pointer flex align-items-start gap-2"
                style={{
                  backgroundColor: r.id === resultId ? 'var(--primary-color)' : undefined,
                  color: r.id === resultId ? 'var(--primary-color-text)' : undefined,
                }}
              >
                <span
                  className={`text-sm flex-shrink-0 ${r.id === resultId ? '' : 'text-color-secondary'}`}
                  style={{ minWidth: '1.5rem' }}
                >
                  {index + 1}.
                </span>
                <div className="flex flex-column gap-1 flex-grow-1">
                  <div className="flex align-items-center justify-content-between gap-2">
                    <span className="text-sm font-medium">{r.testCaseCode}</span>
                    {loading && r.id === resultId ? (
                      <i className="pi pi-spin pi-spinner text-sm" />
                    ) : (
                      <Tag value={TEST_RESULT_STATUS_LABEL[r.status]} severity={TEST_RESULT_STATUS_SEVERITY[r.status]} />
                    )}
                  </div>
                  <span className="text-sm">{r.testCaseTitle}</span>
                  {r.testCase && r.testCase.tags.length > 0 && (
                    <span className="flex flex-wrap gap-1">
                      {r.testCase.tags.map((tag) => (
                        <Tag key={tag.id} value={tag.name} severity="info" />
                      ))}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* --- Right panel: summary (default) or selected test case detail (scrolls independently) --- */}
        <div className="col-12 md:col-8 flex flex-column" style={{ height: MAX_PANEL_HEIGHT }}>
          {activeResult && (
            <div
              className="flex align-items-center justify-content-between gap-2 mb-3 p-2 flex-shrink-0"
              style={{
                boxShadow: rightPanelScrolled ? '0 2px 4px -2px rgba(0, 0, 0, 0.15)' : 'none',
                transition: 'box-shadow 0.15s ease',
              }}
            >
              <Button
                label="Previous"
                icon="pi pi-chevron-left"
                size="small"
                outlined
                disabled={!prevResult}
                onClick={() => prevResult && selectResult(prevResult.id)}
              />
              <span className="text-color-secondary text-sm">
                {activeIndex + 1} / {filteredResults.length}
              </span>
              <Button
                label="Next"
                icon="pi pi-chevron-right"
                iconPos="right"
                size="small"
                outlined
                disabled={!nextResult}
                onClick={() => nextResult && selectResult(nextResult.id)}
              />
            </div>
          )}

          <div
            ref={rightPanelRef}
            className="flex-grow-1"
            style={{ overflowY: 'auto' }}
            onScroll={(e) => setRightPanelScrolled(e.currentTarget.scrollTop > 0)}
          >
            {!activeResult ? (
              <Card>
                <p className="text-color-secondary m-0">Select a test case in the left panel to record a result, view details, or link an issue.</p>
              </Card>
            ) : (
              <>
                <Card className="mb-3">
                  <div className="flex align-items-center justify-content-between gap-2 mb-1">
                    <div className="flex align-items-center gap-2">
                      <h2 className="m-0">{activeResult.testCaseCode} — {activeResult.testCaseTitle}</h2>
                      <Tag value={TEST_CASE_PRIORITY_LABEL[activeResult.testCasePriority]} severity={TEST_CASE_PRIORITY_SEVERITY[activeResult.testCasePriority]} />
                      <Tag value={TEST_RESULT_STATUS_LABEL[activeResult.status]} severity={TEST_RESULT_STATUS_SEVERITY[activeResult.status]} />
                    </div>
                  </div>

                  <div className="flex flex-wrap align-items-center justify-content-between gap-2 mt-2 mb-1 text-sm">
                    <div className="flex flex-wrap align-items-center gap-4">
                      <span className="text-color-secondary">
                        Module: <span className="text-color">{activeResult.testCase?.module?.name ?? '-'}</span>
                      </span>
                      {activeResult.testCase?.targetRole && <Tag value={activeResult.testCase.targetRole.name} severity="secondary" />}
                      {activeResult.testCase && activeResult.testCase.tags.length > 0 && (
                        <span className="flex flex-wrap gap-1">
                          {activeResult.testCase.tags.map((tag) => (
                            <Tag key={tag.id} value={tag.name} severity="info" />
                          ))}
                        </span>
                      )}
                    </div>
                    {canRunTests && testRun?.status !== 'completed' && activeResult.testCase && (
                      <div className="flex gap-2">
                        <Button label="Sync Original" icon="pi pi-sync" size="small" text onClick={handleSyncResult} />
                        <Button
                          label="View Original"
                          icon="pi pi-external-link"
                          size="small"
                          text
                          onClick={() => navigate(`/test-cases/${activeResult.testCase!.id}?projectId=${projectId ?? ''}`)}
                        />
                      </div>
                    )}
                  </div>

                  {activeResult.testCase && activeResult.testCase.updatedAt > activeResult.updatedAt && (
                    <small className="text-color-secondary">
                      <i className="pi pi-info-circle mr-1" />
                      The original test case has been updated since this run started — this view is a snapshot taken when the run was created.
                    </small>
                  )}

                  {activeResult.testCaseObjective && (
                    <div className="mt-3">
                      <label className="block text-color-secondary text-sm mb-1">Objective</label>
                      <p className="m-0">{activeResult.testCaseObjective}</p>
                    </div>
                  )}

                  {activeResult.testCasePreconditions && (
                    <div className="mt-3">
                      <label className="block text-color-secondary text-sm mb-1">Preconditions</label>
                      <p className="m-0" style={{ whiteSpace: 'pre-wrap' }}>{activeResult.testCasePreconditions}</p>
                    </div>
                  )}

                  {canRunTests && (
                    <div className="mt-3">
                      <div className="flex align-items-center gap-2 mb-1">
                        <label className="block text-color-secondary text-sm m-0">Notes</label>
                        <Button
                          icon="pi pi-pencil"
                          text
                          rounded
                          size="small"
                          aria-label="Edit notes"
                          onClick={openNotesDialog}
                          disabled={isCompleted}
                          style={{ width: '1.5rem', height: '1.5rem' }}
                        />
                      </div>
                      {resultNotes ? (
                        <p className="m-0" style={{ whiteSpace: 'pre-wrap' }}>{resultNotes}</p>
                      ) : (
                        <p className="m-0 text-color-secondary" style={{ fontStyle: 'italic' }}>No notes</p>
                      )}
                    </div>
                  )}
                </Card>

                {canRunTests && (
                  <Card title="Execution Result" className="mb-3">
                    <div className="flex flex-column gap-3">
                      <div className="grid">
                        <div className="col-12 md:col-6 flex flex-column gap-1">
                          <label htmlFor="result-status">Status</label>
                          <Dropdown
                            id="result-status"
                            value={resultStatus}
                            options={RESULT_OPTIONS}
                            onChange={(e) => {
                              setResultStatus(e.value);
                              saveResult({ status: e.value });
                            }}
                            className="w-full"
                            disabled={isCompleted}
                          />
                        </div>
                        <div className="col-12 md:col-6 flex flex-column gap-1">
                          <label htmlFor="result-tester">Tester</label>
                          <Dropdown
                            id="result-tester"
                            value={resultTesterId}
                            options={projectMembers.map((m) => ({ label: m.profile.displayName ?? m.profile.username, value: m.userId }))}
                            onChange={(e) => {
                              setResultTesterId(e.value);
                              saveResult({ testerId: e.value });
                            }}
                            className="w-full"
                            disabled={isCompleted}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-color-secondary text-sm mb-1">Expected Result</label>
                        <p className="m-0" style={{ whiteSpace: 'pre-wrap' }}>{activeResult.testCaseExpectedResult}</p>
                      </div>

                      {/* One consistent slot for "Test Steps" — simple test cases render as
                          free text, detailed ones render as a per-step checklist (each step
                          also carries its own expected result). */}
                      {activeResult.stepResults.length === 0 ? (
                        <div>
                          <label className="block text-color-secondary text-sm mb-1">Test Steps</label>
                          <p className="m-0" style={{ whiteSpace: 'pre-wrap' }}>{activeResult.testCaseSteps}</p>
                        </div>
                      ) : (
                        <div className="flex flex-column gap-2">
                          <label>Test Steps</label>
                          {activeResult.stepResults.map((sr) => (
                            <div key={sr.id} className="flex align-items-start gap-2 p-2 border-round surface-100">
                              <div className="text-sm flex-grow-1">
                                <div>{sr.step.stepNumber}. {sr.step.action}</div>
                                {sr.step.expectedResult && (
                                  <div className="text-color-secondary mt-1">
                                    Expected: {sr.step.expectedResult}
                                  </div>
                                )}
                              </div>
                              <Dropdown
                                value={sr.status === 'not_run' ? null : sr.status}
                                options={[{ label: 'Pass', value: 'pass' }, { label: 'Fail', value: 'fail' }]}
                                placeholder="-"
                                onChange={async (e) => {
                                  await testRunService.recordStepResult(sr.id, e.value, sr.actualResult);
                                  await reload();
                                }}
                                className="w-8rem"
                                disabled={isCompleted}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </Card>
                )}

                {canManageIssues && (
                  <Card
                    title="Issues"
                    className="mb-3"
                    subTitle={linkedIssues.length > 0 ? `${linkedIssues.length} linked issue(s)` : undefined}
                  >
                    <div className="flex flex-column gap-2">
                      <div className="flex align-items-center gap-2">
                        <AutoComplete
                          value={issueQuery}
                          suggestions={issueSuggestions}
                          completeMethod={searchIssues}
                          field="title"
                          itemTemplate={(issue: IssueWithDetails) => (
                            <span className="text-sm">
                              <Tag value={ISSUE_TYPE_LABEL[issue.type]} severity={ISSUE_TYPE_SEVERITY[issue.type]} className="mr-2" />
                              <span className="font-medium">{issue.code}</span> — {issue.title}
                            </span>
                          )}
                          onChange={(e) => setIssueQuery(typeof e.value === 'string' ? e.value : '')}
                          onSelect={(e) => handlePickIssue(e.value as IssueWithDetails)}
                          placeholder="Browse existing issues..."
                          className="flex-grow-1"
                          inputClassName="w-full"
                        />
                        <Button label="New Issue" icon="pi pi-plus" size="small" onClick={openCreateIssueDialog} />
                      </div>
                      {linkedIssues.length === 0 && (
                        <p className="text-color-secondary text-sm m-0">No issues linked to this test case yet.</p>
                      )}
                      {linkedIssues.map((issue) => (
                        <div key={issue.id} className="flex align-items-center justify-content-between gap-2 p-2 border-round surface-100">
                          <a
                            href={`/app/issues/${issue.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-color entity-link no-underline flex-grow-1"
                          >
                            <Tag value={ISSUE_TYPE_LABEL[issue.type]} severity={ISSUE_TYPE_SEVERITY[issue.type]} className="mr-2" />
                            <span className="font-medium">{issue.code}</span> — {issue.title}
                          </a>
                          <Tag value={ISSUE_PRIORITY_LABEL[issue.priority]} severity={ISSUE_PRIORITY_SEVERITY[issue.priority]} />
                          <Button
                            icon="pi pi-times"
                            size="small"
                            text
                            severity="secondary"
                            aria-label="Unlink"
                            onClick={() => handleUnlinkIssue(issue)}
                          />
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* --- Create Issue via shared IssueEditor, auto-links to activeResult --- */}
      {issueEditorOpen && (
        <IssueEditor
          visible
          onHide={() => { setIssueEditorOpen(false); setIssueEditorInitialData(null); }}
          onSave={handleIssueEditorSave}
          projectId={projectId ?? ''}
          mode="create"
          initialData={issueEditorInitialData}
          modules={editableModules}
          tags={editableTags}
          onModulesChange={setEditableModules}
          onTagsChange={setEditableTags}
        />
      )}

      {/* --- Notes Dialog: execution result notes, autosaved on save --- */}
      <Dialog header="Add notes" visible={notesDialogOpen} onHide={() => setNotesDialogOpen(false)} style={{ width: '28rem' }}>
        <div className="flex flex-column gap-3">
          <InputTextarea value={notesDraft} onChange={(e) => setNotesDraft(e.target.value)} rows={5} autoFocus />
          <div className="flex gap-2">
            <Button label="Save" size="small" onClick={handleSaveNotes} />
            {resultNotes && (
              <Button label="Clear Notes" size="small" text severity="danger" onClick={handleClearNotes} />
            )}
          </div>
        </div>
      </Dialog>

      {/* --- Complete Run Dialog --- */}
      <Dialog header="Complete Test Run" visible={completeDialogOpen} onHide={() => setCompleteDialogOpen(false)} style={{ width: '28rem' }}>
        <div className="flex flex-column gap-3">
          <p className="m-0 text-sm text-color-secondary">
            This test run will be marked as completed. You can reopen it at any time.
          </p>
          <div className="flex flex-column gap-1">
            <label htmlFor="complete-notes">Notes (optional)</label>
            <InputTextarea
              id="complete-notes"
              value={completeNotes}
              onChange={(e) => setCompleteNotes(e.target.value)}
              rows={3}
              placeholder="E.g. blockers, environment notes, follow-ups..."
              autoFocus
            />
          </div>
          <Button label="Complete" icon="pi pi-check" size="small" onClick={handleCompleteRun} />
        </div>
      </Dialog>
    </div>
  );
}
