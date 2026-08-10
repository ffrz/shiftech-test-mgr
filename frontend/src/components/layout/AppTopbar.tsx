import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Avatar } from 'primereact/avatar';
import { Badge } from 'primereact/badge';
import { Button } from 'primereact/button';
import { Menu } from 'primereact/menu';
import { Dialog } from 'primereact/dialog';
import { useAuthContext } from '../../hooks/useAuth';
import { useNotifications } from '../../hooks/useNotifications';
import { useLayoutContext } from './LayoutContext';
import { useBreadcrumbContext } from './BreadcrumbContext';
import { BreadcrumbCollapsed, BreadcrumbTrail, type BreadcrumbItem } from '../ui/Breadcrumb';
import { NotificationPanel } from '../notifications/NotificationPanel';
import { ThemeToggle } from './ThemeToggle';
import { pathForActivityEntity } from '../../helpers/activityRoutes';
import { APP_NAME } from '../../config/app';
import type { Notification } from '../../types/domain';

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
  const [aboutVisible, setAboutVisible] = useState(false);

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
    { separator: true },
    {
      label: `About ${APP_NAME}`,
      icon: 'pi pi-info-circle',
      command: () => setAboutVisible(true),
    },
    { separator: true },
    {
      label: 'Sign Out',
      icon: 'pi pi-sign-out',
      command: signOut,
    },
  ];

  const trailItems: BreadcrumbItem[] = items;

  return (
    <div className="layout-topbar">
      <div className="layout-topbar-left">
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
      </div>

      {trailItems.length > 0 && (
        <div className="layout-topbar-center">
          <BreadcrumbTrail items={trailItems} className="hidden lg:flex align-items-center flex-nowrap gap-2 text-sm min-w-0" />
          <BreadcrumbCollapsed items={trailItems} />
        </div>
      )}

      <div className="layout-topbar-right">
        <Button
          icon="pi pi-question-circle"
          text
          rounded
          severity="secondary"
          aria-label="Help"
          style={{ width: '1.75rem', height: '1.75rem' }}
          onClick={() => window.open('/docs', '_blank')}
        />
        <ThemeToggle />
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

      <Dialog
        visible={aboutVisible}
        onHide={() => setAboutVisible(false)}
        header={`About ${APP_NAME}`}
        style={{ width: '24rem' }}
        footer={
          <Button label="Close" icon="pi pi-times" text onClick={() => setAboutVisible(false)} />
        }
      >
        <div className="flex flex-column gap-3">
          <div className="flex align-items-center gap-3">
            <img src={`${import.meta.env.BASE_URL}logo.png`} alt="" width={48} height={48} />
            <div>
              <div className="text-xl font-bold">{APP_NAME}</div>
              <div className="text-color-secondary text-sm">Simple QA &amp; Test Management Platform</div>
            </div>
          </div>
          <p className="text-color-secondary m-0">
            Open source. Cloud or self-hosted. Built for modern testing.
          </p>
        </div>
      </Dialog>
    </div>
  );
}
