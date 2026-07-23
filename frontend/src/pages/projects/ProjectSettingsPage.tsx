import { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { TabView, TabPanel } from 'primereact/tabview';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Toast } from 'primereact/toast';
import { IconField } from 'primereact/iconfield';
import { InputIcon } from 'primereact/inputicon';
import { RowActionsMenu } from '../../components/ui/RowActionsMenu';
import { BulkActionsBar } from '../../components/ui/BulkActionsBar';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import { projectService } from '../../services/projectService';
import { moduleService } from '../../services/moduleService';
import { tagService } from '../../services/tagService';
import { testRoleService } from '../../services/testRoleService';
import { profileService } from '../../services/profileService';
import { projectMemberService } from '../../services/projectMemberService';
import { useProjectRole } from '../../hooks/useProjectRole';
import type { Project, Module, Tag as TagEntity, TestRole, Profile, ProjectMemberWithProfile, ProjectMemberRole } from '../../types/domain';
import { PROJECT_MEMBER_ROLE_LABEL } from '../../helpers/statusLabels';
import { Tag } from 'primereact/tag';
import { PROJECT_STATUS_LABEL, PROJECT_STATUS_SEVERITY } from '../../helpers/statusLabels';

const MEMBER_ROLE_OPTIONS: { label: string; value: ProjectMemberRole }[] = [
  { label: PROJECT_MEMBER_ROLE_LABEL.member, value: 'member' },
  { label: PROJECT_MEMBER_ROLE_LABEL.supervisor, value: 'supervisor' },
  { label: PROJECT_MEMBER_ROLE_LABEL.tester, value: 'tester' },
  { label: PROJECT_MEMBER_ROLE_LABEL.manager, value: 'manager' },
];

export function ProjectSettingsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useRef<Toast>(null);
  const { loading: roleLoading, canManageSettings, canArchiveProject, canDeleteProject } = useProjectRole(id);

  const [project, setProject] = useState<Project | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [tags, setTags] = useState<TagEntity[]>([]);
  const [testRoles, setTestRoles] = useState<TestRole[]>([]);
  const [members, setMembers] = useState<ProjectMemberWithProfile[]>([]);
  const [approvedUsers, setApprovedUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadAll(showLoading = true) {
    if (!id) return;
    if (showLoading) setLoading(true);
    const [projectResult, modulesResult, tagsResult, testRolesResult, membersResult, usersResult] = await Promise.all([
      projectService.getById(id),
      moduleService.listByProject(id),
      tagService.listByProject(id),
      testRoleService.listByProject(id),
      projectMemberService.listByProject(id),
      profileService.listAll(),
    ]);
    setProject(projectResult);
    setModules(modulesResult);
    setTags(tagsResult);
    setTestRoles(testRolesResult);
    setMembers(membersResult);
    setApprovedUsers(usersResult.filter((p: Profile) => p.role === 'user' || p.role === 'admin'));
    if (showLoading) setLoading(false);
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // --- Module dialog ---
  const [moduleDialogOpen, setModuleDialogOpen] = useState(false);
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [moduleCode, setModuleCode] = useState('');
  const [moduleName, setModuleName] = useState('');
  const [moduleError, setModuleError] = useState<string | null>(null);
  const moduleNameRef = useRef<HTMLInputElement>(null);

  const [moduleSearch, setModuleSearch] = useState('');
  const [moduleSortField, setModuleSortField] = useState('code');
  const [moduleSortOrder, setModuleSortOrder] = useState<1 | -1>(1);
  const [selectedModules, setSelectedModules] = useState<Module[]>([]);

  const filteredModules = useMemo(() => {
    const q = moduleSearch.trim().toLowerCase();
    if (!q) return modules;
    return modules.filter((m) => m.name.toLowerCase().includes(q) || m.code.toLowerCase().includes(q));
  }, [modules, moduleSearch]);

  function openCreateModuleDialog() {
    setEditingModuleId(null);
    setModuleCode('');
    setModuleName('');
    setModuleError(null);
    setModuleDialogOpen(true);
  }

  function openEditModuleDialog(row: Module) {
    setEditingModuleId(row.id);
    setModuleCode(row.code);
    setModuleName(row.name);
    setModuleError(null);
    setModuleDialogOpen(true);
  }

  async function handleSaveModule() {
    if (!id) return;
    setModuleError(null);
    try {
      if (editingModuleId) {
        await moduleService.update(editingModuleId, { name: moduleName, code: moduleCode });
      } else {
        await moduleService.create({ projectId: id, name: moduleName, code: moduleCode });
      }
      setModuleDialogOpen(false);
      await loadAll(false);
      toast.current?.show({ severity: 'success', summary: editingModuleId ? 'Module diperbarui' : 'Module dibuat' });
    } catch (err) {
      setModuleError(err instanceof Error ? err.message : 'Gagal menyimpan module');
    }
  }

  function handleDeleteModule(row: Module) {
    confirmDialog({
      header: 'Hapus Module',
      message: `Module "${row.name}" akan dihapus. Test case yang memakai module ini akan menjadi tanpa module. Lanjutkan?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Hapus',
      rejectLabel: 'Batal',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        await moduleService.remove(row.id);
        await loadAll(false);
        toast.current?.show({ severity: 'success', summary: 'Module dihapus' });
      },
    });
  }

  function handleBulkDeleteModules() {
    confirmDialog({
      header: 'Hapus Module Terpilih',
      message: `${selectedModules.length} module akan dihapus. Test case yang memakai module ini akan menjadi tanpa module. Lanjutkan?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Hapus',
      rejectLabel: 'Batal',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        await Promise.all(selectedModules.map((m) => moduleService.remove(m.id)));
        setSelectedModules([]);
        await loadAll(false);
        toast.current?.show({ severity: 'success', summary: 'Module terpilih dihapus' });
      },
    });
  }

  // --- Tag dialog ---
  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [tagName, setTagName] = useState('');
  const [tagError, setTagError] = useState<string | null>(null);
  const tagNameRef = useRef<HTMLInputElement>(null);

  const [tagSearch, setTagSearch] = useState('');
  const [tagSortField, setTagSortField] = useState('name');
  const [tagSortOrder, setTagSortOrder] = useState<1 | -1>(1);
  const [selectedTags, setSelectedTags] = useState<TagEntity[]>([]);

  const filteredTags = useMemo(() => {
    const q = tagSearch.trim().toLowerCase();
    if (!q) return tags;
    return tags.filter((t) => t.name.toLowerCase().includes(q));
  }, [tags, tagSearch]);

  function openCreateTagDialog() {
    setEditingTagId(null);
    setTagName('');
    setTagError(null);
    setTagDialogOpen(true);
  }

  function openEditTagDialog(row: TagEntity) {
    setEditingTagId(row.id);
    setTagName(row.name);
    setTagError(null);
    setTagDialogOpen(true);
  }

  async function handleSaveTag() {
    if (!id) return;
    setTagError(null);
    try {
      if (editingTagId) {
        await tagService.rename(editingTagId, tagName);
      } else {
        await tagService.create(id, tagName);
      }
      setTagDialogOpen(false);
      await loadAll(false);
      toast.current?.show({ severity: 'success', summary: editingTagId ? 'Tag diperbarui' : 'Tag dibuat' });
    } catch (err) {
      setTagError(err instanceof Error ? err.message : 'Gagal menyimpan tag');
    }
  }

  function handleDeleteTag(row: TagEntity) {
    confirmDialog({
      header: 'Hapus Tag',
      message: `Tag "${row.name}" akan dihapus dan dilepas dari seluruh test case yang memakainya. Lanjutkan?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Hapus',
      rejectLabel: 'Batal',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        await tagService.remove(row.id);
        await loadAll(false);
        toast.current?.show({ severity: 'success', summary: 'Tag dihapus' });
      },
    });
  }

  function handleBulkDeleteTags() {
    confirmDialog({
      header: 'Hapus Tag Terpilih',
      message: `${selectedTags.length} tag akan dihapus dan dilepas dari seluruh test case yang memakainya. Lanjutkan?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Hapus',
      rejectLabel: 'Batal',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        await Promise.all(selectedTags.map((t) => tagService.remove(t.id)));
        setSelectedTags([]);
        await loadAll(false);
        toast.current?.show({ severity: 'success', summary: 'Tag terpilih dihapus' });
      },
    });
  }

  // --- Test Role dialog ---
  const [testRoleDialogOpen, setTestRoleDialogOpen] = useState(false);
  const [editingTestRoleId, setEditingTestRoleId] = useState<string | null>(null);
  const [testRoleName, setTestRoleName] = useState('');
  const [testRoleError, setTestRoleError] = useState<string | null>(null);
  const testRoleNameRef = useRef<HTMLInputElement>(null);

  const [testRoleSearch, setTestRoleSearch] = useState('');
  const [testRoleSortField, setTestRoleSortField] = useState('name');
  const [testRoleSortOrder, setTestRoleSortOrder] = useState<1 | -1>(1);
  const [selectedTestRoles, setSelectedTestRoles] = useState<TestRole[]>([]);

  const filteredTestRoles = useMemo(() => {
    const q = testRoleSearch.trim().toLowerCase();
    if (!q) return testRoles;
    return testRoles.filter((r) => r.name.toLowerCase().includes(q));
  }, [testRoles, testRoleSearch]);

  function openCreateTestRoleDialog() {
    setEditingTestRoleId(null);
    setTestRoleName('');
    setTestRoleError(null);
    setTestRoleDialogOpen(true);
  }

  function openEditTestRoleDialog(row: TestRole) {
    setEditingTestRoleId(row.id);
    setTestRoleName(row.name);
    setTestRoleError(null);
    setTestRoleDialogOpen(true);
  }

  async function handleSaveTestRole() {
    if (!id) return;
    setTestRoleError(null);
    try {
      if (editingTestRoleId) {
        await testRoleService.update(editingTestRoleId, { name: testRoleName });
      } else {
        await testRoleService.create({ projectId: id, name: testRoleName });
      }
      setTestRoleDialogOpen(false);
      await loadAll(false);
      toast.current?.show({ severity: 'success', summary: editingTestRoleId ? 'Role diperbarui' : 'Role dibuat' });
    } catch (err) {
      setTestRoleError(err instanceof Error ? err.message : 'Gagal menyimpan role');
    }
  }

  function handleDeleteTestRole(row: TestRole) {
    confirmDialog({
      header: 'Hapus Role',
      message: `Role "${row.name}" akan dihapus. Test case yang memakai role ini akan menjadi tanpa role. Lanjutkan?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Hapus',
      rejectLabel: 'Batal',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        await testRoleService.remove(row.id);
        await loadAll(false);
        toast.current?.show({ severity: 'success', summary: 'Role dihapus' });
      },
    });
  }

  function handleBulkDeleteTestRoles() {
    confirmDialog({
      header: 'Hapus Role Terpilih',
      message: `${selectedTestRoles.length} role akan dihapus. Test case yang memakai role ini akan menjadi tanpa role. Lanjutkan?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Hapus',
      rejectLabel: 'Batal',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        await Promise.all(selectedTestRoles.map((r) => testRoleService.remove(r.id)));
        setSelectedTestRoles([]);
        await loadAll(false);
        toast.current?.show({ severity: 'success', summary: 'Role terpilih dihapus' });
      },
    });
  }

  // --- Members ---
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [memberUserId, setMemberUserId] = useState<string | null>(null);
  const [memberRole, setMemberRole] = useState<ProjectMemberRole>('member');
  const [memberError, setMemberError] = useState<string | null>(null);
  const [selectedMembers, setSelectedMembers] = useState<ProjectMemberWithProfile[]>([]);

  const availableUserOptions = useMemo(() => {
    const memberIds = new Set(members.map((m) => m.userId));
    return approvedUsers
      .filter((u) => !memberIds.has(u.id))
      .map((u) => ({ label: u.fullName ?? u.email, value: u.id }));
  }, [approvedUsers, members]);

  function openAddMemberDialog() {
    setMemberUserId(null);
    setMemberRole('member');
    setMemberError(null);
    setMemberDialogOpen(true);
  }

  async function handleAddMember() {
    if (!id) return;
    setMemberError(null);
    if (!memberUserId) {
      setMemberError('Pilih user terlebih dahulu');
      return;
    }
    try {
      await projectMemberService.add(id, memberUserId, memberRole);
      setMemberDialogOpen(false);
      await loadAll(false);
      toast.current?.show({ severity: 'success', summary: 'Anggota ditambahkan' });
    } catch (err) {
      setMemberError(err instanceof Error ? err.message : 'Gagal menambahkan anggota');
    }
  }

  async function handleChangeMemberRole(row: ProjectMemberWithProfile, role: ProjectMemberRole) {
    await projectMemberService.changeRole(row.id, role);
    setMembers((prev) => prev.map((m) => (m.id === row.id ? { ...m, role } : m)));
  }

  function handleRemoveMember(row: ProjectMemberWithProfile) {
    confirmDialog({
      header: 'Hapus Anggota',
      message: `"${row.profile.fullName ?? row.profile.email}" akan dihapus dari project ini dan kehilangan akses. Lanjutkan?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Hapus',
      rejectLabel: 'Batal',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        await projectMemberService.remove(row.id);
        await loadAll(false);
        toast.current?.show({ severity: 'success', summary: 'Anggota dihapus' });
      },
    });
  }

  function handleBulkRemoveMembers() {
    confirmDialog({
      header: 'Hapus Anggota Terpilih',
      message: `${selectedMembers.length} anggota akan dihapus dari project ini. Lanjutkan?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Hapus',
      rejectLabel: 'Batal',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        await Promise.all(selectedMembers.map((m) => projectMemberService.remove(m.id)));
        setSelectedMembers([]);
        await loadAll(false);
        toast.current?.show({ severity: 'success', summary: 'Anggota terpilih dihapus' });
      },
    });
  }

  function handleArchiveProject() {
    if (!project) return;
    confirmDialog({
      header: 'Arsipkan Project',
      message: `Project "${project.name}" akan diarsipkan. Lanjutkan?`,
      icon: 'pi pi-info-circle',
      acceptLabel: 'Arsipkan',
      rejectLabel: 'Batal',
      accept: async () => {
        await projectService.changeStatus(project.id, 'archived');
        setProject({ ...project, status: 'archived' });
        toast.current?.show({ severity: 'success', summary: 'Project diarsipkan' });
      },
    });
  }

  function handleDeletePermanently() {
    if (!project) return;
    confirmDialog({
      header: 'Hapus Permanen',
      message: (
        <span>
          Project <strong>"{project.name}"</strong> beserta seluruh test plan dan test case di dalamnya akan{' '}
          <strong>dihapus permanen dan tidak bisa dikembalikan</strong>. Lanjutkan?
        </span>
      ),
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Hapus Permanen',
      rejectLabel: 'Batal',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        await projectService.deletePermanently(project.id);
        toast.current?.show({ severity: 'success', summary: 'Project dihapus permanen' });
        navigate('/');
      },
    });
  }

  if (loading || roleLoading) return <p>Memuat...</p>;
  if (!canManageSettings) return <Navigate to={`/projects/${id}`} replace />;
  if (!project) return <p>Project tidak ditemukan.</p>;

  return (
    <div>
      <Toast ref={toast} />
      <ConfirmDialog />

      <Breadcrumb
        items={[
          { label: 'Projects', path: '/' },
          { label: project.name, path: `/projects/${id}` },
          { label: 'Pengaturan' },
        ]}
      />

      <Card className="mb-3">
        <div className="flex align-items-center gap-2">
          <Button icon="pi pi-arrow-left" text rounded aria-label="Kembali" onClick={() => navigate(`/projects/${id}`)} />
          <h2 className="m-0">Pengaturan Project — {project.name}</h2>
        </div>
      </Card>

      <Card>
        <TabView>
          <TabPanel header="Modules">
            <div className="flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
              <IconField iconPosition="left">
                <InputIcon className="pi pi-search" />
                <InputText value={moduleSearch} onChange={(e) => setModuleSearch(e.target.value)} placeholder="Cari nama/kode..." />
              </IconField>
              <Button label="Module Baru" icon="pi pi-plus" size="small" onClick={openCreateModuleDialog} />
            </div>
            <BulkActionsBar
              selectedCount={selectedModules.length}
              onClear={() => setSelectedModules([])}
              actions={<Button label="Hapus Terpilih" icon="pi pi-trash" size="small" severity="danger" outlined onClick={handleBulkDeleteModules} />}
            />
            <DataTable
              value={filteredModules}
              size="small"
              emptyMessage="Belum ada module"
              paginator
              rows={5}
              sortField={moduleSortField}
              sortOrder={moduleSortOrder}
              onSort={(e) => {
                setModuleSortField(e.sortField);
                setModuleSortOrder((e.sortOrder ?? 1) as 1 | -1);
              }}
              selection={selectedModules}
              onSelectionChange={(e) => setSelectedModules(e.value as Module[])}
              dataKey="id"
              selectionMode="checkbox"
            >
              <Column selectionMode="multiple" style={{ width: '3rem' }} />
              <Column field="code" header="Kode" sortable style={{ width: '7rem' }} />
              <Column field="name" header="Nama" sortable />
              <Column
                header=""
                style={{ width: '3.5rem' }}
                body={(row: Module) => (
                  <RowActionsMenu
                    items={[
                      { label: 'Edit', icon: 'pi pi-pencil', command: () => openEditModuleDialog(row) },
                      { label: 'Hapus', icon: 'pi pi-trash', className: 'p-error', command: () => handleDeleteModule(row) },
                    ]}
                  />
                )}
              />
            </DataTable>
          </TabPanel>

          <TabPanel header="Tags">
            <p className="text-color-secondary text-sm mb-3">
              Tag juga otomatis dibuat saat diketik di form Test Case. Kelola tag di sini.
            </p>
            <div className="flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
              <IconField iconPosition="left">
                <InputIcon className="pi pi-search" />
                <InputText value={tagSearch} onChange={(e) => setTagSearch(e.target.value)} placeholder="Cari nama..." />
              </IconField>
              <Button label="Tag Baru" icon="pi pi-plus" size="small" onClick={openCreateTagDialog} />
            </div>
            <BulkActionsBar
              selectedCount={selectedTags.length}
              onClear={() => setSelectedTags([])}
              actions={<Button label="Hapus Terpilih" icon="pi pi-trash" size="small" severity="danger" outlined onClick={handleBulkDeleteTags} />}
            />
            <DataTable
              value={filteredTags}
              size="small"
              emptyMessage="Belum ada tag"
              paginator
              rows={5}
              sortField={tagSortField}
              sortOrder={tagSortOrder}
              onSort={(e) => {
                setTagSortField(e.sortField);
                setTagSortOrder((e.sortOrder ?? 1) as 1 | -1);
              }}
              selection={selectedTags}
              onSelectionChange={(e) => setSelectedTags(e.value as TagEntity[])}
              dataKey="id"
              selectionMode="checkbox"
            >
              <Column selectionMode="multiple" style={{ width: '3rem' }} />
              <Column field="name" header="Nama" sortable />
              <Column
                header=""
                style={{ width: '3.5rem' }}
                body={(row: TagEntity) => (
                  <RowActionsMenu
                    items={[
                      { label: 'Edit', icon: 'pi pi-pencil', command: () => openEditTagDialog(row) },
                      { label: 'Hapus', icon: 'pi pi-trash', className: 'p-error', command: () => handleDeleteTag(row) },
                    ]}
                  />
                )}
              />
            </DataTable>
          </TabPanel>

          <TabPanel header="Role Pengujian">
            <p className="text-color-secondary text-sm mb-3">
              Role di dalam aplikasi yang diuji (mis. Admin, Manager, Member) — berbeda dari peran anggota project di tab "Anggota Project".
              Dipakai sebagai "Role Target" saat membuat test case.
            </p>
            <div className="flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
              <IconField iconPosition="left">
                <InputIcon className="pi pi-search" />
                <InputText value={testRoleSearch} onChange={(e) => setTestRoleSearch(e.target.value)} placeholder="Cari nama..." />
              </IconField>
              <Button label="Role Baru" icon="pi pi-plus" size="small" onClick={openCreateTestRoleDialog} />
            </div>
            <BulkActionsBar
              selectedCount={selectedTestRoles.length}
              onClear={() => setSelectedTestRoles([])}
              actions={<Button label="Hapus Terpilih" icon="pi pi-trash" size="small" severity="danger" outlined onClick={handleBulkDeleteTestRoles} />}
            />
            <DataTable
              value={filteredTestRoles}
              size="small"
              emptyMessage="Belum ada role"
              paginator
              rows={5}
              sortField={testRoleSortField}
              sortOrder={testRoleSortOrder}
              onSort={(e) => {
                setTestRoleSortField(e.sortField);
                setTestRoleSortOrder((e.sortOrder ?? 1) as 1 | -1);
              }}
              selection={selectedTestRoles}
              onSelectionChange={(e) => setSelectedTestRoles(e.value as TestRole[])}
              dataKey="id"
              selectionMode="checkbox"
            >
              <Column selectionMode="multiple" style={{ width: '3rem' }} />
              <Column field="name" header="Nama" sortable />
              <Column
                header=""
                style={{ width: '3.5rem' }}
                body={(row: TestRole) => (
                  <RowActionsMenu
                    items={[
                      { label: 'Edit', icon: 'pi pi-pencil', command: () => openEditTestRoleDialog(row) },
                      { label: 'Hapus', icon: 'pi pi-trash', className: 'p-error', command: () => handleDeleteTestRole(row) },
                    ]}
                  />
                )}
              />
            </DataTable>
          </TabPanel>

          <TabPanel header="Anggota Project">
            <p className="text-color-secondary text-sm mb-3">
              Hanya user yang terdaftar di sini (atau admin) yang bisa mengakses project ini. Manager bisa mengelola anggota lain.
            </p>
            <div className="flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
              <span />
              <Button label="Tambah Anggota" icon="pi pi-plus" size="small" onClick={openAddMemberDialog} />
            </div>
            <BulkActionsBar
              selectedCount={selectedMembers.length}
              onClear={() => setSelectedMembers([])}
              actions={<Button label="Hapus Terpilih" icon="pi pi-trash" size="small" severity="danger" outlined onClick={handleBulkRemoveMembers} />}
            />
            <DataTable
              value={members}
              size="small"
              emptyMessage="Belum ada anggota"
              paginator
              rows={5}
              selection={selectedMembers}
              onSelectionChange={(e) => setSelectedMembers(e.value as ProjectMemberWithProfile[])}
              dataKey="id"
              selectionMode="checkbox"
            >
              <Column selectionMode="multiple" style={{ width: '3rem' }} />
              <Column header="Nama" body={(row: ProjectMemberWithProfile) => row.profile.fullName ?? '-'} />
              <Column header="Email" body={(row: ProjectMemberWithProfile) => row.profile.email} />
              <Column
                header="Peran"
                body={(row: ProjectMemberWithProfile) => (
                  <Dropdown
                    value={row.role}
                    options={MEMBER_ROLE_OPTIONS}
                    onChange={(e) => handleChangeMemberRole(row, e.value)}
                    className="w-10rem"
                  />
                )}
              />
              <Column
                header=""
                style={{ width: '3.5rem' }}
                body={(row: ProjectMemberWithProfile) => (
                  <RowActionsMenu
                    items={[{ label: 'Hapus', icon: 'pi pi-trash', className: 'p-error', command: () => handleRemoveMember(row) }]}
                  />
                )}
              />
            </DataTable>
          </TabPanel>

          {(canArchiveProject || canDeleteProject) && (
            <TabPanel header="Danger Zone">
              <div className="flex flex-column gap-3" style={{ maxWidth: '40rem' }}>
                {canArchiveProject && project.status !== 'archived' && (
                  <div
                    className="flex align-items-center justify-content-between gap-4 p-3 border-round-md"
                    style={{ border: '1px solid var(--surface-200)', backgroundColor: 'var(--surface-50)' }}
                  >
                    <div>
                      <div className="font-medium text-color">Arsipkan Project</div>
                      <div className="text-color-secondary text-sm mt-1">
                        Project ini status: <Tag value={PROJECT_STATUS_LABEL[project.status]} severity={PROJECT_STATUS_SEVERITY[project.status]} />.
                        Project yang diarsipkan tidak muncul di daftar aktif.
                      </div>
                    </div>
                    <Button
                      label="Arsipkan"
                      icon="pi pi-inbox"
                      severity="warning"
                      outlined
                      className="flex-shrink-0 white-space-nowrap"
                      onClick={handleArchiveProject}
                    />
                  </div>
                )}
                {canDeleteProject && (
                  <div
                    className="flex align-items-center justify-content-between gap-4 p-3 border-round-md"
                    style={{ border: '1px solid var(--surface-200)', backgroundColor: 'var(--surface-50)' }}
                  >
                    <div>
                      <div className="font-medium text-color">Hapus Permanen</div>
                      <div className="text-color-secondary text-sm mt-1">
                        Menghapus project beserta seluruh test plan dan test case. Tindakan ini tidak bisa dibatalkan.
                      </div>
                    </div>
                    <Button
                      label="Hapus Permanen"
                      icon="pi pi-trash"
                      severity="danger"
                      outlined
                      className="flex-shrink-0 white-space-nowrap"
                      onClick={handleDeletePermanently}
                    />
                  </div>
                )}
              </div>
            </TabPanel>
          )}
        </TabView>
      </Card>

      {/* --- Module Dialog --- */}
      <Dialog
        header={editingModuleId ? 'Edit Module' : 'Module Baru'}
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
        header={editingTagId ? 'Edit Tag' : 'Tag Baru'}
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
              value={tagName}
              onChange={(e) => setTagName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveTag();
              }}
            />
          </div>
          <Button label="Simpan" size="small" onClick={handleSaveTag} />
        </div>
      </Dialog>

      {/* --- Test Role Dialog --- */}
      <Dialog
        header={editingTestRoleId ? 'Edit Role' : 'Role Baru'}
        visible={testRoleDialogOpen}
        onHide={() => setTestRoleDialogOpen(false)}
        onShow={() => testRoleNameRef.current?.focus()}
        style={{ width: '25rem' }}
      >
        <div className="flex flex-column gap-3">
          {testRoleError && <small className="p-error">{testRoleError}</small>}
          <div className="flex flex-column gap-1">
            <label htmlFor="test-role-name">Nama Role</label>
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
          <Button label="Simpan" size="small" onClick={handleSaveTestRole} />
        </div>
      </Dialog>

      {/* --- Member Dialog --- */}
      <Dialog
        header="Tambah Anggota"
        visible={memberDialogOpen}
        onHide={() => setMemberDialogOpen(false)}
        style={{ width: '25rem' }}
      >
        <div className="flex flex-column gap-3">
          {memberError && <small className="p-error">{memberError}</small>}
          <div className="flex flex-column gap-1">
            <label htmlFor="member-user">User</label>
            <Dropdown
              id="member-user"
              value={memberUserId}
              options={availableUserOptions}
              onChange={(e) => setMemberUserId(e.value)}
              filter
              placeholder="Pilih user"
              className="w-full"
            />
          </div>
          <div className="flex flex-column gap-1">
            <label htmlFor="member-role">Peran</label>
            <Dropdown
              id="member-role"
              value={memberRole}
              options={MEMBER_ROLE_OPTIONS}
              onChange={(e) => setMemberRole(e.value)}
              className="w-full"
            />
          </div>
          <Button label="Tambah" size="small" onClick={handleAddMember} />
        </div>
      </Dialog>
    </div>
  );
}
