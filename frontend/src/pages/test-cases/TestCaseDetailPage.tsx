import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from 'primereact/card';
import { Tag } from 'primereact/tag';
import { Button } from 'primereact/button';
import { Chip } from 'primereact/chip';
import { MultiSelect } from 'primereact/multiselect';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Dropdown } from 'primereact/dropdown';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Toast } from 'primereact/toast';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import { testCaseService } from '../../services/testCaseService';
import { moduleService } from '../../services/moduleService';
import { tagService } from '../../services/tagService';
import { useProjectRole } from '../../hooks/useProjectRole';
import { queryKeys } from '../../hooks/queryKeys';
import type { TestCasePriority, TestCaseWithDetails } from '../../types/domain';
import { formatDateTime } from '../../helpers/dateFormatter';
import {
  TEST_CASE_PRIORITY_LABEL,
  TEST_CASE_PRIORITY_SEVERITY,
  TEST_CASE_STATUS_LABEL,
  TEST_CASE_STATUS_SEVERITY,
} from '../../helpers/statusLabels';

const PRIORITY_OPTIONS: { label: string; value: TestCasePriority }[] = (
  ['low', 'medium', 'high', 'critical'] as const
).map((v) => ({ label: TEST_CASE_PRIORITY_LABEL[v], value: v }));

interface TestCaseDetail extends TestCaseWithDetails {
  project: { id: string; name: string };
}

export function TestCaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get('projectId');
  const toast = useRef<Toast>(null);

  const queryClient = useQueryClient();
  const { data: testCase, isLoading: loading } = useQuery({
    queryKey: queryKeys.testCase(id ?? ''),
    queryFn: () => testCaseService.getByIdWithDetails(id!) as Promise<TestCaseDetail | null>,
    enabled: !!id,
  });

  const { data: detailedSteps = [] } = useQuery({
    queryKey: queryKeys.testCaseSteps(id ?? ''),
    queryFn: () => testCaseService.listSteps(id!),
    enabled: !!id && testCase?.stepType === 'detailed',
  });
  const { canEditContent, canDeleteContent } = useProjectRole(testCase?.project.id);

  const { data: modules = [] } = useQuery({
    queryKey: queryKeys.modules(testCase?.project.id ?? ''),
    queryFn: () => moduleService.listByProject(testCase!.project.id),
    enabled: !!testCase?.project.id,
  });
  const { data: tags = [] } = useQuery({
    queryKey: queryKeys.tags(testCase?.project.id ?? ''),
    queryFn: () => tagService.listByProject(testCase!.project.id),
    enabled: !!testCase?.project.id,
  });

  async function reload() {
    if (!id) return;
    await queryClient.invalidateQueries({ queryKey: queryKeys.testCase(id) });
  }

  function handleBack() {
    if (projectId) {
      navigate(`/projects/${projectId}`);
    } else {
      navigate('/test-cases');
    }
  }

  // --- Module quick-add (from Edit dialog) ---
  const [moduleDialogOpen, setModuleDialogOpen] = useState(false);
  const [moduleCode, setModuleCode] = useState('');
  const [moduleName, setModuleName] = useState('');
  const [moduleError, setModuleError] = useState<string | null>(null);
  const moduleNameRef = useRef<HTMLInputElement>(null);

  function openCreateModuleDialog() {
    setModuleCode('');
    setModuleName('');
    setModuleError(null);
    setModuleDialogOpen(true);
  }

  async function handleSaveModule() {
    if (!testCase) return;
    setModuleError(null);
    try {
      const created = await moduleService.create({ projectId: testCase.project.id, name: moduleName, code: moduleCode });
      await queryClient.invalidateQueries({ queryKey: queryKeys.modules(testCase.project.id) });
      setEditModuleId(created.id);
      setModuleDialogOpen(false);
      toast.current?.show({ severity: 'success', summary: 'Module created' });
    } catch (err) {
      setModuleError(err instanceof Error ? err.message : 'Failed to save module');
    }
  }

  // --- Tag quick-add (from Edit dialog) ---
  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [tagError, setTagError] = useState<string | null>(null);
  const tagNameRef = useRef<HTMLInputElement>(null);

  function openCreateTagDialog() {
    setNewTagName('');
    setTagError(null);
    setTagDialogOpen(true);
  }

  async function handleSaveTag() {
    if (!testCase) return;
    setTagError(null);
    try {
      const created = await tagService.create(testCase.project.id, newTagName);
      await queryClient.invalidateQueries({ queryKey: queryKeys.tags(testCase.project.id) });
      setEditTags((prev) => [...prev, created.name]);
      setTagDialogOpen(false);
      toast.current?.show({ severity: 'success', summary: 'Tag created' });
    } catch (err) {
      setTagError(err instanceof Error ? err.message : 'Failed to save tag');
    }
  }

  // --- Edit dialog ---
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editCode, setEditCode] = useState('');
  const [editModuleId, setEditModuleId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editObjective, setEditObjective] = useState('');
  const [editPreconditions, setEditPreconditions] = useState('');
  const [editSteps, setEditSteps] = useState('');
  const [editExpectedResult, setEditExpectedResult] = useState('');
  const [editPriority, setEditPriority] = useState<TestCasePriority>('medium');
  const [editNotes, setEditNotes] = useState('');
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editError, setEditError] = useState<string | null>(null);
  const editTitleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editError && editTitleRef.current) {
      editTitleRef.current.focus();
      editTitleRef.current.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
    }
  }, [editError]);

  function openEditDialog() {
    if (!testCase) return;
    setEditCode(testCase.code);
    setEditModuleId(testCase.moduleId);
    setEditTitle(testCase.title);
    setEditObjective(testCase.objective ?? '');
    setEditPreconditions(testCase.preconditions ?? '');
    setEditSteps(testCase.steps);
    setEditExpectedResult(testCase.expectedResult);
    setEditPriority(testCase.priority);
    setEditNotes(testCase.notes ?? '');
    setEditTags(testCase.tags.map((t) => t.name));
    setEditError(null);
    setEditDialogOpen(true);
  }

  async function handleSaveEdit() {
    if (!testCase) return;
    setEditError(null);
    try {
      await testCaseService.update(
        testCase.id,
        testCase.project.id,
        {
          code: editCode,
          moduleId: editModuleId,
          title: editTitle,
          objective: editObjective.trim() || null,
          preconditions: editPreconditions.trim() || null,
          steps: editSteps,
          expectedResult: editExpectedResult,
          priority: editPriority,
          notes: editNotes.trim() || null,
        },
        editTags,
      );
      setEditDialogOpen(false);
      await reload();
      await queryClient.invalidateQueries({ queryKey: queryKeys.testCasesWithDetails(testCase.project.id) });
      toast.current?.show({ severity: 'success', summary: 'Test case updated' });
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to save test case');
    }
  }

  // Creates a new test case pre-filled from this one, then jumps straight to editing the
  // new copy — no intermediate dialog here (that dialog lives on ProjectDetailPage, not on
  // this single-test-case viewer).
  async function handleDuplicate() {
    if (!testCase) return;
    const sourceSteps = testCase.stepType === 'detailed' ? detailedSteps : [];
    const created = await testCaseService.create({
      projectId: testCase.project.id,
      moduleId: testCase.moduleId,
      title: `${testCase.title} (Copy)`,
      objective: testCase.objective ?? undefined,
      preconditions: testCase.preconditions ?? undefined,
      steps: testCase.steps,
      expectedResult: testCase.expectedResult,
      priority: testCase.priority,
      notes: testCase.notes ?? undefined,
      targetRoleId: testCase.targetRoleId,
      tagNames: testCase.tags.map((t) => t.name),
      stepType: testCase.stepType,
      detailedSteps: testCase.stepType === 'detailed'
        ? sourceSteps.map((s) => ({ action: s.action, expectedResult: s.expectedResult ?? undefined }))
        : undefined,
    });
    await queryClient.invalidateQueries({ queryKey: queryKeys.testCasesWithDetails(testCase.project.id) });
    toast.current?.show({ severity: 'success', summary: 'Test case duplicated' });
    navigate(`/test-cases/${created.id}${projectId ? `?projectId=${projectId}` : ''}`);
  }

  function handleDelete() {
    if (!testCase) return;
    confirmDialog({
      header: 'Delete Test Case',
      message: `Test case "${testCase.title}" will be permanently deleted, including its entire execution history. Continue?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        await testCaseService.remove(testCase.id);
        await queryClient.invalidateQueries({ queryKey: queryKeys.testCasesWithDetails(testCase.project.id) });
        toast.current?.show({ severity: 'success', summary: 'Test case deleted' });
        handleBack();
      },
    });
  }

  if (loading || !testCase) {
    return (
      <div>
        <Breadcrumb
          items={[
            { label: 'Projects', path: '/projects' },
            { label: testCase ? testCase.project.name : '…', path: testCase ? `/projects/${testCase.project.id}` : undefined },
            { label: loading ? '…' : 'Test case not found' },
          ]}
        />
        {!loading && <p>Test case not found.</p>}
      </div>
    );
  }

  const moduleOptions = modules.map((m) => ({ label: m.name, value: m.id }));

  return (
    <div>
      <Toast ref={toast} position="bottom-center" />
      <ConfirmDialog />

      <Breadcrumb
        items={[
          { label: 'Projects', path: '/projects' },
          { label: testCase.project.name, path: `/projects/${testCase.project.id}` },
          { label: `${testCase.code} — ${testCase.title}` },
        ]}
      />

      <div className="flex justify-content-between align-items-center mb-3">
        <div>
          <h2>Test Case Detail</h2>
        </div>
      </div>

      <Card className="mb-3">
        <div className="flex align-items-start justify-content-between">
          <div className="flex align-items-center gap-2 mb-1">
            <h2 className="m-0">{testCase.code} — {testCase.title}</h2>
          </div>
          <div className="flex header-actions gap-1">
            {canEditContent && <Button icon="pi pi-pencil" rounded size="small" text severity="secondary" onClick={openEditDialog} />}
            {canEditContent && <Button icon="pi pi-copy" rounded size="small" text severity="secondary" onClick={handleDuplicate} />}
            {canDeleteContent && <Button icon="pi pi-trash" rounded size="small" severity="danger" text onClick={handleDelete} />}
          </div>
        </div>

        <div className="flex align-items-center gap-2 mt-3">

          <Tag value={TEST_CASE_PRIORITY_LABEL[testCase.priority]} severity={TEST_CASE_PRIORITY_SEVERITY[testCase.priority]} />
          <Tag value={TEST_CASE_STATUS_LABEL[testCase.status]} severity={TEST_CASE_STATUS_SEVERITY[testCase.status]} />
          {testCase.targetRole && <Tag value={testCase.targetRole.name} severity="secondary" />}
        </div>

        <div className="grid mt-3">
          <div className="col-6 md:col-3">
            <label className="block text-color-secondary text-sm mb-1">Project</label>
            <p className="mt-0">{testCase.project.name}</p>
          </div>
          <div className="col-6 md:col-3">
            <label className="block text-color-secondary text-sm mb-1">Module</label>
            <p className="mt-0">{testCase.module?.name ?? '-'}</p>
          </div>
          <div className="col-6 md:col-3">
            <label className="block text-color-secondary text-sm mb-1">Created</label>
            <p className="mt-0">{formatDateTime(testCase.createdAt)}</p>
          </div>
          <div className="col-6 md:col-3">
            <label className="block text-color-secondary text-sm mb-1">Last Updated</label>
            <p className="mt-0">{formatDateTime(testCase.updatedAt)}</p>
          </div>
        </div>

        {testCase.tags.length > 0 && (
          <div className="flex align-items-center gap-2 mt-2">
            {testCase.tags.map((t) => (
              <Chip key={t.id} label={t.name} />
            ))}
          </div>
        )}
      </Card>

      {testCase.objective && (
        <Card title="Objective" className="mb-3">
          <p className="m-0">{testCase.objective}</p>
        </Card>
      )}

      {testCase.preconditions && (
        <Card title="Preconditions" className="mb-3">
          <p className="m-0" style={{ whiteSpace: 'pre-wrap' }}>{testCase.preconditions}</p>
        </Card>
      )}

      {testCase.stepType === 'detailed' ? (
        <Card title="Test Steps" className="mb-3">
          <ol className="m-0 pl-3 flex flex-column gap-2">
            {detailedSteps.map((step) => (
              <li key={step.id}>
                <div style={{ whiteSpace: 'pre-wrap' }}>{step.action}</div>
                {step.expectedResult && (
                  <div className="text-color-secondary text-sm mt-1" style={{ whiteSpace: 'pre-wrap' }}>
                    Expected: {step.expectedResult}
                  </div>
                )}
              </li>
            ))}
          </ol>
        </Card>
      ) : (
        <>
          <Card title="Test Steps" className="mb-3">
            <p className="m-0" style={{ whiteSpace: 'pre-wrap' }}>{testCase.steps}</p>
          </Card>

          <Card title="Expected Result" className="mb-3">
            <p className="m-0" style={{ whiteSpace: 'pre-wrap' }}>{testCase.expectedResult}</p>
          </Card>
        </>
      )}

      {testCase.notes && (
        <Card title="Notes" className="mb-3">
          <p className="m-0" style={{ whiteSpace: 'pre-wrap' }}>{testCase.notes}</p>
        </Card>
      )}

      {/* --- Edit Dialog --- */}
      <Dialog header="Edit Test Case" visible={editDialogOpen} onHide={() => setEditDialogOpen(false)} style={{ width: '40rem' }}>
        <div className="flex flex-column gap-3">
          <div className="flex flex-column gap-1">
            <label htmlFor="edit-case-code">Code</label>
            <InputText id="edit-case-code" value={editCode} onChange={(e) => setEditCode(e.target.value)} className="w-10rem" />
          </div>

          <div className="grid">
            <div className="col-12 md:col-6 flex flex-column gap-1">
              <label htmlFor="edit-case-module">Module</label>
              <div className="flex align-items-center gap-1">
                <Dropdown
                  id="edit-case-module"
                  value={editModuleId}
                  options={moduleOptions}
                  onChange={(e) => setEditModuleId(e.value)}
                  showClear
                  placeholder="Select module"
                  className="w-full"
                />
                <Button icon="pi pi-plus" type="button" text rounded size="small" aria-label="New Module" onClick={openCreateModuleDialog} style={{ width: '2rem', height: '2rem', flexShrink: 0 }} />
              </div>
            </div>
            <div className="col-12 md:col-6 flex flex-column gap-1">
              <label htmlFor="edit-case-priority">Priority</label>
              <Dropdown
                id="edit-case-priority"
                value={editPriority}
                options={PRIORITY_OPTIONS}
                onChange={(e) => setEditPriority(e.value)}
                className="w-full"
              />
            </div>
          </div>

          <div className="flex flex-column gap-1">
            <label htmlFor="edit-case-title" className={editError ? 'p-error' : ''}>Title</label>
            <InputText id="edit-case-title" ref={editTitleRef} value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className={editError ? 'p-invalid' : ''} autoFocus />
          </div>

          <div className="flex flex-column gap-1">
            <label htmlFor="edit-case-objective">Objective (optional)</label>
            <InputText id="edit-case-objective" value={editObjective} onChange={(e) => setEditObjective(e.target.value)} />
          </div>

          <div className="flex flex-column gap-1">
            <label htmlFor="edit-case-preconditions">Preconditions</label>
            <InputTextarea id="edit-case-preconditions" value={editPreconditions} onChange={(e) => setEditPreconditions(e.target.value)} rows={2} autoResize />
          </div>

          <div className="flex flex-column gap-1">
            <label htmlFor="edit-case-steps">Test Steps</label>
            <InputTextarea id="edit-case-steps" value={editSteps} onChange={(e) => setEditSteps(e.target.value)} rows={4} autoResize />
          </div>

          <div className="flex flex-column gap-1">
            <label htmlFor="edit-case-expected">Expected Result</label>
            <InputTextarea id="edit-case-expected" value={editExpectedResult} onChange={(e) => setEditExpectedResult(e.target.value)} rows={3} autoResize />
          </div>

          <div className="flex flex-column gap-1">
            <label htmlFor="edit-case-tags">Tags</label>
            <div className="flex align-items-center gap-1">
              <MultiSelect
                id="edit-case-tags"
                value={editTags}
                options={tags.map((t) => ({ label: t.name, value: t.name }))}
                onChange={(e) => setEditTags(e.value ?? [])}
                placeholder="Select tags"
                display="chip"
                filter
                className="w-full"
              />
              <Button icon="pi pi-plus" type="button" text rounded size="small" aria-label="New Tag" onClick={openCreateTagDialog} style={{ width: '2rem', height: '2rem', flexShrink: 0 }} />
            </div>
          </div>

          <div className="flex flex-column gap-1">
            <label htmlFor="edit-case-notes">Notes (optional)</label>
            <InputTextarea id="edit-case-notes" value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={2} autoResize />
          </div>

          {editError && <small className="p-error">{editError}</small>}
          <Button label="Save" size="small" onClick={handleSaveEdit} />
        </div>
      </Dialog>

      {/* --- Module Quick-Add Dialog --- */}
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
              placeholder="e.g. Authentication, Dashboard, Purchasing"
            />
          </div>
          <Button label="Save" size="small" onClick={handleSaveModule} />
        </div>
      </Dialog>

      {/* --- Tag Quick-Add Dialog --- */}
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
            <label htmlFor="tag-name">Tag Name</label>
            <InputText
              id="tag-name"
              ref={tagNameRef}
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveTag();
              }}
              placeholder="e.g. Regression, Smoke, UI"
            />
          </div>
          <Button label="Save" size="small" onClick={handleSaveTag} />
        </div>
      </Dialog>
    </div>
  );
}
