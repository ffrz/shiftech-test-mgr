import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Avatar } from 'primereact/avatar';
import { Badge } from 'primereact/badge';
import { Button } from 'primereact/button';
import { Menu } from 'primereact/menu';
import { useAuthContext } from '../../hooks/useAuth';
import { useNotifications } from '../../hooks/useNotifications';
import { useLayoutContext } from './LayoutContext';
import { useBreadcrumbContext } from './BreadcrumbContext';
import { BreadcrumbCollapsed, BreadcrumbTrail, type BreadcrumbItem } from '../ui/Breadcrumb';
import { NotificationPanel } from '../notifications/NotificationPanel';
import { pathForActivityEntity } from '../../helpers/activityRoutes';
import type { Notification } from '../../types/domain';

// referenceType/referenceId on entity-activity-driven notifications (comment/mention/
// status_change/assignment) point straight at an entity_activity.entity_type value — see
// activityService.addComment/logEvent, which pass entityType/entityId as
// referenceType/referenceId. project_invite/project_member_removed predate that and use
// their own reference shape (project_member row), so they fall through pathForActivityEntity's
// '/' fallback for an unrecognized entityType.
function pathForNotification(n: Notification): string {
  if (!n.referenceType || !n.referenceId) return '/';
  return pathForActivityEntity(n.referenceType, n.referenceId);
}

function getUserInitial(displayName: string | null | undefined, username?: string, email?: string): string {
  if (displayName) return displayName.charAt(0).toUpperCase();
  if (username) return username.charAt(0).toUpperCase();
  if (email) return email.charAt(0).toUpperCase();
  return '?';
}

export function AppTopbar() {
  const navigate = useNavigate();
  const { profile, user, signOut } = useAuthContext();
  const { notifications, unreadCount, markRead, markAllRead, remove, clearAll } = useNotifications();
  const { onMenuToggle } = useLayoutContext();
  const { items } = useBreadcrumbContext();
  const userMenuRef = useRef<Menu>(null);
  const [notifPanelVisible, setNotifPanelVisible] = useState(false);

  const userMenuItems: any[] = [
    {
      label: 'My Profile',
      icon: 'pi pi-user',
      command: () => { if (profile?.username) navigate(`/@${profile.username}`); },
    },
    {
      label: 'Settings',
      icon: 'pi pi-cog',
      command: () => window.location.assign('/app/settings'),
    },
    {
      label: 'Sign Out',
      icon: 'pi pi-sign-out',
      command: signOut,
    },
  ];

  const trailItems: BreadcrumbItem[] = items;

  return (
    <div className="layout-topbar">
      <Button
        icon="pi pi-sidebar"
        text
        rounded
        severity="secondary"
        className="layout-menu-button"
        aria-label="Toggle menu"
        onClick={onMenuToggle}
      />
      <Link to="/" className="layout-topbar-logo">
        <img
          src={`${import.meta.env.BASE_URL}logo.png`}
          alt=""
          width={32}
          height={32}
          className="p-1"
        />
      </Link>
      {trailItems.length > 0 && (
        <>
          <BreadcrumbTrail items={trailItems} className="hidden lg:flex align-items-center flex-nowrap gap-2 text-sm min-w-0" />
          <BreadcrumbCollapsed items={trailItems} />
        </>
      )}
      <div className="flex-1" />
      <div className="flex align-items-center gap-2">
        <span className="p-overlay-badge">
          <Button
            icon="pi pi-bell"
            text
            rounded
            severity="secondary"
            aria-label="Notifications"
            style={{ width: '1.75rem', height: '1.75rem' }}
            onClick={() => setNotifPanelVisible(true)}
          />
          {unreadCount > 0 && <Badge value={unreadCount} />}
        </span>
        <NotificationPanel
          visible={notifPanelVisible}
          onHide={() => setNotifPanelVisible(false)}
          notifications={notifications}
          unreadCount={unreadCount}
          onMarkRead={markRead}
          onMarkAllRead={markAllRead}
          onRemove={remove}
          onClearAll={clearAll}
          onNotificationClick={(n) => {
            setNotifPanelVisible(false);
            navigate(pathForNotification(n));
          }}
        />
        <Button
          text
          rounded
          aria-label="User menu"
          className="p-0 overflow-hidden"
          style={{ width: '1.75rem', height: '1.75rem' }}
          onClick={(e) => userMenuRef.current?.toggle(e)}
        >
          {profile?.avatarUrl ? (
            <Avatar image={profile.avatarUrl} shape="circle" size="normal" className="w-full h-full" />
          ) : (
            <span className="font-semibold text-sm">{getUserInitial(profile?.displayName, profile?.username, user?.email)}</span>
          )}
        </Button>
        <Menu model={userMenuItems} popup ref={userMenuRef} appendTo={document.body} />
      </div>
    </div>
  );
}
