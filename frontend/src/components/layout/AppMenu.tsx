import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import SearchInput from '../ui/SearchInput';
import { AppMenuitem, AppMenuSeparator, type MenuItemModel } from './AppMenuitem';
import { useAuthContext } from '../../hooks/useAuth';
import { useProjects } from '../../hooks/useProjects';
import { useProjectPins } from '../../hooks/useProjectPins';
import { OwnerProjectLabel } from '../ui/OwnerProjectLabel';
import type { Project } from '../../types/domain';

const MAX_VISIBLE_PROJECTS = 10;

type EnrichedProject = Project & {
  _ownerUsername: string | null;
  _ownerDisplayName: string | null;
};

export function AppMenu({ onNavigate }: { onNavigate?: () => void }) {
  const navigate = useNavigate();
  const { isAdmin } = useAuthContext();
  const { projects } = useProjects({ status: 'active', sortField: 'name', sortDirection: 'asc' });
  const { isPinned, togglePin } = useProjectPins();

  const [projectSearch, setProjectSearch] = useState('');

  const q = projectSearch.trim().toLowerCase();
  const filteredProjects = q ? projects.filter((p) => p.name.toLowerCase().includes(q)) : projects;
  const sortedProjects = [...filteredProjects].sort((a, b) => {
    const pinDiff = Number(isPinned(b.id)) - Number(isPinned(a.id));
    if (pinDiff !== 0) return pinDiff;
    return a.name.localeCompare(b.name);
  });
  const visibleProjects = sortedProjects.slice(0, MAX_VISIBLE_PROJECTS);

  const mainItems: MenuItemModel[] = [
    { label: 'Home', icon: 'pi pi-home', url: '/', end: true },
    { label: 'Projects', icon: 'pi pi-folder', url: '/projects' },
    { label: 'Settings', icon: 'pi pi-cog', url: '/settings' },
    {
      label: 'Library',
      icon: 'pi pi-book',
      items: [{ label: 'Test Suite', icon: 'pi pi-copy', url: '/test-suites' }],
    },
    ...(isAdmin
      ? [
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
      <ul className="layout-menu">
        {mainItems.map((item) => (
          <AppMenuitem key={item.url ?? item.label} item={item} onNavigate={onNavigate} />
        ))}

        <AppMenuSeparator />

        <li className="layout-menu-section-header">
          <span>Top Projects</span>
          <button
            type="button"
            className="layout-menuitem-add"
            title="New Project"
            aria-label="New Project"
            onClick={() => navigate('/projects?create=true')}
          >
            <i className="pi pi-plus" />
          </button>
        </li>

        <li className="layout-menu-search">
          <SearchInput value={projectSearch} onChange={setProjectSearch} placeholder="Filter projects..." />
        </li>

        {visibleProjects.map((project) => (
          <li key={project.id} className="layout-submenu-item  top-project-items">
            <NavLink
              to={`/projects/${project.id}`}
              onClick={onNavigate}
              className={({ isActive }) => `layout-menuitem-link layout-submenu-link ${isActive ? 'active-route' : ''}`}
            >
              <span className="layout-menuitem-text" title={(project as EnrichedProject)._ownerUsername ? `${(project as EnrichedProject)._ownerUsername} / ${project.name}` : project.name}>
                <OwnerProjectLabel username={(project as EnrichedProject)._ownerUsername} name={project.name} maxOwnerLength={10} />
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
    </>
  );
}
