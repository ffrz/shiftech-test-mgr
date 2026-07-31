import { Link } from 'react-router-dom';
import { Button } from 'primereact/button';
import { AppMenu } from './AppMenu';
import { useLayoutContext } from './LayoutContext';

export function AppSidebar() {
  const { closeMenu } = useLayoutContext();

  return (
    <div className="layout-sidebar">
      {/* Desktop: topbar already shows the Testify logo and the toggle button,
          so this header row (duplicate logo + close button) is mobile/tablet-only. */}
      <div className="layout-sidebar-header layout-sidebar-header-mobile">
        <Link to="/" className="layout-sidebar-logo" onClick={closeMenu}>
          <img
            src={`${import.meta.env.BASE_URL}logo.png`}
            alt=""
            width={32}
            height={32}
            className="p-1"
          />
        </Link>
        <Button icon="pi pi-times" text rounded severity="secondary" aria-label="Close menu" onClick={closeMenu} />
      </div>
      <AppMenu onNavigate={closeMenu} />
    </div>
  );
}

export function AppSidebarMask() {
  const { closeMenu } = useLayoutContext();
  return <div className="layout-mask" onClick={closeMenu} />;
}
