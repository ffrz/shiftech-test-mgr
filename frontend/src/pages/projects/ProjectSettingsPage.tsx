import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { RowActionsMenu } from '../../components/ui/RowActionsMenu';
import SearchInput from '../../components/ui/SearchInput';
import { BulkActionsBar } from '../../components/ui/BulkActionsBar';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import { projectService } from '../../services/projectService';
import { moduleService } from '../../services/moduleService';
import { tagService } from '../../services/tagService';
import { testRoleService } from '../../services/testRoleService';
import { projectMemberService } from '../../services/projectMemberService';
import { useAuthContext } from '../../hooks/useAuth';
import { useProjectRole } from '../../hooks/useProjectRole';
import { useScreenSize } from '../../hooks/useScreenSize';
import { UsernamePicker } from '../../components/ui/UsernamePicker';
import type { Project, Module, Tag as TagEntity, TestRole, Profile, ProjectMemberWithProfile, ProjectMemberRole } from '../../types/domain';
import { PROJECT_MEMBER_ROLE_LABEL, PROJECT_MEMBER_STATUS_LABEL, PROJECT_MEMBER_STATUS_SEVERITY } from '../../helpers/statusLabels';
import { Tag } from 'primereact/tag';
import { PROJECT_STATUS_LABEL, PROJECT_STATUS_SEVERITY } from '../../helpers/statusLabels';
import { CreateProjectDialog } from './components/CreateProjectDialog';

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
  const { user: currentUser } = useAuthContext();
  const { loading: roleLoading, canManageSettings, canArchiveProject, canDeleteProject } = useProjectRole(id);
  const { lt } = useScreenSize();
  const isMobile = lt.sm;

  const [project, setProject] = useState<Project | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [tags, setTags] = useState<TagEntity[]>([]);
  const [testRoles, setTestRoles] = useState<TestRole[]>([]);
  const [members, setMembers] = useState<ProjectMemberWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  async function loadAll(showLoading = true) {
    if (!id) return;
    if (showLoading) setLoading(true);
    const [projectResult, modulesResult, tagsResult, testRolesResult, membersResult] = await Promise.all([
      projectService.getById(id),
      moduleService.listByProject(id),
      tagService.listByProject(id),
      testRoleService.listByProject(id),
      projectMemberService.listByProject(id),
    ]);
    setProject(projectResult);
    setModules(modulesResult);
    setTags(tagsResult);
    setTestRoles(testRolesResult);
    setMembers(membersResult);
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
      toast.current?.show({ severity: 'success', summary: editingModuleId ? 'Module updated' : 'Module created' });
    } catch (err) {
      setModuleError(err instanceof Error ? err.message : 'Failed to save module');
    }
  }

  function handleDeleteModule(row: Module) {
    confirmDialog({
      header: 'Delete Module',
      message: `Module "${row.name}" will be deleted. Test cases using this module will become unassigned. Continue?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        await moduleService.remove(row.id);
        await loadAll(false);
        toast.current?.show({ severity: 'success', summary: 'Module deleted' });
      },
    });
  }

  function handleBulkDeleteModules() {
    confirmDialog({
      header: 'Delete Selected Modules',
      message: `${selectedModules.length} module will be deleted. Test cases using this module will become unassigned. Continue?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        await Promise.all(selectedModules.map((m) => moduleService.remove(m.id)));
        setSelectedModules([]);
        await loadAll(false);
        toast.current?.show({ severity: 'success', summary: 'Selected modules deleted' });
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
      toast.current?.show({ severity: 'success', summary: editingTagId ? 'Tag updated' : 'Tag created' });
    } catch (err) {
      setTagError(err instanceof Error ? err.message : 'Failed to save tag');
    }
  }

  function handleDeleteTag(row: TagEntity) {
    confirmDialog({
      header: 'Delete Tag',
      message: `Tag "${row.name}" will be deleted and unlinked from all test cases using it. Continue?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        await tagService.remove(row.id);
        await loadAll(false);
        toast.current?.show({ severity: 'success', summary: 'Tag deleted' });
      },
    });
  }

  function handleBulkDeleteTags() {
    confirmDialog({
      header: 'Delete Selected Tags',
      message: `${selectedTags.length} tag will be deleted and unlinked from all test cases using it. Continue?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        await Promise.all(selectedTags.map((t) => tagService.remove(t.id)));
        setSelectedTags([]);
        await loadAll(false);
        toast.current?.show({ severity: 'success', summary: 'Selected tags deleted' });
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
      toast.current?.show({ severity: 'success', summary: editingTestRoleId ? 'Role updated' : 'Role created' });
    } catch (err) {
      setTestRoleError(err instanceof Error ? err.message : 'Failed to save role');
    }
  }

  function handleDeleteTestRole(row: TestRole) {
    confirmDialog({
      header: 'Delete Role',
      message: `Role "${row.name}" will be deleted. Test cases using this role will become unassigned. Continue?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        await testRoleService.remove(row.id);
        await loadAll(false);
        toast.current?.show({ severity: 'success', summary: 'Role deleted' });
      },
    });
  }

  function handleBulkDeleteTestRoles() {
    confirmDialog({
      header: 'Delete Selected Roles',
      message: `${selectedTestRoles.length} role will be deleted. Test cases using this role will become unassigned. Continue?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        await Promise.all(selectedTestRoles.map((r) => testRoleService.remove(r.id)));
        setSelectedTestRoles([]);
        await loadAll(false);
        toast.current?.show({ severity: 'success', summary: 'Selected roles deleted' });
      },
    });
  }

  // --- Members ---
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [memberProfile, setMemberProfile] = useState<Profile | null>(null);
  const [memberRole, setMemberRole] = useState<ProjectMemberRole>('member');
  const [memberError, setMemberError] = useState<string | null>(null);
  const [selectedMembers, setSelectedMembers] = useState<ProjectMemberWithProfile[]>([]);

  const existingMemberIds = useMemo(() => members.map((m) => m.userId), [members]);

  function openAddMemberDialog() {
    setMemberProfile(null);
    setMemberRole('member');
    setMemberError(null);
    setMemberDialogOpen(true);
  }

  async function handleAddMember() {
    if (!id || !currentUser) return;
    setMemberError(null);
    if (!memberProfile) {
      setMemberError('Search for and select a user first');
      return;
    }
    try {
      await projectMemberService.invite(id, memberProfile.id, currentUser.id, memberRole);
      setMemberDialogOpen(false);
      await loadAll(false);
      toast.current?.show({ severity: 'success', summary: 'Invitation sent' });
    } catch (err) {
      setMemberError(err instanceof Error ? err.message : 'Failed to invite member');
    }
  }

  async function handleChangeMemberRole(row: ProjectMemberWithProfile, role: ProjectMemberRole) {
    await projectMemberService.changeRole(row.id, role);
    setMembers((prev) => prev.map((m) => (m.id === row.id ? { ...m, role } : m)));
  }

  function handleRemoveMember(row: ProjectMemberWithProfile) {
    confirmDialog({
      header: 'Remove Member',
      message: `"${row.profile.displayName ?? row.profile.username}" will be removed from this project and lose access. Continue?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        await projectMemberService.remove(row.id);
        await loadAll(false);
        toast.current?.show({ severity: 'success', summary: 'Member removed' });
      },
    });
  }

  function handleBulkRemoveMembers() {
    confirmDialog({
      header: 'Remove Selected Members',
      message: `${selectedMembers.length} members will be removed from this project. Continue?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        await Promise.all(selectedMembers.map((m) => projectMemberService.remove(m.id)));
        setSelectedMembers([]);
        await loadAll(false);
        toast.current?.show({ severity: 'success', summary: 'Selected members removed' });
      },
    });
  }

  function handleArchiveProject() {
    if (!project) return;
    confirmDialog({
      header: 'Archive Project',
      message: `Project "${project.name}" will be archived. Continue?`,
      icon: 'pi pi-info-circle',
      acceptLabel: 'Archive',
      rejectLabel: 'Cancel',
      accept: async () => {
        await projectService.changeStatus(project.id, 'archived');
        setProject({ ...project, status: 'archived' });
        toast.current?.show({ severity: 'success', summary: 'Project archived' });
      },
    });
  }

  function handleDeletePermanently() {
    if (!project) return;
    confirmDialog({
      header: 'Permanently Delete',
      message: (
        <span>
          Project <strong>"{project.name}"</strong> along with all its test plans and test cases will be{' '}
          <strong>permanently deleted and cannot be recovered</strong>. Continue?
        </span>
      ),
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Permanently Delete',
      rejectLabel: 'Cancel',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        await projectService.deletePermanently(project.id);
        toast.current?.show({ severity: 'success', summary: 'Project permanently deleted' });
        navigate('/projects');
      },
    });
  }

  const modulesMobileBody = useCallback((row: Module) => (
    <div className="flex flex-column gap-2 py-1">
      <div className="font-medium">{row.name}</div>
      <div className="text-sm text-color-secondary">Code: {row.code}</div>
    </div>
  ), []);

  const tagsMobileBody = useCallback((row: TagEntity) => (
    <div className="flex flex-column gap-2 py-1">
      <div className="font-medium">{row.name}</div>
    </div>
  ), []);

  const testRolesMobileBody = useCallback((row: TestRole) => (
    <div className="flex flex-column gap-2 py-1">
      <div className="font-medium">{row.name}</div>
    </div>
  ), []);

  const membersMobileBody = useCallback((row: ProjectMemberWithProfile) => (
    <div className="flex flex-column gap-2 py-1">
      <div className="font-medium">{row.profile.displayName ?? '-'}</div>
      <div className="text-sm text-color-secondary">@{row.profile.username}</div>
      <div className="text-sm text-color-secondary">Role: {PROJECT_MEMBER_ROLE_LABEL[row.role]}</div>
      <div className="text-sm text-color-secondary">
        Status: <Tag value={PROJECT_MEMBER_STATUS_LABEL[row.status]} severity={PROJECT_MEMBER_STATUS_SEVERITY[row.status]} />
      </div>
    </div>
  ), []);

  if (loading || roleLoading) return <p>Loading...</p>;
  if (!canManageSettings) return <Navigate to={`/projects/${id}`} replace />;
  if (!project) return <p>Project not found.</p>;

  return (
    <div>
      <Toast ref={toast} />
      <ConfirmDialog />

      <Breadcrumb
        items={[
          { label: 'Projects', path: '/projects' },
          { label: project.name, path: `/projects/${id}` },
          { label: 'Settings' },
        ]}
      />

      <Card className="mb-3">
        <div className="flex align-items-center justify-content-between flex-wrap gap-2">
          <div className="flex align-items-center gap-2">
            <Button icon="pi pi-arrow-left" text rounded aria-label="Back" onClick={() => navigate(`/projects/${id}`)} />
            <div>
              <h2 className="m-0">{project.name}</h2>
              {project.description && <p className="m-0 mt-1 text-color-secondary text-sm">{project.description}</p>}
              <div className="flex gap-2 mt-1">
                <Tag value={PROJECT_STATUS_LABEL[project.status]} severity={PROJECT_STATUS_SEVERITY[project.status]} />
                <Tag value={project.visibility === 'public' ? 'Public' : project.visibility === 'unlisted' ? 'Unlisted' : 'Private'} severity="info" />
              </div>
            </div>
          </div>
          <Button label="Edit" icon="pi pi-pencil" size="small" outlined onClick={() => setEditDialogOpen(true)} />
        </div>
      </Card>

      <Card>
        <TabView>
          <TabPanel header="Modules">
            <div className="flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
              <SearchInput value={moduleSearch} onChange={setModuleSearch} placeholder="Search name/code..." />
              <Button label="New Module" icon="pi pi-plus" size="small" onClick={openCreateModuleDialog} />
            </div>
            <BulkActionsBar
              selectedCount={selectedModules.length}
              onClear={() => setSelectedModules([])}
              actions={<Button label="Delete Selected" icon="pi pi-trash" size="small" severity="danger" outlined onClick={handleBulkDeleteModules} />}
            />
            <DataTable
              value={filteredModules}
              size="small"
              emptyMessage="No modules yet"
              paginator
              paginatorTemplate="CurrentPageReport FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
              currentPageReportTemplate="{totalRecords} records"
              rows={10} rowsPerPageOptions={[5, 10, 25, 50]}
              sortField={moduleSortField}
              sortOrder={moduleSortOrder}
              onSort={(e) => {
                setModuleSortField(e.sortField);
                setModuleSortOrder((e.sortOrder ?? 1) as 1 | -1);
              }}
              selection={selectedModules}
              onSelectionChange={(e: any) => setSelectedModules(e.value as Module[])}
              dataKey="id"
              selectionMode="checkbox"
            >
              {!isMobile && <Column selectionMode="multiple" style={{ width: '3rem' }} />}
              {isMobile
                ? <Column header="Nama" body={modulesMobileBody} />
                : <Column field="code" header="Code" sortable style={{ width: '7rem' }} />
              }
              {!isMobile && <Column field="name" header="Nama" sortable />}
              <Column
                header=""
                style={{ width: '3.5rem' }}
                body={(row: Module) => (
                  <RowActionsMenu
                    items={[
                      { label: 'Edit', icon: 'pi pi-pencil', command: () => openEditModuleDialog(row) },
                      { label: 'Delete', icon: 'pi pi-trash', className: 'p-error', command: () => handleDeleteModule(row) },
                    ]}
                  />
                )}
              />
            </DataTable>
          </TabPanel>

          <TabPanel header="Tags">
            <p className="text-color-secondary text-sm mb-3">
              Tags are also created automatically when typed in the Test Case form. Manage tags here.
            </p>
            <div className="flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
              <SearchInput value={tagSearch} onChange={setTagSearch} placeholder="Search name..." />
              <Button label="New Tag" icon="pi pi-plus" size="small" onClick={openCreateTagDialog} />
            </div>
            <BulkActionsBar
              selectedCount={selectedTags.length}
              onClear={() => setSelectedTags([])}
              actions={<Button label="Delete Selected" icon="pi pi-trash" size="small" severity="danger" outlined onClick={handleBulkDeleteTags} />}
            />
            <DataTable
              value={filteredTags}
              size="small"
              emptyMessage="No tags yet"
              paginator
              paginatorTemplate="CurrentPageReport FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
              currentPageReportTemplate="{totalRecords} records"
              rows={10} rowsPerPageOptions={[5, 10, 25, 50]}
              sortField={tagSortField}
              sortOrder={tagSortOrder}
              onSort={(e) => {
                setTagSortField(e.sortField);
                setTagSortOrder((e.sortOrder ?? 1) as 1 | -1);
              }}
              selection={selectedTags}
              onSelectionChange={(e: any) => setSelectedTags(e.value as TagEntity[])}
              dataKey="id"
              selectionMode="checkbox"
            >
              {!isMobile && <Column selectionMode="multiple" style={{ width: '3rem' }} />}
              {isMobile
                ? <Column header="Nama" body={tagsMobileBody} />
                : <Column field="name" header="Nama" sortable />
              }
              <Column
                header=""
                style={{ width: '3.5rem' }}
                body={(row: TagEntity) => (
                  <RowActionsMenu
                    items={[
                      { label: 'Edit', icon: 'pi pi-pencil', command: () => openEditTagDialog(row) },
                      { label: 'Delete', icon: 'pi pi-trash', className: 'p-error', command: () => handleDeleteTag(row) },
                    ]}
                  />
                )}
              />
            </DataTable>
          </TabPanel>

          <TabPanel header="Test Roles">
            <p className="text-color-secondary text-sm mb-3">
              Roles within the app under test (e.g. Admin, Manager, Member) — different from a member's role on the "Project Members" tab.
              Used as the "Target Role" when creating a test case.
            </p>
            <div className="flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
              <SearchInput value={testRoleSearch} onChange={setTestRoleSearch} placeholder="Search name..." />
              <Button label="Role Baru" icon="pi pi-plus" size="small" onClick={openCreateTestRoleDialog} />
            </div>
            <BulkActionsBar
              selectedCount={selectedTestRoles.length}
              onClear={() => setSelectedTestRoles([])}
              actions={<Button label="Delete Selected" icon="pi pi-trash" size="small" severity="danger" outlined onClick={handleBulkDeleteTestRoles} />}
            />
            <DataTable
              value={filteredTestRoles}
              size="small"
              emptyMessage="No roles yet"
              paginator
              paginatorTemplate="CurrentPageReport FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
              currentPageReportTemplate="{totalRecords} records"
              rows={10} rowsPerPageOptions={[5, 10, 25, 50]}
              sortField={testRoleSortField}
              sortOrder={testRoleSortOrder}
              onSort={(e) => {
                setTestRoleSortField(e.sortField);
                setTestRoleSortOrder((e.sortOrder ?? 1) as 1 | -1);
              }}
              selection={selectedTestRoles}
              onSelectionChange={(e: any) => setSelectedTestRoles(e.value as TestRole[])}
              dataKey="id"
              selectionMode="checkbox"
            >
              {!isMobile && <Column selectionMode="multiple" style={{ width: '3rem' }} />}
              {isMobile
                ? <Column header="Nama" body={testRolesMobileBody} />
                : <Column field="name" header="Nama" sortable />
              }
              <Column
                header=""
                style={{ width: '3.5rem' }}
                body={(row: TestRole) => (
                  <RowActionsMenu
                    items={[
                      { label: 'Edit', icon: 'pi pi-pencil', command: () => openEditTestRoleDialog(row) },
                      { label: 'Delete', icon: 'pi pi-trash', className: 'p-error', command: () => handleDeleteTestRole(row) },
                    ]}
                  />
                )}
              />
            </DataTable>
          </TabPanel>

          <TabPanel header="Project Members">
            <p className="text-color-secondary text-sm mb-3">
              Only accepted members (or the owner) can access this project. Invited users must accept before they gain access. Managers can manage other members.
            </p>
            <div className="flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
              <span />
              <Button label="Invite Member" icon="pi pi-plus" size="small" onClick={openAddMemberDialog} />
            </div>
            <BulkActionsBar
              selectedCount={selectedMembers.length}
              onClear={() => setSelectedMembers([])}
              actions={<Button label="Delete Selected" icon="pi pi-trash" size="small" severity="danger" outlined onClick={handleBulkRemoveMembers} />}
            />
            <DataTable
              value={members}
              size="small"
              emptyMessage="No members yet"
              paginator
              paginatorTemplate="CurrentPageReport FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
              currentPageReportTemplate="{totalRecords} records"
              rows={10} rowsPerPageOptions={[5, 10, 25, 50]}
              selection={selectedMembers}
              onSelectionChange={(e: any) => setSelectedMembers(e.value as ProjectMemberWithProfile[])}
              dataKey="id"
              selectionMode="checkbox"
            >
              {!isMobile && <Column selectionMode="multiple" style={{ width: '3rem' }} />}
              {isMobile && <Column header="Member" body={membersMobileBody} />}
              {!isMobile && <Column header="Name" body={(row: ProjectMemberWithProfile) => row.profile.displayName ?? '-'} />}
              {!isMobile && <Column header="Username" body={(row: ProjectMemberWithProfile) => `@${row.profile.username}`} />}
              {!isMobile && (
                <Column
                  header="Status"
                  body={(row: ProjectMemberWithProfile) => (
                    <Tag value={PROJECT_MEMBER_STATUS_LABEL[row.status]} severity={PROJECT_MEMBER_STATUS_SEVERITY[row.status]} />
                  )}
                />
              )}
              {!isMobile && (
                <Column
                  header="Role"
                  body={(row: ProjectMemberWithProfile) => (
                    <Dropdown
                      value={row.role}
                      options={MEMBER_ROLE_OPTIONS}
                      onChange={(e) => handleChangeMemberRole(row, e.value)}
                      className="w-10rem"
                    />
                  )}
                />
              )}
              <Column
                header=""
                style={{ width: '3.5rem' }}
                body={(row: ProjectMemberWithProfile) => (
                  <RowActionsMenu
                    items={[{ label: 'Delete', icon: 'pi pi-trash', className: 'p-error', command: () => handleRemoveMember(row) }]}
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
                      <div className="font-medium text-color">Archive Project</div>
                      <div className="text-color-secondary text-sm mt-1">
                        Project ini status: <Tag value={PROJECT_STATUS_LABEL[project.status]} severity={PROJECT_STATUS_SEVERITY[project.status]} />.
                        Archived projects do not appear in the active list.
                      </div>
                    </div>
                    <Button
                      label="Archive"
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
                      <div className="font-medium text-color">Permanently Delete</div>
                      <div className="text-color-secondary text-sm mt-1">
                        Deletes the project along with all its test plans and test cases. This action cannot be undone.
                      </div>
                    </div>
                    <Button
                      label="Permanently Delete"
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
        header={editingModuleId ? 'Edit Module' : 'Add Module'}
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
          <Button label="Save" size="small" onClick={handleSaveTag} />
        </div>
      </Dialog>

      {/* --- Test Role Dialog --- */}
      <Dialog
        header={editingTestRoleId ? 'Edit Role' : 'Add Test Role'}
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

      {/* --- Member Dialog --- */}
      <Dialog
        header="Invite Member"
        visible={memberDialogOpen}
        onHide={() => setMemberDialogOpen(false)}
        style={{ width: '25rem' }}
      >
        <div className="flex flex-column gap-3">
          {memberError && <small className="p-error">{memberError}</small>}
          <div className="flex flex-column gap-1">
            <label htmlFor="member-user">Username</label>
            <UsernamePicker value={memberProfile} onChange={setMemberProfile} excludeIds={existingMemberIds} />
          </div>
          <div className="flex flex-column gap-1">
            <label htmlFor="member-role">Role</label>
            <Dropdown
              id="member-role"
              value={memberRole}
              options={MEMBER_ROLE_OPTIONS}
              onChange={(e) => setMemberRole(e.value)}
              className="w-full"
            />
          </div>
          <Button label="Send Invite" size="small" onClick={handleAddMember} />
        </div>
      </Dialog>

      <CreateProjectDialog
        visible={editDialogOpen}
        editingProject={project}
        onHide={() => setEditDialogOpen(false)}
        onSaved={() => {
          setEditDialogOpen(false);
          loadAll(false);
          toast.current?.show({ severity: 'success', summary: 'Project updated' });
        }}
      />
    </div>
  );
}
