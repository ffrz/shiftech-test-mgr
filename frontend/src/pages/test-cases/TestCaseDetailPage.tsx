import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from 'primereact/card';
import { Tag } from 'primereact/tag';
import { Button } from 'primereact/button';
import { Chip } from 'primereact/chip';
import { InputText } from 'primereact/inputtext';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import { ActivityPanel } from '../../components/ui/ActivityPanel';
import { AttachmentPanel } from '../../components/ui/AttachmentPanel';
import { TestCaseDetailPageSkeleton } from './TestCaseDetailPageSkeleton';
import { TestCaseDialog } from '../projects/components/dialogs/TestCaseDialog';
import { ModuleDialog } from '../projects/components/dialogs/ModuleDialog';
import { TagDialog } from '../projects/components/dialogs/TagDialog';
import { TestRoleDialog } from '../projects/components/dialogs/TestRoleDialog';
import { testCaseService } from '../../services/testCaseService';
import { moduleService } from '../../services/moduleService';
import { tagService } from '../../services/tagService';
import { testRoleService } from '../../services/testRoleService';
import { projectService } from '../../services/projectService';
import { useProjectRole } from '../../hooks/useProjectRole';
import { useProjectBreadcrumbItems } from '../../hooks/useProjectBreadcrumbItems';
import { useAuthContext } from '../../hooks/useAuth';
import { UserHoverCard } from '../../components/ui/UserHoverCard';
import { profileRepository } from '../../repositories/profileRepository';
import { queryKeys } from '../../hooks/queryKeys';
import type { TestCase, TestCasePriority, TestCaseWithDetails } from '../../types/domain';
import { RelativeTime } from '../../components/ui/RelativeTime';
import { toastHelper } from '../../helpers/toast';
import {
  TEST_CASE_PRIORITY_LABEL,
  TEST_CASE_PRIORITY_SEVERITY,
  TEST_CASE_STATUS_LABEL,
  TEST_CASE_STATUS_SEVERITY,
} from '../../helpers/statusLabels';

interface TestCaseDetail extends TestCaseWithDetails {
  project: { id: string; name: string };
}

export function TestCaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get('projectId');
  const { user } = useAuthContext();

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

  const { data: authorProfile = null } = useQuery({
    queryKey: queryKeys.profile(testCase?.createdBy ?? ''),
    queryFn: () => profileRepository.findById(testCase!.createdBy!),
    enabled: !!testCase?.createdBy,
  });

  const { data: project } = useQuery({
    queryKey: queryKeys.project(testCase?.project.id ?? ''),
    queryFn: () => projectService.getById(testCase!.project.id),
    enabled: !!testCase?.project.id,
  });
  const projectBreadcrumbItems = useProjectBreadcrumbItems(testCase?.project.name, project?.ownerId, `/projects/${testCase?.project.id}`);

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

  // --- Inline external link management (same pattern as IssueDetailPage) ---
  const [newExternalUrl, setNewExternalUrl] = useState('');
  const [newExternalLabel, setNewExternalLabel] = useState('');
  const [externalAdding, setExternalAdding] = useState(false);

  function resetExternalForm() {
    setNewExternalUrl('');
    setNewExternalLabel('');
    setExternalAdding(false);
  }

  async function handleAddExternalLink() {
    if (!testCase || !newExternalUrl.trim()) return;
    const updatedLinks = [...testCase.externalLinks, { url: newExternalUrl.trim(), label: newExternalLabel.trim() || undefined }];
    await testCaseService.update(testCase.id, testCase.project.id, { externalLinks: updatedLinks }, undefined, undefined, user?.id ?? null);
    resetExternalForm();
    await reload();
    toastHelper.success('Link added');
  }

  async function handleRemoveExternalLink(index: number) {
    if (!testCase) return;
    const updatedLinks = testCase.externalLinks.filter((_, i) => i !== index);
    await testCaseService.update(testCase.id, testCase.project.id, { externalLinks: updatedLinks }, undefined, undefined, user?.id ?? null);
    await reload();
    toastHelper.success('Link removed');
  }

  const { data: testRoles = [] } = useQuery({
    queryKey: queryKeys.testRoles(testCase?.project.id ?? ''),
    queryFn: () => testRoleService.listByProject(testCase!.project.id),
    enabled: !!testCase?.project.id,
  });

  // --- Module quick-add (from Edit dialog) ---
  const [moduleDialogOpen, setModuleDialogOpen] = useState(false);
  const [moduleCode, setModuleCode] = useState('');
  const [moduleName, setModuleName] = useState('');
  const [moduleError, setModuleError] = useState<string | null>(null);

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
      toastHelper.success('Module created');
    } catch (err) {
      setModuleError(err instanceof Error ? err.message : 'Failed to save module');
    }
  }

  // --- Tag quick-add (from Edit dialog) ---
  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [tagError, setTagError] = useState<string | null>(null);

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
      toastHelper.success('Tag created');
    } catch (err) {
      setTagError(err instanceof Error ? err.message : 'Failed to save tag');
    }
  }

  // --- Test Role quick-add (from Edit dialog) ---
  const [testRoleDialogOpen, setTestRoleDialogOpen] = useState(false);
  const [testRoleName, setTestRoleName] = useState('');
  const [testRoleError, setTestRoleError] = useState<string | null>(null);

  function openCreateTestRoleDialog() {
    setTestRoleName('');
    setTestRoleError(null);
    setTestRoleDialogOpen(true);
  }

  async function handleSaveTestRole() {
    if (!testCase) return;
    setTestRoleError(null);
    try {
      const created = await testRoleService.create({ projectId: testCase.project.id, name: testRoleName });
      await queryClient.invalidateQueries({ queryKey: queryKeys.testRoles(testCase.project.id) });
      setEditTargetRoleId(created.id);
      setTestRoleDialogOpen(false);
      toastHelper.success('Role created');
    } catch (err) {
      setTestRoleError(err instanceof Error ? err.message : 'Failed to save role');
    }
  }

  // --- Edit dialog state ---
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editCode, setEditCode] = useState('');
  const [editModuleId, setEditModuleId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editObjective, setEditObjective] = useState('');
  const [editPreconditions, setEditPreconditions] = useState('');
  const [editStepType, setEditStepType] = useState<TestCase['stepType']>('simple');
  const [editSteps, setEditSteps] = useState('');
  const [editExpectedResult, setEditExpectedResult] = useState('');
  const [editDetailedSteps, setEditDetailedSteps] = useState<{ action: string; expectedResult: string }[]>([]);
  const [editPriority, setEditPriority] = useState<TestCasePriority>('medium');
  const [editTargetRoleId, setEditTargetRoleId] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState('');
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editError, setEditError] = useState<string | null>(null);

  async function openEditDialog() {
    if (!testCase) return;
    setEditCode(testCase.code);
    setEditModuleId(testCase.moduleId);
    setEditTitle(testCase.title);
    setEditObjective(testCase.objective ?? '');
    setEditPreconditions(testCase.preconditions ?? '');
    setEditStepType(testCase.stepType);
    setEditSteps(testCase.steps);
    setEditExpectedResult(testCase.expectedResult);
    setEditPriority(testCase.priority);
    setEditTargetRoleId(testCase.targetRoleId);
    setEditNotes(testCase.notes ?? '');
    setEditTags(testCase.tags.map((t) => t.name));
    setEditError(null);
    if (testCase.stepType === 'detailed') {
      const steps = detailedSteps.length > 0 ? detailedSteps : await testCaseService.listSteps(testCase.id);
      setEditDetailedSteps(steps.map((s) => ({ action: s.action, expectedResult: s.expectedResult ?? '' })));
    } else {
      setEditDetailedSteps([]);
    }
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
          targetRoleId: editTargetRoleId,
          notes: editNotes.trim() || null,
          stepType: editStepType,
        },
        editTags,
        editStepType === 'detailed' ? editDetailedSteps : undefined,
        user?.id ?? null,
      );
      setEditDialogOpen(false);
      await reload();
      await queryClient.invalidateQueries({ queryKey: queryKeys.testCaseSteps(testCase.id) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.testCasesWithDetails(testCase.project.id) });
      toastHelper.success('Test case updated');
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
      externalLinks: testCase.externalLinks,
      createdBy: user?.id ?? null,
    });
    await queryClient.invalidateQueries({ queryKey: queryKeys.testCasesWithDetails(testCase.project.id) });
    toastHelper.success('Test case duplicated');
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
        await testCaseService.remove(testCase.id, { actorId: user?.id });
        await queryClient.invalidateQueries({ queryKey: queryKeys.testCasesWithDetails(testCase.project.id) });
        toastHelper.success('Test case deleted');
        handleBack();
      },
    });
  }

  if (loading || !testCase) {
    if (loading) return <TestCaseDetailPageSkeleton />;
    return (
      <div>
        <Breadcrumb
          items={[
            { label: 'Projects', path: '/projects' },
            ...projectBreadcrumbItems,
            { label: 'Test Cases' },
            { label: 'Test case not found' },
          ]}
        />
        <p>Test case not found.</p>
      </div>
    );
  }

  const moduleOptions = modules.map((m) => ({ label: m.name, value: m.id }));

  return (
    <div>
      <ConfirmDialog />

      <Breadcrumb
        items={[
          { label: 'Projects', path: '/projects' },
          ...projectBreadcrumbItems,
          { label: 'Test Cases', path: `/projects/${testCase.project.id}?tab=testCases` },
          { label: `${testCase.code} — ${testCase.title}` },
        ]}
      />

      <div className="detail-content-col mx-auto">
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

          <div className="flex flex-wrap column-gap-4 row-gap-1 mt-3 mb-3 text-xs">
            {testCase.createdBy && authorProfile && (
              <span className="text-color-secondary">
                <i className="pi pi-user mr-1" style={{ fontSize: '0.75rem' }} />
                Created by{' '}
                <UserHoverCard userId={testCase.createdBy}>
                  <span className="text-color entity-link">{authorProfile.username}</span>
                </UserHoverCard>
              </span>
            )}
            <span className="text-color-secondary">
              <i className="pi pi-calendar-plus mr-1" style={{ fontSize: '0.75rem' }} />
              Created <RelativeTime value={testCase.createdAt} className="text-color" />
            </span>
            <span className="text-color-secondary">
              <i className="pi pi-clock mr-1" style={{ fontSize: '0.75rem' }} />
              Updated <RelativeTime value={testCase.updatedAt} className="text-color" />
            </span>
          </div>

          <div className="project-stat-grid project-stat-grid-fixed2">
            <div className="project-stat-tile">
              <i className="pi pi-folder text-primary" />
              <div className="project-stat-tile-body">
                <span className="project-stat-value-text">{testCase.project.name}</span>
                <span className="project-stat-label">Project</span>
              </div>
            </div>
            <div className="project-stat-tile">
              <i className="pi pi-sitemap text-primary" />
              <div className="project-stat-tile-body">
                <span className="project-stat-value-text">{testCase.module?.name ?? '-'}</span>
                <span className="project-stat-label">Module</span>
              </div>
            </div>
          </div>

          {testCase.tags.length > 0 && (
            <div className="flex align-items-center flex-wrap gap-2 mt-3 compact-chips">
              {testCase.tags.map((t) => (
                <Chip key={t.id} label={t.name} />
              ))}
            </div>
          )}
        </Card>

        {testCase.objective && (
          <Card title="Objective" className="mb-3 detail-content-card">
            <p className="m-0">{testCase.objective}</p>
          </Card>
        )}

        {testCase.preconditions && (
          <Card title="Preconditions" className="mb-3 detail-content-card">
            <p className="m-0" style={{ whiteSpace: 'pre-wrap' }}>{testCase.preconditions}</p>
          </Card>
        )}

        {testCase.stepType === 'detailed' ? (
          <Card title="Test Steps" className="mb-3 detail-content-card">
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
            <Card title="Test Steps" className="mb-3 detail-content-card">
              <p className="m-0" style={{ whiteSpace: 'pre-wrap' }}>{testCase.steps}</p>
            </Card>

            <Card title="Expected Result" className="mb-3 detail-content-card">
              <p className="m-0" style={{ whiteSpace: 'pre-wrap' }}>{testCase.expectedResult}</p>
            </Card>
          </>
        )}

        {testCase.notes && (
          <Card title="Notes" className="mb-3 detail-content-card">
            <p className="m-0" style={{ whiteSpace: 'pre-wrap' }}>{testCase.notes}</p>
          </Card>
        )}

        <Card title="Attachment" className="mb-3 detail-content-card">
          <AttachmentPanel
            projectId={testCase.project.id}
            entityType="test_case"
            entityId={testCase.id}
            canManage={canEditContent}
          />
        </Card>

        <Card title="External Links" className="mb-3 detail-content-card">
          <div className="flex flex-column gap-2">
            {testCase.externalLinks.map((link, i) => (
              <div key={i} className="flex align-items-center justify-content-between p-2 border-round surface-100">
                <div className="flex align-items-center gap-2">
                  <i className="pi pi-external-link" style={{ fontSize: '1rem' }} />
                  <a className="entity-link" href={link.url} target="_blank" rel="noreferrer">
                    {link.label || link.url}
                  </a>
                  {link.label && link.url && (
                    <span className="text-color-secondary text-sm ml-2">{link.url}</span>
                  )}
                </div>
                {canEditContent && (
                  <Button icon="pi pi-trash" size="small" text severity="danger" onClick={() => handleRemoveExternalLink(i)} />
                )}
              </div>
            ))}
            {testCase.externalLinks.length === 0 && <p className="text-color-secondary text-sm m-0">No external links yet.</p>}
            {canEditContent && (
              <>
                {externalAdding ? (
                  <div className="flex flex-column gap-2 p-2 border-round surface-100">
                    <InputText
                      placeholder="URL"
                      value={newExternalUrl}
                      onChange={(e) => setNewExternalUrl(e.target.value)}
                      autoFocus
                    />
                    <InputText
                      placeholder="Label (optional)"
                      value={newExternalLabel}
                      onChange={(e) => setNewExternalLabel(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <Button label="Add" size="small" onClick={handleAddExternalLink} disabled={!newExternalUrl.trim()} />
                      <Button label="Cancel" size="small" text severity="secondary" onClick={resetExternalForm} />
                    </div>
                  </div>
                ) : (
                  <Button label="Add Link" icon="pi pi-plus" text severity="secondary" size="small" className="w-fit comment-btn-sm" onClick={() => setExternalAdding(true)} />
                )}
              </>
            )}
          </div>
        </Card>

        <Card title="Activity" className="mb-3 detail-content-card">
          <ActivityPanel projectId={testCase.project.id} entityType="test_case" entityId={testCase.id} />
        </Card>
      </div>

      {/* --- Edit Test Case Dialog (Shared TestCaseDialog) --- */}
      <TestCaseDialog
        visible={editDialogOpen}
        editing={true}
        code={editCode}
        onCodeChange={setEditCode}
        moduleId={editModuleId}
        onModuleIdChange={setEditModuleId}
        moduleOptions={moduleOptions}
        onQuickAddModule={openCreateModuleDialog}
        priority={editPriority}
        onPriorityChange={setEditPriority}
        targetRoleId={editTargetRoleId}
        onTargetRoleIdChange={setEditTargetRoleId}
        testRoleOptions={testRoles.map((r) => ({ label: r.name, value: r.id }))}
        onQuickAddTestRole={openCreateTestRoleDialog}
        title={editTitle}
        onTitleChange={setEditTitle}
        objective={editObjective}
        onObjectiveChange={setEditObjective}
        preconditions={editPreconditions}
        onPreconditionsChange={setEditPreconditions}
        stepType={editStepType}
        onStepTypeChange={setEditStepType}
        steps={editSteps}
        onStepsChange={setEditSteps}
        expectedResult={editExpectedResult}
        onExpectedResultChange={setEditExpectedResult}
        detailedSteps={editDetailedSteps}
        onDetailedStepsChange={setEditDetailedSteps}
        tags={editTags}
        onTagsChange={setEditTags}
        tagOptions={tags.map((t) => ({ label: t.name, value: t.name }))}
        onQuickAddTag={openCreateTagDialog}
        notes={editNotes}
        onNotesChange={setEditNotes}
        error={editError}
        onHide={() => setEditDialogOpen(false)}
        onSave={handleSaveEdit}
      />

      <ModuleDialog
        visible={moduleDialogOpen}
        editing={false}
        code={moduleCode}
        onCodeChange={setModuleCode}
        name={moduleName}
        onNameChange={setModuleName}
        error={moduleError}
        onHide={() => setModuleDialogOpen(false)}
        onSave={handleSaveModule}
      />

      <TagDialog
        visible={tagDialogOpen}
        editing={false}
        name={newTagName}
        onNameChange={setNewTagName}
        error={tagError}
        onHide={() => setTagDialogOpen(false)}
        onSave={handleSaveTag}
      />

      <TestRoleDialog
        visible={testRoleDialogOpen}
        editing={false}
        name={testRoleName}
        onNameChange={setTestRoleName}
        error={testRoleError}
        onHide={() => setTestRoleDialogOpen(false)}
        onSave={handleSaveTestRole}
      />
    </div>
  );
}
