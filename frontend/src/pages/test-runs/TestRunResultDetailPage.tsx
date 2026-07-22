import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Card } from 'primereact/card';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Panel } from 'primereact/panel';
import { Tag } from 'primereact/tag';
import { Button } from 'primereact/button';
import { ProgressBar } from 'primereact/progressbar';
import { Dropdown } from 'primereact/dropdown';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { MultiSelect } from 'primereact/multiselect';
import { IconField } from 'primereact/iconfield';
import { InputIcon } from 'primereact/inputicon';
import { ConfirmDialog } from 'primereact/confirmdialog';
import { Toast } from 'primereact/toast';
import { useTestRunDetail } from '../../hooks/useTestRunDetail';
import { useIssuesByTestRun } from '../../hooks/useIssues';
import { useAuthContext } from '../../hooks/useAuth';
import { useProjectRole } from '../../hooks/useProjectRole';
import { testRunService } from '../../services/testRunService';
import { profileService } from '../../services/profileService';
import { issueService } from '../../services/issueService';
import { moduleService } from '../../services/moduleService';
import { tagService } from '../../services/tagService';
import { testPlanService } from '../../services/testPlanService';
import { projectService } from '../../services/projectService';
import { PageHeader } from '../../components/ui/PageHeader';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import { formatDateTime } from '../../helpers/dateFormatter';
import type {
  IssuePriority,
  IssueType,
  IssueWithDetails,
  Module,
  Profile,
  Tag as TagEntity,
  TestCasePriority,
  TestPlan,
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
  { label: 'Belum Dites', value: 'not_run' },
  { label: 'Pass', value: 'pass' },
  { label: 'Fail', value: 'fail' },
  { label: 'Skip', value: 'skip' },
  { label: 'Blocked', value: 'blocked' },
];

const STATUS_FILTER_OPTIONS: { label: string; value: TestResultStatus }[] = [
  { label: 'Belum Dites', value: 'not_run' },
  { label: 'Pass', value: 'pass' },
  { label: 'Fail', value: 'fail' },
  { label: 'Skip', value: 'skip' },
  { label: 'Blocked', value: 'blocked' },
];

const PRIORITY_FILTER_OPTIONS: { label: string; value: TestCasePriority }[] = (
  ['low', 'medium', 'high', 'critical'] as const
).map((v) => ({ label: TEST_CASE_PRIORITY_LABEL[v], value: v }));

// Batas tinggi maksimum daftar test case (panel kiri) dan panel kanan — masing-masing
// scroll independen kalau kontennya melebihi ini, tapi tidak dipaksa setinggi ini kalau
// isinya lebih pendek (mis. Panel Filter sedang collapsed, atau list test case sedikit).
const MAX_PANEL_HEIGHT = 'calc(100vh - 14rem)';

export function TestRunResultDetailPage() {
  const { id: runId = null } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const resultId = searchParams.get('resultId');
  const navigate = useNavigate();
  const toast = useRef<Toast>(null);
  const { profile: currentProfile } = useAuthContext();

  const { testRun, results, summary, loading, reload } = useTestRunDetail(runId);
  const { reload: reloadRunIssues } = useIssuesByTestRun(runId);
  const [approvedUsers, setApprovedUsers] = useState<Profile[]>([]);
  const [testPlan, setTestPlan] = useState<TestPlan | null>(null);
  const [projectName, setProjectName] = useState<string | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [projectTags, setProjectTags] = useState<TagEntity[]>([]);
  const { canRunTests, canManageIssues } = useProjectRole(testPlan?.projectId);

  const activeResult = results.find((r) => r.id === resultId) ?? null;

  // Selecting a test case updates the resultId query param instead of navigating to a
  // different route — keeps this on the same route match as the bare /test-runs/:id URL,
  // so React Router never unmounts/remounts the page (and its breadcrumb) between the two.
  function selectResult(id: string) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('resultId', id);
      return next;
    });
  }

  useEffect(() => {
    profileService.listAll().then((all) => setApprovedUsers(all.filter((p) => p.role === 'user' || p.role === 'admin')));
  }, []);

  useEffect(() => {
    if (testRun) testPlanService.getById(testRun.testPlanId).then(setTestPlan);
  }, [testRun]);

  useEffect(() => {
    if (testPlan) {
      projectService.getById(testPlan.projectId).then((p) => setProjectName(p?.name ?? null));
      moduleService.listByProject(testPlan.projectId).then(setModules);
      tagService.listByProject(testPlan.projectId).then(setProjectTags);
    }
  }, [testPlan]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultId]);

  async function handleSyncResult() {
    if (!runId || !activeResult) return;
    try {
      await testRunService.syncResultWithTestCase(runId, activeResult.id);
      await reload();
      toast.current?.show({ severity: 'success', summary: 'Test case disinkronkan' });
    } catch (err) {
      toast.current?.show({ severity: 'error', summary: 'Gagal sync', detail: err instanceof Error ? err.message : undefined });
    }
  }

  async function handleSaveResult() {
    if (!activeResult || !resultTesterId) return;
    await testRunService.recordResult(activeResult.id, resultTesterId, resultStatus, resultNotes.trim() || null);
    await reload();
    toast.current?.show({ severity: 'success', summary: 'Hasil tersimpan' });
  }

  // --- Link Issue: browse dialog (pick existing) + nested create dialog (auto-links on save) ---
  const [browseDialogOpen, setBrowseDialogOpen] = useState(false);
  const [linkedIssues, setLinkedIssues] = useState<IssueWithDetails[]>([]);
  const [projectIssues, setProjectIssues] = useState<IssueWithDetails[]>([]);
  const [linkedIssueIds, setLinkedIssueIds] = useState<Set<string>>(new Set());
  const [browseSearch, setBrowseSearch] = useState('');

  useEffect(() => {
    if (!activeResult) return;
    issueService.listByTestResult(activeResult.id).then(setLinkedIssues);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultId]);

  async function openBrowseDialog() {
    if (!activeResult || !testPlan) return;
    setBrowseSearch('');
    setBrowseDialogOpen(true);
    const [allIssues, linked] = await Promise.all([
      issueService.listByProject(testPlan.projectId),
      issueService.listByTestResult(activeResult.id),
    ]);
    setProjectIssues(allIssues);
    setLinkedIssueIds(new Set(linked.map((i) => i.id)));
  }

  const filteredProjectIssues = useMemo(() => {
    const q = browseSearch.trim().toLowerCase();
    if (!q) return projectIssues;
    return projectIssues.filter((i) => i.title.toLowerCase().includes(q) || i.code.toLowerCase().includes(q));
  }, [projectIssues, browseSearch]);

  async function refreshLinkedIssues() {
    if (!activeResult) return;
    setLinkedIssues(await issueService.listByTestResult(activeResult.id));
    await reloadRunIssues();
  }

  async function handleToggleLink(issueId: string, linked: boolean) {
    if (!activeResult) return;
    if (linked) {
      await issueService.linkToTestResult(issueId, activeResult.id);
    } else {
      await issueService.unlinkFromTestResult(issueId, activeResult.id);
    }
    setLinkedIssueIds((prev) => {
      const next = new Set(prev);
      if (linked) next.add(issueId);
      else next.delete(issueId);
      return next;
    });
    await refreshLinkedIssues();
  }

  // --- Create Issue dialog (nested inside Browse) — full form, auto-links to activeResult on save ---
  const [createIssueDialogOpen, setCreateIssueDialogOpen] = useState(false);
  const [issueTitle, setIssueTitle] = useState('');
  const [issueType, setIssueType] = useState<IssueType>('bug');
  const [issueModuleId, setIssueModuleId] = useState<string | null>(null);
  const [issueTagNames, setIssueTagNames] = useState<string[]>([]);
  const [issueDescription, setIssueDescription] = useState('');
  const [issueActual, setIssueActual] = useState('');
  const [issueExpected, setIssueExpected] = useState('');
  const [issuePriority, setIssuePriority] = useState<IssuePriority>('medium');
  const [issueError, setIssueError] = useState<string | null>(null);

  function openCreateIssueDialog() {
    if (!activeResult) return;
    setIssueTitle(activeResult.status === 'fail' ? `${activeResult.testCaseTitle} gagal` : '');
    setIssueType('bug');
    setIssueModuleId(null);
    setIssueTagNames([]);
    setIssueDescription('');
    setIssueActual('');
    setIssueExpected(activeResult.testCaseExpectedResult);
    setIssuePriority('medium');
    setIssueError(null);
    setCreateIssueDialogOpen(true);
  }

  async function handleCreateAndLinkIssue() {
    if (!activeResult || !testPlan) return;
    setIssueError(null);
    try {
      await issueService.create({
        projectId: testPlan.projectId,
        linkToTestResultId: activeResult.id,
        moduleId: issueModuleId,
        type: issueType,
        tagNames: issueTagNames,
        title: issueTitle,
        description: issueDescription,
        actualResult: issueActual,
        expectedResult: issueExpected,
        priority: issuePriority,
      });
      setCreateIssueDialogOpen(false);
      await refreshLinkedIssues();
      if (testPlan) setProjectIssues(await issueService.listByProject(testPlan.projectId));
      toast.current?.show({ severity: 'success', summary: 'Issue dibuat dan ditautkan' });
    } catch (err) {
      setIssueError(err instanceof Error ? err.message : 'Gagal membuat issue');
    }
  }

  // --- Complete run dialog ---
  // Shadow di bawah toolbar Prev/Next hanya muncul saat konten di bawahnya sudah discroll —
  // penanda visual "ada lebih banyak konten di atas", bukan dekorasi permanen.
  const [rightPanelScrolled, setRightPanelScrolled] = useState(false);

  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [completeNotes, setCompleteNotes] = useState('');

  function openCompleteDialog() {
    setCompleteNotes(testRun?.notes ?? '');
    setCompleteDialogOpen(true);
  }

  async function handleCompleteRun() {
    if (!runId) return;
    await testRunService.complete(runId, completeNotes.trim() || null);
    setCompleteDialogOpen(false);
    await reload();
    toast.current?.show({ severity: 'success', summary: 'Test run diselesaikan' });
  }

  async function handleReopenRun() {
    if (!runId) return;
    await testRunService.reopen(runId);
    await reload();
  }

  const moduleOptions = modules.map((m) => ({ label: m.name, value: m.id }));
  const tagOptions = projectTags.map((t) => ({ label: t.name, value: t.id }));

  return (
    <div className="page-fade-in">
      <Toast ref={toast} />
      <ConfirmDialog />

      <Breadcrumb
        items={[
          { label: 'Projects', path: '/' },
          { label: testPlan ? (projectName ?? '…') : '…', path: testPlan ? `/projects/${testPlan.projectId}` : undefined },
          { label: testPlan ? testPlan.code : '…', path: testPlan ? `/test-plans/${testPlan.id}` : undefined },
          { label: testRun ? testRun.code : '…', path: testRun ? `/test-runs/${testRun.id}` : undefined },
        ]}
      />

      <PageHeader
        title={testRun ? `${testRun.code} — ${testRun.name}` : 'Test Run'}
        actions={
          canRunTests ? (
            testRun?.status === 'completed' ? (
              <Button label="Buka Kembali" icon="pi pi-replay" size="small" severity="secondary" outlined onClick={handleReopenRun} />
            ) : (
              <Button label="Selesaikan Run" icon="pi pi-check" size="small" onClick={openCompleteDialog} />
            )
          ) : undefined
        }
      />

      {/* --- Summary/progress: selalu terlihat, tidak ikut scroll panel manapun --- */}
      {testRun && (
        <div className="flex align-items-center flex-wrap gap-2 mb-3">
          <Tag value={TEST_RUN_STATUS_LABEL[testRun.status]} severity={TEST_RUN_STATUS_SEVERITY[testRun.status]} />
          <span className="text-color-secondary text-sm">
            {summary.pass} pass · {summary.fail} fail · {summary.skip} skip · {summary.blocked} blocked · {summary.notRun} belum dites
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
        <div className="mb-3 p-3 surface-100 border-round">
          <div className="text-sm font-medium mb-1">Catatan Test Run</div>
          <div className="text-sm white-space-pre-line">{testRun.notes}</div>
        </div>
      )}

      <div className="mb-4">
        <div className="flex justify-content-between mb-1">
          <span>
            {summary.executed} / {summary.total} dieksekusi
          </span>
          <span>{summary.progressPercent}%</span>
        </div>
        <ProgressBar value={summary.progressPercent} showValue={false} />
      </div>

      <div className="grid">
        {/* --- Panel kiri: daftar test case + filter (scroll independen) --- */}
        <div className="col-12 md:col-4 test-run-detail-filter">
          <Panel
            header="Filter"
            toggleable
            collapsed
            style={{
              borderBottom: 'none',
              borderBottomLeftRadius: 0,
              borderBottomRightRadius: 0,
            }}
          >
            <div className="flex flex-column gap-2">
              <IconField iconPosition="left">
                <InputIcon className="pi pi-search" />
                <InputText value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari judul/kode..." className="w-full" />
              </IconField>
              <Dropdown value={statusFilter} options={STATUS_FILTER_OPTIONS} onChange={(e) => setStatusFilter(e.value)} placeholder="Semua Status" showClear className="w-full" />
              <Dropdown value={priorityFilter} options={PRIORITY_FILTER_OPTIONS} onChange={(e) => setPriorityFilter(e.value)} placeholder="Semua Prioritas" showClear className="w-full" />
              <Dropdown value={moduleFilter} options={moduleOptions} onChange={(e) => setModuleFilter(e.value)} placeholder="Semua Module" showClear className="w-full" />
              <Dropdown value={tagFilter} options={tagOptions} onChange={(e) => setTagFilter(e.value)} placeholder="Semua Tag" showClear className="w-full" />
            </div>
          </Panel>

          <div
            className="flex flex-column gap-1 p-2"
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
            {!loading && filteredResults.length === 0 && <p className="text-color-secondary text-sm px-2">Tidak ada test case yang cocok.</p>}
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
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* --- Panel kanan: summary (default) atau detail test case terpilih (scroll independen) --- */}
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
                label="Sebelumnya"
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
                label="Selanjutnya"
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
            className="flex-grow-1"
            style={{ overflowY: 'auto' }}
            onScroll={(e) => setRightPanelScrolled(e.currentTarget.scrollTop > 0)}
          >
            {!activeResult ? (
              <Card>
                <p className="text-color-secondary m-0">Pilih test case di panel kiri untuk mencatat hasil, melihat detail, atau menautkan issue.</p>
              </Card>
            ) : (
              <>
                <Card className="mb-3">
                  <div className="flex align-items-center gap-2 mb-1">
                    <h2 className="m-0">{activeResult.testCaseCode} — {activeResult.testCaseTitle}</h2>
                    <Tag value={TEST_CASE_PRIORITY_LABEL[activeResult.testCasePriority]} severity={TEST_CASE_PRIORITY_SEVERITY[activeResult.testCasePriority]} />
                    <Tag value={TEST_RESULT_STATUS_LABEL[activeResult.status]} severity={TEST_RESULT_STATUS_SEVERITY[activeResult.status]} />
                  </div>

                  <div className="flex flex-wrap align-items-center gap-4 mt-2 mb-1 text-sm">
                    <span className="text-color-secondary">
                      Modul: <span className="text-color">{activeResult.testCase?.module?.name ?? '-'}</span>
                    </span>
                    {activeResult.testCase && activeResult.testCase.tags.length > 0 && (
                      <span className="text-color-secondary flex align-items-center gap-2">
                        Tag:
                        <span className="flex flex-wrap gap-1">
                          {activeResult.testCase.tags.map((tag) => (
                            <Tag key={tag.id} value={tag.name} severity="info" />
                          ))}
                        </span>
                      </span>
                    )}
                    <span className="text-color-secondary">
                      Tester: <span className="text-color">{activeResult.tester?.fullName ?? activeResult.tester?.email ?? '-'}</span>
                    </span>
                    <span className="text-color-secondary">
                      Dieksekusi: <span className="text-color">{activeResult.executedAt ? formatDateTime(activeResult.executedAt) : '-'}</span>
                    </span>
                  </div>

                  {activeResult.notes && (
                    <div className="mt-2">
                      <label className="block text-color-secondary text-sm mb-1">Catatan Hasil</label>
                      <p className="m-0" style={{ whiteSpace: 'pre-wrap' }}>{activeResult.notes}</p>
                    </div>
                  )}

                  {activeResult.testCase && activeResult.testCase.updatedAt > activeResult.updatedAt && (
                    <small className="text-color-secondary">
                      <i className="pi pi-info-circle mr-1" />
                      Test case asli sudah diperbarui sejak run ini dimulai — tampilan ini adalah snapshot saat run dibuat.
                    </small>
                  )}

                  {activeResult.testCaseObjective && (
                    <div className="mt-3">
                      <label className="block text-color-secondary text-sm mb-1">Tujuan</label>
                      <p className="m-0">{activeResult.testCaseObjective}</p>
                    </div>
                  )}

                  {activeResult.testCasePreconditions && (
                    <div className="mt-3">
                      <label className="block text-color-secondary text-sm mb-1">Prasyarat</label>
                      <p className="m-0" style={{ whiteSpace: 'pre-wrap' }}>{activeResult.testCasePreconditions}</p>
                    </div>
                  )}

                  <div className="mt-3">
                    <label className="block text-color-secondary text-sm mb-1">Langkah Pengujian</label>
                    <p className="m-0" style={{ whiteSpace: 'pre-wrap' }}>{activeResult.testCaseSteps}</p>
                  </div>

                  <div className="mt-3">
                    <label className="block text-color-secondary text-sm mb-1">Hasil yang Diharapkan</label>
                    <p className="m-0" style={{ whiteSpace: 'pre-wrap' }}>{activeResult.testCaseExpectedResult}</p>
                  </div>

                  {canRunTests && testRun?.status !== 'completed' && activeResult.testCase && (
                    <div className="flex gap-2 pt-3">
                      <Button
                        label="Sync dengan Test Case Asli"
                        icon="pi pi-sync"
                        size="small"
                        outlined
                        severity="secondary"
                        onClick={handleSyncResult}
                      />
                    </div>
                  )}
                </Card>

                {canRunTests && (
                  <Card title="Catat Hasil Eksekusi" className="mb-3">
                    <div className="flex flex-column gap-3">
                      <div className="grid">
                        <div className="col-12 md:col-6 flex flex-column gap-1">
                          <label htmlFor="result-status">Status</label>
                          <Dropdown id="result-status" value={resultStatus} options={RESULT_OPTIONS} onChange={(e) => setResultStatus(e.value)} className="w-full" />
                        </div>
                        <div className="col-12 md:col-6 flex flex-column gap-1">
                          <label htmlFor="result-tester">Tester</label>
                          <Dropdown
                            id="result-tester"
                            value={resultTesterId}
                            options={approvedUsers.map((u) => ({ label: u.fullName ?? u.email, value: u.id }))}
                            onChange={(e) => setResultTesterId(e.value)}
                            className="w-full"
                          />
                        </div>
                      </div>

                      <div className="flex flex-column gap-1">
                        <label htmlFor="result-notes">Catatan</label>
                        <InputTextarea id="result-notes" value={resultNotes} onChange={(e) => setResultNotes(e.target.value)} rows={3} />
                      </div>

                      {activeResult.stepResults.length > 0 && (
                        <div className="flex flex-column gap-2">
                          <label>Langkah Pengujian</label>
                          {activeResult.stepResults.map((sr) => (
                            <div key={sr.id} className="flex align-items-start gap-2 p-2 border-round surface-100">
                              <span className="text-sm flex-grow-1">{sr.step.stepNumber}. {sr.step.action}</span>
                              <Dropdown
                                value={sr.status === 'not_run' ? null : sr.status}
                                options={[{ label: 'Pass', value: 'pass' }, { label: 'Fail', value: 'fail' }]}
                                placeholder="-"
                                onChange={async (e) => {
                                  await testRunService.recordStepResult(sr.id, e.value, sr.actualResult);
                                  await reload();
                                }}
                                className="w-8rem"
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      <Button label="Simpan" size="small" onClick={handleSaveResult} disabled={!resultTesterId} />
                    </div>
                  </Card>
                )}

                {canManageIssues && (
                  <Card
                    title="Link Issue"
                    className="mb-3"
                    subTitle={linkedIssues.length > 0 ? `${linkedIssues.length} issue tertaut` : undefined}
                  >
                    <div className="flex flex-column gap-2">
                      {linkedIssues.length === 0 && (
                        <p className="text-color-secondary text-sm m-0">Belum ada issue yang ditautkan ke test case ini.</p>
                      )}
                      {linkedIssues.map((issue) => (
                        <div key={issue.id} className="flex align-items-center justify-content-between gap-2 p-2 border-round surface-100">
                          <span className="text-sm">
                            <Tag value={ISSUE_TYPE_LABEL[issue.type]} severity={ISSUE_TYPE_SEVERITY[issue.type]} className="mr-2" />
                            <span className="font-medium">{issue.code}</span> — {issue.title}
                          </span>
                          <Tag value={ISSUE_PRIORITY_LABEL[issue.priority]} severity={ISSUE_PRIORITY_SEVERITY[issue.priority]} />
                        </div>
                      ))}
                      <Button label="Browse Issues" icon="pi pi-search" size="small" outlined onClick={openBrowseDialog} className="mt-2" />
                    </div>
                  </Card>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* --- Browse Issues Dialog: pick existing to link, or open Create Issue --- */}
      <Dialog header="Browse Issues" visible={browseDialogOpen} onHide={() => setBrowseDialogOpen(false)} style={{ width: '34rem' }}>
        <div className="flex flex-column gap-3">
          <div className="flex align-items-center gap-2">
            <IconField iconPosition="left" className="flex-grow-1">
              <InputIcon className="pi pi-search" />
              <InputText value={browseSearch} onChange={(e) => setBrowseSearch(e.target.value)} placeholder="Cari judul/kode..." className="w-full" />
            </IconField>
            <Button label="Buat Issue" icon="pi pi-plus" size="small" onClick={openCreateIssueDialog} />
          </div>
          <DataTable value={filteredProjectIssues} paginator rows={5} size="small" emptyMessage="Tidak ada issue yang cocok." dataKey="id">
            <Column
              header=""
              style={{ width: '2.5rem' }}
              body={(issue: IssueWithDetails) => (
                <input
                  type="checkbox"
                  checked={linkedIssueIds.has(issue.id)}
                  onChange={(e) => handleToggleLink(issue.id, e.target.checked)}
                />
              )}
            />
            <Column field="code" header="Kode" style={{ width: '6rem' }} />
            <Column header="Tipe" body={(issue: IssueWithDetails) => <Tag value={ISSUE_TYPE_LABEL[issue.type]} severity={ISSUE_TYPE_SEVERITY[issue.type]} />} style={{ width: '7rem' }} />
            <Column field="title" header="Judul" />
          </DataTable>
        </div>
      </Dialog>

      {/* --- Create Issue Dialog (nested inside Browse): saving auto-links to activeResult --- */}
      <Dialog header="Tambah Issue" visible={createIssueDialogOpen} onHide={() => setCreateIssueDialogOpen(false)} style={{ width: '32rem' }}>
        <div className="flex flex-column gap-3">
          {issueError && <small className="p-error">{issueError}</small>}
          <div className="flex flex-column gap-1">
            <label htmlFor="issue-title">Judul</label>
            <InputText id="issue-title" value={issueTitle} onChange={(e) => setIssueTitle(e.target.value)} autoFocus />
          </div>
          <div className="grid">
            <div className="col-12 md:col-6 flex flex-column gap-1">
              <label htmlFor="issue-type">Tipe</label>
              <Dropdown
                id="issue-type"
                value={issueType}
                options={(['bug', 'feature', 'improvement', 'task'] as const).map((v) => ({ label: ISSUE_TYPE_LABEL[v], value: v }))}
                onChange={(e) => setIssueType(e.value)}
                className="w-full"
              />
            </div>
            <div className="col-12 md:col-6 flex flex-column gap-1">
              <label htmlFor="issue-priority">Prioritas</label>
              <Dropdown
                id="issue-priority"
                value={issuePriority}
                options={(['low', 'medium', 'high', 'critical'] as const).map((v) => ({ label: ISSUE_PRIORITY_LABEL[v], value: v }))}
                onChange={(e) => setIssuePriority(e.value)}
                className="w-full"
              />
            </div>
          </div>
          <div className="flex flex-column gap-1">
            <label htmlFor="issue-module">Modul (opsional)</label>
            <Dropdown
              id="issue-module"
              value={issueModuleId}
              options={modules.map((m) => ({ label: m.name, value: m.id }))}
              onChange={(e) => setIssueModuleId(e.value)}
              showClear
              placeholder="Tidak terikat module"
              className="w-full"
            />
          </div>
          <div className="flex flex-column gap-1">
            <label htmlFor="issue-tags">Tag</label>
            <MultiSelect
              id="issue-tags"
              value={issueTagNames}
              options={projectTags.map((t) => ({ label: t.name, value: t.name }))}
              onChange={(e) => setIssueTagNames(e.value ?? [])}
              placeholder="Pilih tag"
              display="chip"
              filter
              className="w-full"
            />
          </div>
          <div className="flex flex-column gap-1">
            <label htmlFor="issue-description">Deskripsi</label>
            <InputTextarea id="issue-description" value={issueDescription} onChange={(e) => setIssueDescription(e.target.value)} rows={2} />
          </div>
          <div className="flex flex-column gap-1">
            <label htmlFor="issue-actual">Hasil Aktual</label>
            <InputTextarea id="issue-actual" value={issueActual} onChange={(e) => setIssueActual(e.target.value)} rows={2} />
          </div>
          <div className="flex flex-column gap-1">
            <label htmlFor="issue-expected">Hasil yang Diharapkan</label>
            <InputTextarea id="issue-expected" value={issueExpected} onChange={(e) => setIssueExpected(e.target.value)} rows={2} />
          </div>
          <Button label="Buat & Tautkan" size="small" onClick={handleCreateAndLinkIssue} />
        </div>
      </Dialog>

      {/* --- Complete Run Dialog --- */}
      <Dialog header="Selesaikan Test Run" visible={completeDialogOpen} onHide={() => setCompleteDialogOpen(false)} style={{ width: '28rem' }}>
        <div className="flex flex-column gap-3">
          <p className="m-0 text-sm text-color-secondary">
            Test run ini akan ditandai selesai. Kamu masih bisa membuka kembali kapan saja.
          </p>
          <div className="flex flex-column gap-1">
            <label htmlFor="complete-notes">Catatan (opsional)</label>
            <InputTextarea
              id="complete-notes"
              value={completeNotes}
              onChange={(e) => setCompleteNotes(e.target.value)}
              rows={3}
              placeholder="Mis. blocker, catatan environment, tindak lanjut..."
              autoFocus
            />
          </div>
          <Button label="Selesaikan" icon="pi pi-check" size="small" onClick={handleCompleteRun} />
        </div>
      </Dialog>
    </div>
  );
}
