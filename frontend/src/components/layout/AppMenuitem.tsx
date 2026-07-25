import { useState } from 'react';
import { NavLink } from 'react-router-dom';

export interface MenuItemModel {
  label: string;
  icon: string;
  url?: string;
  end?: boolean;
  items?: MenuItemModel[];
}

export function AppMenuitem({ item, onNavigate }: { item: MenuItemModel; onNavigate?: () => void }) {
  const [expanded, setExpanded] = useState(false);

  if (item.items) {
    return (
      <li className="layout-root-menuitem">
        <div className="layout-menuitem-toggle-row">
          <button
            type="button"
            className="layout-menuitem-toggle"
            onClick={() => setExpanded((prev) => !prev)}
          >
            <div className="layout-menuitem-link" style={{ cursor: 'pointer' }}>
              <i className={`layout-menuitem-icon ${item.icon}`} />
              <span className="layout-menuitem-text">{item.label}</span>
              <i className={`pi ${expanded ? 'pi-chevron-down' : 'pi-chevron-right'} layout-menuitem-toggle-icon`} />
            </div>
          </button>
        </div>
        {expanded && (
          <ul className="layout-submenu">
            {item.items.map((sub) => (
              <li key={sub.url ?? sub.label} className="layout-submenu-item">
                <NavLink
                  to={sub.url!}
                  end={sub.end}
                  onClick={onNavigate}
                  className={({ isActive }) => `layout-menuitem-link layout-submenu-link ${isActive ? 'active-route' : ''}`}
                >
                  <i className={`layout-menuitem-icon ${sub.icon}`} />
                  <span className="layout-menuitem-text">{sub.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        )}
      </li>
    );
  }

  return (
    <li className="layout-root-menuitem">
      <NavLink
        to={item.url!}
        end={item.end ?? item.url === '/'}
        onClick={onNavigate}
        className={({ isActive }) => `layout-menuitem-link ${isActive ? 'active-route' : ''}`}
      >
        <i className={`layout-menuitem-icon ${item.icon}`} />
        <span className="layout-menuitem-text">{item.label}</span>
      </NavLink>
    </li>
  );
}

export function AppMenuSeparator() {
  return <li className="layout-menu-separator" role="separator" />;
}
