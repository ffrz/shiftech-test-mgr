import { Link } from 'react-router-dom';
import { Avatar } from 'primereact/avatar';
import { Button } from 'primereact/button';
import { useAuthContext } from '../../hooks/useAuth';
import { useLayoutContext } from './LayoutContext';
import { useBreadcrumbContext } from './BreadcrumbContext';
import { BreadcrumbTrail } from '../ui/Breadcrumb';
import { ThemeToggle } from './ThemeToggle';

export function AppTopbar() {
  const { profile, user, signOut } = useAuthContext();
  const { onMenuToggle } = useLayoutContext();
  const { items } = useBreadcrumbContext();

  return (
    <div className="layout-topbar">
      <Button
        icon="pi pi-sidebar"
        text
        rounded
        className="layout-menu-button"
        aria-label="Toggle menu"
        onClick={onMenuToggle}
      />
      <Link to="/" className="layout-topbar-logo">
        <span>Testify</span>
      </Link>
      {items.length > 0 && (
        <>
          <i className="pi pi-angle-right text-color-secondary hidden md:inline" style={{ fontSize: '0.7rem' }} />
          <BreadcrumbTrail items={items} className="hidden align-items-center flex-wrap gap-2 text-sm" />
        </>
      )}
      <div className="flex-1" />
      <div className="flex align-items-center gap-2">
        <Link to="/settings" className="flex align-items-center gap-2 no-underline text-color">
          <Avatar image={profile?.avatarUrl ?? undefined} icon={profile?.avatarUrl ? undefined : 'pi pi-user'} shape="circle" size="normal" />
          <span className="text-sm hidden md:inline">{profile?.displayName ?? user?.email}</span>
        </Link>
        <ThemeToggle />
        <Button icon="pi pi-sign-out" text rounded aria-label="Keluar" onClick={signOut} />
      </div>
    </div>
  );
}
