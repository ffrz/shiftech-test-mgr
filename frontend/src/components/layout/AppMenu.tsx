import { useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Button } from 'primereact/button';
import { IconField } from 'primereact/iconfield';
import { InputIcon } from 'primereact/inputicon';
import { Toast } from 'primereact/toast';
import { AppMenuitem, AppMenuSeparator, type MenuItemModel } from './AppMenuitem';
import { useAuthContext } from '../../hooks/useAuth';
import { useProjects } from '../../hooks/useProjects';
import { useProjectPins } from '../../hooks/useProjectPins';
import { projectService } from '../../services/projectService';

const MAX_VISIBLE_PROJECTS = 10;

export function AppMenu({ onNavigate }: { onNavigate?: () => void }) {
  const navigate = useNavigate();
  const toast = useRef<Toast>(null);
  const { isAdmin } = useAuthContext();
  const { projects, reload } = useProjects({ status: 'active', sortField: 'name', sortDirection: 'asc' });
  const { isPinned, togglePin } = useProjectPins();

  const [projectSearch, setProjectSearch] = useState('');

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  function openAddDialog() {
    setName('');
    setDescription('');
    setError(null);
    setAddDialogOpen(true);
  }

  async function handleSave() {
    setError(null);
    try {
      const created = await projectService.create({ name, description });
      setAddDialogOpen(false);
      await reload();
      onNavigate?.();
      navigate(`/projects/${created.id}`);
      toast.current?.show({ severity: 'success', summary: 'Project created' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save project');
    }
  }

  const q = projectSearch.trim().toLowerCase();
  const filteredProjects = q ? projects.filter((p) => p.name.toLowerCase().includes(q)) : projects;
  const sortedProjects = [...filteredProjects].sort((a, b) => {
    const pinDiff = Number(isPinned(b.id)) - Number(isPinned(a.id));
    if (pinDiff !== 0) return pinDiff;
    return a.name.localeCompare(b.name);
  });
  const visibleProjects = sortedProjects.slice(0, MAX_VISIBLE_PROJECTS);

  const mainItems: MenuItemModel[] = [
    { label: 'Home', icon: 'pi pi-home', url: '/home' },
    { label: 'Projects', icon: 'pi pi-folder', url: '/', end: true },
    ...(isAdmin
      ? [
          {
            label: 'Library',
            icon: 'pi pi-book',
            items: [{ label: 'Test Case', icon: 'pi pi-copy', url: '/test-case-templates' }],
          },
          {
            label: 'Administration',
            icon: 'pi pi-cog',
            items: [{ label: 'Users', icon: 'pi pi-users', url: '/users' }],
          },
        ]
      : []),
  ];

  return (
    <>
      <Toast ref={toast} />
      <ul className="layout-menu">
        {mainItems.map((item) => (
          <AppMenuitem key={item.url} item={item} onNavigate={onNavigate} />
        ))}

        <AppMenuSeparator />

        <li className="layout-menu-section-header">
          <span>Top Projects</span>
          <button
            type="button"
            className="layout-menuitem-add"
            title="New Project"
            aria-label="New Project"
            onClick={openAddDialog}
          >
            <i className="pi pi-plus" />
          </button>
        </li>

        <li className="layout-menu-search">
          <IconField iconPosition="left">
            <InputIcon className="pi pi-search" />
            <InputText
              value={projectSearch}
              onChange={(e) => setProjectSearch(e.target.value)}
              placeholder="Filter projects..."
              className="w-full"
            />
          </IconField>
        </li>

        {visibleProjects.map((project) => (
          <li key={project.id} className="layout-submenu-item">
            <NavLink
              to={`/projects/${project.id}`}
              onClick={onNavigate}
              className={({ isActive }) => `layout-menuitem-link layout-submenu-link ${isActive ? 'active-route' : ''}`}
            >
              <span className="layout-menuitem-text" title={project.name}>
                {project.name}
              </span>
            </NavLink>
            <button
              type="button"
              className={`layout-submenu-pin ${isPinned(project.id) ? 'pinned' : ''}`}
              title={isPinned(project.id) ? 'Unpin' : 'Pin project'}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                togglePin(project.id);
              }}
            >
              <i className={isPinned(project.id) ? 'pi pi-star-fill' : 'pi pi-star'} />
            </button>
          </li>
        ))}

        {visibleProjects.length === 0 && (
          <li className="layout-menu-empty">
            <span className="text-color-secondary text-sm">No projects found</span>
          </li>
        )}
      </ul>

      <Dialog
        header="New Project"
        visible={addDialogOpen}
        onHide={() => setAddDialogOpen(false)}
        onShow={() => nameRef.current?.focus()}
        style={{ width: '30rem' }}
      >
        <div className="flex flex-column gap-3">
          {error && <small className="p-error">{error}</small>}
          <div className="flex flex-column gap-1">
            <label htmlFor="add-project-name">Name</label>
            <InputText
              id="add-project-name"
              ref={nameRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave();
              }}
            />
          </div>
          <div className="flex flex-column gap-1">
            <label htmlFor="add-project-description">Description</label>
            <InputTextarea
              id="add-project-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <Button label="Save" size="small" onClick={handleSave} />
        </div>
      </Dialog>
    </>
  );
}
