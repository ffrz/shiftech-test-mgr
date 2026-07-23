import { useMemo, useRef, useState } from 'react';
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
import { testCaseTemplateService } from '../../services/testCaseTemplateService';
import { testPlanService } from '../../services/testPlanService';
import { testCaseService } from '../../services/testCaseService';
import { issueService } from '../../services/issueService';
import { projectDuplicateService } from '../../services/projectDuplicateService';
import { queryKeys } from '../../hooks/queryKeys';
import type { IssueWithDetails, Project, ProjectSortField, ProjectStatus, TestCaseWithDetails, TestPlan } from '../../types/domain';
import type { ProjectQuery } from '../../repositories/projectRepository';
import { formatDate } from '../../helpers/dateFormatter';
import { PageHeader } from '../../components/ui/PageHeader';
import { PROJECT_STATUS_LABEL, PROJECT_STATUS_SEVERITY } from '../../helpers/statusLabels';

const STATUS_OPTIONS: { label: string; value: ProjectStatus | 'all' }[] = [
  { label: 'Semua Status', value: 'all' },
  { label: 'Aktif', value: 'active' },
  { label: 'Nonaktif', value: 'inactive' },
  { label: 'Arsip', value: 'archived' },
];

export function ProjectsPage() {
  const navigate = useNavigate();
  const toast = useRef<Toast>(null);
  const menuRef = useRef<Menu>(null);
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
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: templates = [] } = useQuery({
    queryKey: queryKeys.testCaseTemplates(),
    queryFn: () => testCaseTemplateService.listTemplates(),
    enabled: dialogOpen && !editingId,
  });

  function openCreateDialog() {
    setEditingId(null);
    setName('');
    setDescription('');
    setTemplateId(null);
    setError(null);
    setDialogOpen(true);
  }

  function openEditDialog(row: Project) {
    setEditingId(row.id);
    setName(row.name);
    setDescription(row.description ?? '');
    setError(null);
    setDialogOpen(true);
  }

  async function handleSave() {
    setError(null);
    try {
      if (editingId) {
        await projectService.update(editingId, { name, description });
      } else {
        const created = await projectService.create({ name, description });
        if (templateId) {
          const items = await testCaseTemplateService.listItems(templateId);
          await testCaseTemplateService.cloneItemsToProject(created.id, items.map((i) => i.id));
        }
      }
      setDialogOpen(false);
      await reload();
      toast.current?.show({ severity: 'success', summary: editingId ? 'Project diperbarui' : 'Project dibuat' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan project');
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
      toast.current?.show({ severity: 'success', summary: 'Project diduplikat' });
      navigate(`/projects/${created.id}`);
    } catch (err) {
      setDuplicateError(err instanceof Error ? err.message : 'Gagal menduplikat project');
    } finally {
      setDuplicateLoading(false);
    }
  }

  async function handleChangeStatus(row: Project, status: ProjectStatus) {
    await projectService.changeStatus(row.id, status);
    await reload();
    toast.current?.show({ severity: 'success', summary: 'Status diperbarui', detail: row.name });
  }

  function handleDeletePermanently(row: Project) {
    confirmDialog({
      header: 'Hapus Permanen',
      message: (
        <span>
          Project <strong>"{row.name}"</strong> beserta seluruh test plan dan test case di dalamnya akan{' '}
          <strong>dihapus permanen dan tidak bisa dikembalikan</strong>. Lanjutkan?
        </span>
      ),
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Hapus Permanen',
      rejectLabel: 'Batal',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        await projectService.deletePermanently(row.id);
        await reload();
        toast.current?.show({ severity: 'success', summary: 'Project dihapus permanen', detail: row.name });
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
      { label: 'Lihat Detail', icon: 'pi pi-eye', command: () => navigate(`/projects/${menuRow.id}`) },
      { label: 'Edit', icon: 'pi pi-pencil', command: () => openEditDialog(menuRow) },
      { label: 'Duplikat', icon: 'pi pi-copy', command: () => openDuplicateDialog(menuRow) },
      { separator: true },
      ...(menuRow.status !== 'active'
        ? [{ label: 'Jadikan Aktif', icon: 'pi pi-play', command: () => handleChangeStatus(menuRow, 'active') }]
        : []),
      ...(menuRow.status !== 'inactive'
        ? [{ label: 'Jadikan Nonaktif', icon: 'pi pi-pause', command: () => handleChangeStatus(menuRow, 'inactive') }]
        : []),
      ...(menuRow.status !== 'archived'
        ? [{ label: 'Arsipkan', icon: 'pi pi-inbox', command: () => handleChangeStatus(menuRow, 'archived') }]
        : []),
      { separator: true },
      { label: 'Hapus Permanen', icon: 'pi pi-trash', command: () => handleDeletePermanently(menuRow) },
    ]
    : [];

  return (
    <div>
      <Toast ref={toast} />
      <ConfirmDialog />
      <Menu model={menuItems} popup ref={menuRef} />

      <Breadcrumb items={[{ label: 'Projects' }]} />

      <PageHeader title="Projects" actions={<Button label="Project Baru" icon="pi pi-plus" size="small" onClick={openCreateDialog} />} />

      <div className="flex gap-2 mb-3">
        <IconField iconPosition="left" className="flex-1">
          <InputIcon className="pi pi-search" />
          <InputText
            className="w-full"
            placeholder="Cari project..."
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
        rows={5}
        size="small"
        emptyMessage="Belum ada project"
        sortField={sortField}
        sortOrder={sortDirection === 'asc' ? 1 : -1}
        onSort={onSort}
        onRowClick={(e) => navigate(`/projects/${(e.data as Project).id}`)}
        rowHover
        className="cursor-pointer"
      >
        <Column field="name" header="Nama" sortable />
        <Column field="description" header="Deskripsi" />
        <Column
          field="status"
          header="Status"
          body={(row: Project) => <Tag value={PROJECT_STATUS_LABEL[row.status]} severity={PROJECT_STATUS_SEVERITY[row.status]} />}
        />
        <Column field="createdAt" header="Dibuat" body={(row: Project) => formatDate(row.createdAt)} sortable />
        <Column
          header=""
          style={{ width: '4rem' }}
          body={(row: Project) => (
            <Button
              icon="pi pi-ellipsis-v"
              text
              rounded
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                openRowMenu(row, e);
              }}
            />
          )}
        />
      </DataTable>

      <Dialog header={editingId ? 'Edit Project' : 'Project Baru'} visible={dialogOpen} onHide={() => setDialogOpen(false)} style={{ width: '30rem' }}>
        <div className="flex flex-column gap-3">
          {error && <small className="p-error">{error}</small>}
          <div className="flex flex-column gap-1">
            <label htmlFor="name">Nama</label>
            <InputText id="name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>
          <div className="flex flex-column gap-1">
            <label htmlFor="description">Deskripsi</label>
            <InputTextarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
          {!editingId && (
            <div className="flex flex-column gap-1">
              <label htmlFor="project-template">Mulai dari Template (opsional)</label>
              <Dropdown
                id="project-template"
                value={templateId}
                options={templates.map((t) => ({ label: t.name, value: t.id }))}
                onChange={(e) => setTemplateId(e.value)}
                placeholder="Tanpa template"
                showClear
                className="w-full"
              />
            </div>
          )}
          <Button label="Simpan" size="small" onClick={handleSave} />
        </div>
      </Dialog>

      <Dialog
        header="Duplikat Project"
        visible={!!duplicateSourceProject}
        onHide={() => setDuplicateSourceProject(null)}
        style={{ width: '40rem' }}
      >
        <div className="flex flex-column gap-3">
          {duplicateError && <small className="p-error">{duplicateError}</small>}
          <div className="flex flex-column gap-1">
            <label htmlFor="duplicate-project-name">Nama Project Baru</label>
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
                <span className="text-sm text-color-secondary">Pilih Semua</span>
              </div>
            </div>
            <div className="flex flex-column gap-1 p-2 border-round" style={{ border: '1px solid var(--surface-border)', maxHeight: '10rem', overflowY: 'auto' }}>
              {sourceTestPlans.length === 0 && <span className="text-sm text-color-secondary">Tidak ada test plan.</span>}
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
                <span className="text-sm text-color-secondary">Pilih Semua</span>
              </div>
            </div>
            <div className="flex flex-column gap-1 p-2 border-round" style={{ border: '1px solid var(--surface-border)', maxHeight: '10rem', overflowY: 'auto' }}>
              {sourceTestCases.length === 0 && <span className="text-sm text-color-secondary">Tidak ada test case.</span>}
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
                <span className="text-sm text-color-secondary">Pilih Semua</span>
              </div>
            </div>
            <div className="flex flex-column gap-1 p-2 border-round" style={{ border: '1px solid var(--surface-border)', maxHeight: '10rem', overflowY: 'auto' }}>
              {sourceIssues.length === 0 && <span className="text-sm text-color-secondary">Tidak ada issue.</span>}
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

          <Button label="Duplikat Project" size="small" loading={duplicateLoading} onClick={handleDuplicateProject} />
        </div>
      </Dialog>
    </div>
  );
}
