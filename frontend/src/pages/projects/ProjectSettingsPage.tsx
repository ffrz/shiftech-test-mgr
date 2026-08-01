import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { TabView, TabPanel } from 'primereact/tabview';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import { projectService } from '../../services/projectService';
import { moduleService } from '../../services/moduleService';
import { tagService } from '../../services/tagService';
import { testRoleService } from '../../services/testRoleService';
import { projectMemberService } from '../../services/projectMemberService';
import { supabase } from '../../config/supabaseClient';
import { useAuthContext } from '../../hooks/useAuth';
import { useProjectRole } from '../../hooks/useProjectRole';
import { useScreenSize } from '../../hooks/useScreenSize';
import { useTabQueryParam } from '../../hooks/useTabQueryParam';
import type { Project, Module, Tag as TagEntity, TestRole, Profile, ProjectMemberWithProfile, ProjectMemberRole, ProjectMemberStatus, ProjectVisibility } from '../../types/domain';
import { CreateProjectDialog } from './components/CreateProjectDialog';
import { ModulesTab } from './components/tabs/ModulesTab';
import { ProjectSettingsPageSkeleton } from './components/ProjectSettingsPageSkeleton';
import { TagsTab } from './components/tabs/TagsTab';
import { TestRolesTab } from './components/tabs/TestRolesTab';
import { MembersTab } from './components/tabs/MembersTab';
import { DangerZoneTab } from './components/tabs/DangerZoneTab';
import { ModuleDialog } from './components/dialogs/ModuleDialog';
import { TagDialog } from './components/dialogs/TagDialog';
import { TestRoleDialog } from './components/dialogs/TestRoleDialog';
import { InviteMemberDialog } from './components/dialogs/InviteMemberDialog';
import { PROJECT_MEMBER_ROLE_LABEL } from '../../helpers/statusLabels';
import { toastHelper } from '../../helpers/toast';

export function ProjectSettingsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuthContext();
  const { loading: roleLoading, canManageSettings, canArchiveProject, canDeleteProject } = useProjectRole(id);
  const { lt } = useScreenSize();
  const isMobile = lt.sm;
  const [project, setProject] = useState<Project | null>(null);
  // Member management + Danger Zone are owner-only (see useProjectRole: managers can still
  // open Settings for Modules/Tags/Test Roles, but not manage users or project lifecycle).
  const isOwner = !!currentUser && !!project && project.ownerId === currentUser.id;
  // Members/Danger Zone are conditional, so the tab-name list must match the rendered panel order.
  const settingsTabNames = [
    'modules',
    'tags',
    'testRoles',
    ...(isOwner ? ['members', 'dangerZone'] : []),
  ] as const;
  const [activeTabIndex, setActiveTabIndex] = useTabQueryParam(settingsTabNames, 0);

  const [modules, setModules] = useState<Module[]>([]);
  const [tags, setTags] = useState<TagEntity[]>([]);
  const [testRoles, setTestRoles] = useState<TestRole[]>([]);
  const [members, setMembers] = useState<ProjectMemberWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [projectVisibility, setProjectVisibility] = useState<ProjectVisibility>('private');

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
    if (projectResult) setProjectVisibility(projectResult.visibility);
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

  // Member list here is plain useState, not React Query, so it doesn't pick up
  // useRealtimeSync's cache invalidation -- a member accepting/declining/being removed
  // happens from a different browser session (theirs), so this page needs its own realtime
  // subscription to reflect that without a manual refresh.
  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`project-settings-members-${id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'project_members', filter: `project_id=eq.${id}` },
        () => loadAll(false),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // --- Module dialog ---
  const [moduleDialogOpen, setModuleDialogOpen] = useState(false);
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [moduleCode, setModuleCode] = useState('');
  const [moduleName, setModuleName] = useState('');
  const [moduleError, setModuleError] = useState<string | null>(null);

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
      toastHelper.success(editingModuleId ? 'Module updated' : 'Module created');
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
        toastHelper.success('Module deleted');
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
        toastHelper.success('Selected modules deleted');
      },
    });
  }

  // --- Tag dialog ---
  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [tagName, setTagName] = useState('');
  const [tagError, setTagError] = useState<string | null>(null);

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
      toastHelper.success(editingTagId ? 'Tag updated' : 'Tag created');
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
        toastHelper.success('Tag deleted');
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
        toastHelper.success('Selected tags deleted');
      },
    });
  }

  // --- Test Role dialog ---
  const [testRoleDialogOpen, setTestRoleDialogOpen] = useState(false);
  const [editingTestRoleId, setEditingTestRoleId] = useState<string | null>(null);
  const [testRoleName, setTestRoleName] = useState('');
  const [testRoleError, setTestRoleError] = useState<string | null>(null);

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
      toastHelper.success(editingTestRoleId ? 'Role updated' : 'Role created');
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
        toastHelper.success('Role deleted');
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
        toastHelper.success('Selected roles deleted');
      },
    });
  }

  // --- Members ---
  const [memberSearch, setMemberSearch] = useState('');
  const [memberRoleFilter, setMemberRoleFilter] = useState<ProjectMemberRole | ''>('');
  const [memberStatusFilter, setMemberStatusFilter] = useState<ProjectMemberStatus | ''>('');
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [memberProfile, setMemberProfile] = useState<Profile | null>(null);
  const [memberRole, setMemberRole] = useState<ProjectMemberRole>('member');
  const [memberError, setMemberError] = useState<string | null>(null);
  const [selectedMembers, setSelectedMembers] = useState<ProjectMemberWithProfile[]>([]);

  const filteredMembers = useMemo(() => {
    const q = memberSearch.trim().toLowerCase();
    return members.filter((m) => {
      if (memberRoleFilter && m.role !== memberRoleFilter) return false;
      if (memberStatusFilter && m.status !== memberStatusFilter) return false;
      if (q) {
        const name = (m.profile?.displayName ?? '').toLowerCase();
        const username = (m.profile?.username ?? '').toLowerCase();
        const email = m.email.toLowerCase();
        if (!name.includes(q) && !username.includes(q) && !email.includes(q)) return false;
      }
      return true;
    });
  }, [members, memberSearch, memberRoleFilter, memberStatusFilter]);

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
      toastHelper.success('Invitation sent');
    } catch (err) {
      setMemberError(err instanceof Error ? err.message : 'Failed to invite member');
    }
  }

  async function handleChangeMemberRole(row: ProjectMemberWithProfile, role: ProjectMemberRole) {
    try {
      await projectMemberService.changeRole(row.id, role);
      setMembers((prev) => prev.map((m) => (m.id === row.id ? { ...m, role } : m)));
      const memberName = row.profile?.displayName ?? row.profile?.username ?? row.email;
      toastHelper.success('Role updated', `${memberName} is now ${PROJECT_MEMBER_ROLE_LABEL[role]}`);
    } catch (err) {
      toastHelper.errorFromCatch('Failed to update role', err);
    }
  }

  function handleRemoveMember(row: ProjectMemberWithProfile) {
    if (!id) return;
    confirmDialog({
      header: 'Remove Member',
      message: `"${row.profile?.displayName ?? row.profile?.username ?? row.email}" will be removed from this project and lose access. Continue?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        await projectMemberService.remove(row.id, id, row.userId);
        await loadAll(false);
        toastHelper.success('Member removed');
      },
    });
  }

  async function handleReinviteMember(row: ProjectMemberWithProfile) {
    if (!id || !currentUser) return;
    await projectMemberService.reinvite(row.id, id, row.userId, row.role, currentUser.id);
    await loadAll(false);
    toastHelper.success('Invitation re-sent');
  }

  function handleBulkRemoveMembers() {
    if (!id) return;
    confirmDialog({
      header: 'Remove Selected Members',
      message: `${selectedMembers.length} members will be removed from this project. Continue?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        await Promise.all(selectedMembers.map((m) => projectMemberService.remove(m.id, id, m.userId)));
        setSelectedMembers([]);
        await loadAll(false);
        toastHelper.success('Selected members removed');
      },
    });
  }

  async function handleChangeVisibility(value: ProjectVisibility) {
    if (!project) return;
    setProjectVisibility(value);
    await projectService.update(project.id, { name: project.name, visibility: value });
    setProject({ ...project, visibility: value });
    toastHelper.success('Visibility updated');
  }

  async function handleToggleActive() {
    if (!project) return;
    const newStatus = project.status === 'active' ? 'inactive' : 'active';
    await projectService.changeStatus(project.id, newStatus, currentUser ? { actorId: currentUser.id } : undefined);
    setProject({ ...project, status: newStatus });
    toastHelper.success(`Project ${newStatus === 'active' ? 'activated' : 'deactivated'}`);
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
        await projectService.changeStatus(project.id, 'archived', currentUser ? { actorId: currentUser.id } : undefined);
        setProject({ ...project, status: 'archived' });
        toastHelper.success('Project archived');
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
        toastHelper.success('Project permanently deleted');
        queryClient.invalidateQueries({ queryKey: ['projects-paginated'] });
        navigate('/projects');
      },
    });
  }

  if (loading || roleLoading) return <ProjectSettingsPageSkeleton />;
  if (!canManageSettings) return <Navigate to={`/projects/${id}`} replace />;
  if (!project) return <p>Project not found.</p>;

  return (
    <div>
      <ConfirmDialog />

      <Breadcrumb
        items={[
          { label: 'Projects', path: '/projects' },
          { label: project.name, path: `/projects/${id}` },
          { label: 'Settings' },
        ]}
      />

      <Card className="mb-3">
        <div className="flex align-items-start justify-content-between gap-2">
          <div className="flex align-items-start gap-2 min-w-0">
            <div className="header-actions">
              <Button icon="pi pi-arrow-left" text rounded aria-label="Back" severity="secondary" onClick={() => navigate(`/projects/${id}`)} />
            </div>
            <div className="min-w-0">
              <h2 className="m-0 text-overflow-ellipsis overflow-hidden white-space-nowrap">Settings - {project.name}</h2>
              {project.description && <p className="m-0 mt-1 text-color-secondary text-sm">{project.description}</p>}
              {/* <div className="flex gap-2 mt-1 flex-wrap">
                <Tag value={PROJECT_STATUS_LABEL[project.status]} severity={PROJECT_STATUS_SEVERITY[project.status]} />
                <Tag value={project.visibility === 'public' ? 'Public' : project.visibility === 'unlisted' ? 'Unlisted' : 'Private'} severity="info" />
              </div> */}
            </div>
          </div>
          <div className="flex-shrink-0 header-actions">
            {isOwner && <Button rounded icon="pi pi-pencil" size="small" text severity="secondary" onClick={() => setEditDialogOpen(true)} />}
          </div>
        </div>
      </Card>

      <Card>
        <TabView activeIndex={activeTabIndex} onTabChange={(e) => setActiveTabIndex(e.index)}>
          <TabPanel header="Modules">
            <ModulesTab
              modules={filteredModules}
              isMobile={isMobile}
              search={moduleSearch}
              onSearchChange={setModuleSearch}
              sortField={moduleSortField}
              sortOrder={moduleSortOrder}
              onSort={(e) => {
                setModuleSortField(e.sortField);
                setModuleSortOrder((e.sortOrder ?? 1) as 1 | -1);
              }}
              selected={selectedModules}
              onSelectedChange={setSelectedModules}
              onCreate={openCreateModuleDialog}
              onEdit={openEditModuleDialog}
              onDelete={handleDeleteModule}
              onBulkDelete={handleBulkDeleteModules}
            />
          </TabPanel>

          <TabPanel header="Tags">
            <TagsTab
              tags={filteredTags}
              isMobile={isMobile}
              search={tagSearch}
              onSearchChange={setTagSearch}
              sortField={tagSortField}
              sortOrder={tagSortOrder}
              onSort={(e) => {
                setTagSortField(e.sortField);
                setTagSortOrder((e.sortOrder ?? 1) as 1 | -1);
              }}
              selected={selectedTags}
              onSelectedChange={setSelectedTags}
              onCreate={openCreateTagDialog}
              onEdit={openEditTagDialog}
              onDelete={handleDeleteTag}
              onBulkDelete={handleBulkDeleteTags}
            />
          </TabPanel>

          <TabPanel header="Test Roles">
            <TestRolesTab
              testRoles={filteredTestRoles}
              isMobile={isMobile}
              search={testRoleSearch}
              onSearchChange={setTestRoleSearch}
              sortField={testRoleSortField}
              sortOrder={testRoleSortOrder}
              onSort={(e) => {
                setTestRoleSortField(e.sortField);
                setTestRoleSortOrder((e.sortOrder ?? 1) as 1 | -1);
              }}
              selected={selectedTestRoles}
              onSelectedChange={setSelectedTestRoles}
              onCreate={openCreateTestRoleDialog}
              onEdit={openEditTestRoleDialog}
              onDelete={handleDeleteTestRole}
              onBulkDelete={handleBulkDeleteTestRoles}
            />
          </TabPanel>

          {isOwner && (
            <TabPanel header="Project Members">
              <MembersTab
                members={filteredMembers}
                isMobile={isMobile}
                ownerId={project?.ownerId ?? ''}
                search={memberSearch}
                onSearchChange={setMemberSearch}
                roleFilter={memberRoleFilter}
                onRoleFilterChange={setMemberRoleFilter}
                statusFilter={memberStatusFilter}
                onStatusFilterChange={setMemberStatusFilter}
                selected={selectedMembers}
                onSelectedChange={setSelectedMembers}
                onInvite={openAddMemberDialog}
                onChangeRole={handleChangeMemberRole}
                onReinvite={handleReinviteMember}
                onRemove={handleRemoveMember}
                onBulkRemove={handleBulkRemoveMembers}
              />
            </TabPanel>
          )}

          {isOwner && (
            <TabPanel header="Danger Zone">
              <DangerZoneTab
                project={project}
                visibility={projectVisibility}
                onChangeVisibility={handleChangeVisibility}
                onToggleActive={handleToggleActive}
                canArchiveProject={canArchiveProject}
                onArchive={handleArchiveProject}
                canDeleteProject={canDeleteProject}
                onDeletePermanently={handleDeletePermanently}
              />
            </TabPanel>
          )}
        </TabView>
      </Card>

      <ModuleDialog
        visible={moduleDialogOpen}
        editing={!!editingModuleId}
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
        editing={!!editingTagId}
        name={tagName}
        onNameChange={setTagName}
        error={tagError}
        onHide={() => setTagDialogOpen(false)}
        onSave={handleSaveTag}
      />

      <TestRoleDialog
        visible={testRoleDialogOpen}
        editing={!!editingTestRoleId}
        name={testRoleName}
        onNameChange={setTestRoleName}
        error={testRoleError}
        onHide={() => setTestRoleDialogOpen(false)}
        onSave={handleSaveTestRole}
      />

      <InviteMemberDialog
        visible={memberDialogOpen}
        profile={memberProfile}
        onProfileChange={setMemberProfile}
        role={memberRole}
        onRoleChange={setMemberRole}
        excludeIds={existingMemberIds}
        error={memberError}
        onHide={() => setMemberDialogOpen(false)}
        onInvite={handleAddMember}
      />

      <CreateProjectDialog
        visible={editDialogOpen}
        editingProject={project}
        onHide={() => setEditDialogOpen(false)}
        onSaved={() => {
          setEditDialogOpen(false);
          loadAll(false);
          toastHelper.success('Project updated');
        }}
      />
    </div>
  );
}
