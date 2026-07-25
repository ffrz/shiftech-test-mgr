import { useCallback, useMemo, useRef, useState } from 'react';
import { useScreenSize } from '../../hooks/useScreenSize';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { DataTable, type DataTableSortEvent } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { IconField } from 'primereact/iconfield';
import { InputIcon } from 'primereact/inputicon';
import { Dropdown } from 'primereact/dropdown';
import { Tag } from 'primereact/tag';
import { Menu } from 'primereact/menu';
import { Checkbox } from 'primereact/checkbox';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Toast } from 'primereact/toast';
import { useProjects } from '../../hooks/useProjects';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import { projectService } from '../../services/projectService';
import { testSuiteService } from '../../services/testSuiteService';
import { testPlanService } from '../../services/testPlanService';
import { testCaseService } from '../../services/testCaseService';
import { issueService } from '../../services/issueService';
import { projectDuplicateService } from '../../services/projectDuplicateService';
import { queryKeys } from '../../hooks/queryKeys';
import type { IssueWithDetails, Project, ProjectSortField, ProjectStatus, ProjectVisibility, TestCaseWithDetails, TestPlan } from '../../types/domain';
import type { ProjectQuery } from '../../repositories/projectRepository';
import { formatDate } from '../../helpers/dateFormatter';
import { PageHeader } from '../../components/ui/PageHeader';
import { PROJECT_STATUS_LABEL, PROJECT_STATUS_SEVERITY, PROJECT_VISIBILITY_LABEL, PROJECT_VISIBILITY_SEVERITY } from '../../helpers/statusLabels';

const STATUS_OPTIONS: { label: string; value: ProjectStatus | 'all' }[] = [
  { label: 'All Statuses', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
  { label: 'Archived', value: 'archived' },
];

const VISIBILITY_OPTIONS: { label: string; value: ProjectVisibility }[] = [
  { label: 'Private — only invited members', value: 'private' },
  { label: 'Unlisted — anyone with the link can view', value: 'unlisted' },
  { label: 'Public — visible to everyone', value: 'public' },
];

export function ProjectsPage() {
  const navigate = useNavigate();
  const toast = useRef<Toast>(null);
  const { lt } = useScreenSize();
  const isMobile = lt.sm;
  const menuRef = useRef<Menu>(null);

  const mobileBody = useCallback((row: Project) => (
    <div className="flex flex-column gap-2 py-1">
      <div className="flex align-items-center justify-content-between gap-2">
        <span className="font-bold text-base">{row.name}</span>
        <div className="flex align-items-start">
          <Button
            icon="pi pi-ellipsis-v"
            text
            rounded
            plain
            size="small"
            className="text-color-secondary"
            onClick={(e) => {
              e.stopPropagation();
              openRowMenu(row, e);
            }}
          />
        </div>
      </div>
      <div className="flex align-items-center gap-2 text-sm text-color-secondary">
        <Tag value={PROJECT_STATUS_LABEL[row.status]} severity={PROJECT_STATUS_SEVERITY[row.status]} />
        <Tag value={PROJECT_VISIBILITY_LABEL[row.visibility]} severity={PROJECT_VISIBILITY_SEVERITY[row.visibility]} />
      </div>
      {row.description && (
        <div className="text-sm text-color-secondary line-height-3">{row.description}</div>
      )}
      <div className="text-xs text-color-secondary">
        <i className="pi pi-calendar mr-1" />
        Created {formatDate(row.createdAt)}
      </div>
    </div>
  ), []);
  const [menuRow, setMenuRow] = useState<Project | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'all'>('all');
  const [sortField, setSortField] = useState<ProjectSortField>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const query: ProjectQuery = useMemo(
    () => ({ search, status: statusFilter, sortField, sortDirection }),
    [search, statusFilter, sortField, sortDirection],
  );
  const { projects, loading, reload } = useProjects(query);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<ProjectVisibility>('private');
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: templates = [] } = useQuery({
    queryKey: queryKeys.testSuites(),
    queryFn: () => testSuiteService.listSuites(),
    enabled: dialogOpen && !editingId,
  });

  function openCreateDialog() {
    setEditingId(null);
    setName('');
    setDescription('');
    setVisibility('private');
    setTemplateId(null);
    setError(null);
    setDialogOpen(true);
  }

  function openEditDialog(row: Project) {
    setEditingId(row.id);
    setName(row.name);
    setDescription(row.description ?? '');
    setVisibility(row.visibility);
    setError(null);
    setDialogOpen(true);
  }

  async function handleSave() {
    setError(null);
    try {
      if (editingId) {
        await projectService.update(editingId, { name, description, visibility });
      } else {
        const created = await projectService.create({ name, description, visibility });
        if (templateId) {
          const items = await testSuiteService.listItems(templateId);
          await testSuiteService.cloneItemsToProject(created.id, items.map((i) => i.id));
        }
      }
      setDialogOpen(false);
      await reload();
      toast.current?.show({ severity: 'success', summary: editingId ? 'Project updated' : 'Project created' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save project');
    }
  }

  // --- Duplicate Project: checklist picker (Test Plans / Test Cases / Issues), Test
  // Runs/Results are execution history and are never copied ---
  const [duplicateSourceProject, setDuplicateSourceProject] = useState<Project | null>(null);
  const [duplicateName, setDuplicateName] = useState('');
  const [duplicateError, setDuplicateError] = useState<string | null>(null);
  const [duplicateLoading, setDuplicateLoading] = useState(false);
  const [sourceTestPlans, setSourceTestPlans] = useState<TestPlan[]>([]);
  const [sourceTestCases, setSourceTestCases] = useState<TestCaseWithDetails[]>([]);
  const [sourceIssues, setSourceIssues] = useState<IssueWithDetails[]>([]);
  const [selectedTestPlanIds, setSelectedTestPlanIds] = useState<Set<string>>(new Set());
  const [selectedTestCaseIds, setSelectedTestCaseIds] = useState<Set<string>>(new Set());
  const [selectedIssueIds, setSelectedIssueIds] = useState<Set<string>>(new Set());

  async function openDuplicateDialog(row: Project) {
    setDuplicateSourceProject(row);
    setDuplicateName(`${row.name} (Copy)`);
    setDuplicateError(null);
    const [plans, cases, issues] = await Promise.all([
      testPlanService.listByProject(row.id),
      testCaseService.listByProjectWithDetails(row.id),
      issueService.listByProject(row.id),
    ]);
    setSourceTestPlans(plans);
    setSourceTestCases(cases);
    setSourceIssues(issues);
    // Everything checked by default — user unchecks what they don't want to bring along.
    setSelectedTestPlanIds(new Set(plans.map((p) => p.id)));
    setSelectedTestCaseIds(new Set(cases.map((c) => c.id)));
    setSelectedIssueIds(new Set(issues.map((i) => i.id)));
  }

  function toggleSelection(set: Set<string>, setSet: (s: Set<string>) => void, id: string, checked: boolean) {
    const next = new Set(set);
    if (checked) next.add(id);
    else next.delete(id);
    setSet(next);
  }

  async function handleDuplicateProject() {
    if (!duplicateSourceProject) return;
    setDuplicateError(null);
    setDuplicateLoading(true);
    try {
      const created = await projectDuplicateService.duplicateProject(
        duplicateName,
        {
          testPlanIds: [...selectedTestPlanIds],
          testCaseIds: [...selectedTestCaseIds],
          issueIds: [...selectedIssueIds],
        },
        { testPlans: sourceTestPlans, testCases: sourceTestCases, issues: sourceIssues },
      );
      setDuplicateSourceProject(null);
      await reload();
      toast.current?.show({ severity: 'success', summary: 'Project duplicated' });
      navigate(`/projects/${created.id}`);
    } catch (err) {
      setDuplicateError(err instanceof Error ? err.message : 'Failed to duplicate project');
    } finally {
      setDuplicateLoading(false);
    }
  }

  async function handleChangeStatus(row: Project, status: ProjectStatus) {
    await projectService.changeStatus(row.id, status);
    await reload();
    toast.current?.show({ severity: 'success', summary: 'Status updated', detail: row.name });
  }

  function handleDeletePermanently(row: Project) {
    confirmDialog({
      header: 'Delete Permanently',
      message: (
        <span>
          Project <strong>"{row.name}"</strong> and all its test plans and test cases will be{' '}
          <strong>permanently deleted and cannot be recovered</strong>. Continue?
        </span>
      ),
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Delete Permanently',
      rejectLabel: 'Cancel',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        await projectService.deletePermanently(row.id);
        await reload();
        toast.current?.show({ severity: 'success', summary: 'Project permanently deleted', detail: row.name });
      },
    });
  }

  function onSort(e: DataTableSortEvent) {
    setSortField((e.sortField as ProjectSortField) ?? 'name');
    setSortDirection(e.sortOrder === 1 ? 'asc' : 'desc');
  }

  function openRowMenu(row: Project, event: React.MouseEvent) {
    setMenuRow(row);
    menuRef.current?.toggle(event);
  }

  const menuItems = menuRow
    ? [
      { label: 'View Details', icon: 'pi pi-eye', command: () => navigate(`/projects/${menuRow.id}`) },
      { label: 'Edit', icon: 'pi pi-pencil', command: () => openEditDialog(menuRow) },
      { label: 'Duplicate', icon: 'pi pi-copy', command: () => openDuplicateDialog(menuRow) },
      { separator: true },
      ...(menuRow.status !== 'active'
        ? [{ label: 'Set Active', icon: 'pi pi-play', command: () => handleChangeStatus(menuRow, 'active') }]
        : []),
      ...(menuRow.status !== 'inactive'
        ? [{ label: 'Set Inactive', icon: 'pi pi-pause', command: () => handleChangeStatus(menuRow, 'inactive') }]
        : []),
      ...(menuRow.status !== 'archived'
        ? [{ label: 'Archive', icon: 'pi pi-inbox', command: () => handleChangeStatus(menuRow, 'archived') }]
        : []),
      { separator: true },
      { label: 'Delete Permanently', icon: 'pi pi-trash', command: () => handleDeletePermanently(menuRow) },
    ]
    : [];

  return (
    <div>
      <Toast ref={toast} />
      <ConfirmDialog />
      <Menu model={menuItems} popup ref={menuRef} appendTo={document.body} />

      <Breadcrumb items={[{ label: 'Projects' }]} />

      <PageHeader title="Projects" actions={<Button label="New Project" icon="pi pi-plus" size="small" onClick={openCreateDialog} />} />

      <div className="flex gap-2 mb-3">
        <IconField iconPosition="left" className="flex-1">
          <InputIcon className="pi pi-search" />
          <InputText
            className="w-full"
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </IconField>
        <Dropdown
          value={statusFilter}
          options={STATUS_OPTIONS}
          onChange={(e) => setStatusFilter(e.value)}
          className="w-14rem"
        />
      </div>

      <DataTable
        value={projects}
        loading={loading}
        paginator
        rows={10} rowsPerPageOptions={[5, 10, 25, 50]}
        size="small"
        emptyMessage="No projects yet"
        sortField={isMobile ? undefined : sortField}
        sortOrder={isMobile ? undefined : (sortDirection === 'asc' ? 1 : -1)}
        onSort={isMobile ? undefined : onSort}
        onRowClick={(e) => navigate(`/projects/${(e.data as Project).id}`)}
        rowHover
        className="cursor-pointer"
      >
        {isMobile && (
          <Column field="name" header="Project" body={mobileBody} />
        )}
        {!isMobile && <Column field="name" header="Name" sortable />}
        {!isMobile && <Column field="description" header="Description" />}
        {!isMobile && (
          <Column
            field="status"
            header="Status"
            body={(row: Project) => <Tag value={PROJECT_STATUS_LABEL[row.status]} severity={PROJECT_STATUS_SEVERITY[row.status]} />}
          />
        )}
        {!isMobile && (
          <Column
            field="visibility"
            header="Visibility"
            body={(row: Project) => <Tag value={PROJECT_VISIBILITY_LABEL[row.visibility]} severity={PROJECT_VISIBILITY_SEVERITY[row.visibility]} />}
          />
        )}
        {!isMobile && (
          <Column field="createdAt" header="Created" body={(row: Project) => formatDate(row.createdAt)} sortable />
        )}
        {!isMobile && (
          <Column
            header=""
            style={{ width: '4rem' }}
            body={(row: Project) => (
              <div className="flex align-items-start">
                <Button
                  icon="pi pi-ellipsis-v"
                  text
                  rounded
                  plain
                  size="small"
                  className="text-color-secondary"
                  onClick={(e) => {
                    e.stopPropagation();
                    openRowMenu(row, e);
                  }}
                />
              </div>
            )}
          />
        )}
      </DataTable>

      <Dialog header={editingId ? 'Edit Project' : 'New Project'} visible={dialogOpen} onHide={() => setDialogOpen(false)} style={{ width: '30rem' }}>
        <div className="flex flex-column gap-3">
          {error && <small className="p-error">{error}</small>}
          <div className="flex flex-column gap-1">
            <label htmlFor="name">Name</label>
            <InputText id="name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>
          <div className="flex flex-column gap-1">
            <label htmlFor="description">Description</label>
            <InputTextarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
          <div className="flex flex-column gap-1">
            <label htmlFor="visibility">Visibility</label>
            <Dropdown
              id="visibility"
              value={visibility}
              options={VISIBILITY_OPTIONS}
              onChange={(e) => setVisibility(e.value)}
              className="w-full"
            />
          </div>
          {!editingId && (
            <div className="flex flex-column gap-1">
              <label htmlFor="project-template">Start from Template (optional)</label>
              <Dropdown
                id="project-template"
                value={templateId}
                options={templates.map((t) => ({ label: t.name, value: t.id }))}
                onChange={(e) => setTemplateId(e.value)}
                placeholder="No template"
                showClear
                className="w-full"
              />
            </div>
          )}
          <Button label="Save" size="small" onClick={handleSave} />
        </div>
      </Dialog>

      <Dialog
        header="Duplicate Project"
        visible={!!duplicateSourceProject}
        onHide={() => setDuplicateSourceProject(null)}
        style={{ width: '40rem' }}
      >
        <div className="flex flex-column gap-3">
          {duplicateError && <small className="p-error">{duplicateError}</small>}
          <div className="flex flex-column gap-1">
            <label htmlFor="duplicate-project-name">New Project Name</label>
            <InputText id="duplicate-project-name" value={duplicateName} onChange={(e) => setDuplicateName(e.target.value)} autoFocus />
          </div>

          <div className="flex flex-column gap-1">
            <div className="flex align-items-center justify-content-between">
              <label className="font-medium">Test Plan ({selectedTestPlanIds.size}/{sourceTestPlans.length})</label>
              <div className="flex align-items-center gap-2">
                <Checkbox
                  checked={sourceTestPlans.length > 0 && selectedTestPlanIds.size === sourceTestPlans.length}
                  onChange={(e) => setSelectedTestPlanIds(e.checked ? new Set(sourceTestPlans.map((p) => p.id)) : new Set())}
                />
                <span className="text-sm text-color-secondary">Select All</span>
              </div>
            </div>
            <div className="flex flex-column gap-1 p-2 border-round" style={{ border: '1px solid var(--surface-border)', maxHeight: '10rem', overflowY: 'auto' }}>
              {sourceTestPlans.length === 0 && <span className="text-sm text-color-secondary">No test plans.</span>}
              {sourceTestPlans.map((p) => (
                <div key={p.id} className="flex align-items-center gap-2">
                  <Checkbox
                    inputId={`plan-${p.id}`}
                    checked={selectedTestPlanIds.has(p.id)}
                    onChange={(e) => toggleSelection(selectedTestPlanIds, setSelectedTestPlanIds, p.id, e.checked ?? false)}
                  />
                  <label htmlFor={`plan-${p.id}`} className="text-sm">{p.code} — {p.name}</label>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-column gap-1">
            <div className="flex align-items-center justify-content-between">
              <label className="font-medium">Test Case ({selectedTestCaseIds.size}/{sourceTestCases.length})</label>
              <div className="flex align-items-center gap-2">
                <Checkbox
                  checked={sourceTestCases.length > 0 && selectedTestCaseIds.size === sourceTestCases.length}
                  onChange={(e) => setSelectedTestCaseIds(e.checked ? new Set(sourceTestCases.map((c) => c.id)) : new Set())}
                />
                <span className="text-sm text-color-secondary">Select All</span>
              </div>
            </div>
            <div className="flex flex-column gap-1 p-2 border-round" style={{ border: '1px solid var(--surface-border)', maxHeight: '10rem', overflowY: 'auto' }}>
              {sourceTestCases.length === 0 && <span className="text-sm text-color-secondary">No test cases.</span>}
              {sourceTestCases.map((c) => (
                <div key={c.id} className="flex align-items-center gap-2">
                  <Checkbox
                    inputId={`case-${c.id}`}
                    checked={selectedTestCaseIds.has(c.id)}
                    onChange={(e) => toggleSelection(selectedTestCaseIds, setSelectedTestCaseIds, c.id, e.checked ?? false)}
                  />
                  <label htmlFor={`case-${c.id}`} className="text-sm">{c.code} — {c.title}</label>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-column gap-1">
            <div className="flex align-items-center justify-content-between">
              <label className="font-medium">Issue ({selectedIssueIds.size}/{sourceIssues.length})</label>
              <div className="flex align-items-center gap-2">
                <Checkbox
                  checked={sourceIssues.length > 0 && selectedIssueIds.size === sourceIssues.length}
                  onChange={(e) => setSelectedIssueIds(e.checked ? new Set(sourceIssues.map((i) => i.id)) : new Set())}
                />
                <span className="text-sm text-color-secondary">Select All</span>
              </div>
            </div>
            <div className="flex flex-column gap-1 p-2 border-round" style={{ border: '1px solid var(--surface-border)', maxHeight: '10rem', overflowY: 'auto' }}>
              {sourceIssues.length === 0 && <span className="text-sm text-color-secondary">No issues.</span>}
              {sourceIssues.map((i) => (
                <div key={i.id} className="flex align-items-center gap-2">
                  <Checkbox
                    inputId={`issue-${i.id}`}
                    checked={selectedIssueIds.has(i.id)}
                    onChange={(e) => toggleSelection(selectedIssueIds, setSelectedIssueIds, i.id, e.checked ?? false)}
                  />
                  <label htmlFor={`issue-${i.id}`} className="text-sm">{i.code} — {i.title}</label>
                </div>
              ))}
            </div>
          </div>

          <Button label="Duplicate Project" size="small" loading={duplicateLoading} onClick={handleDuplicateProject} />
        </div>
      </Dialog>
    </div>
  );
}
