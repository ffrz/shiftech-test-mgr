import { Link } from 'react-router-dom';
import { Button } from 'primereact/button';
import { AppMenu } from './AppMenu';
import { useLayoutContext } from './LayoutContext';

export function AppSidebar() {
  const { closeMenu } = useLayoutContext();

  return (
    <div className="layout-sidebar">
      <div className="layout-sidebar-header">
        <Link to="/home" className="layout-sidebar-logo" onClick={closeMenu}>
          <i className="pi pi-check-square" />
          <span>Testify</span>
        </Link>
        <Button icon="pi pi-times" text rounded aria-label="Tutup menu" onClick={closeMenu} />
      </div>
      <AppMenu onNavigate={closeMenu} />
    </div>
  );
}

export function AppSidebarMask() {
  const { closeMenu } = useLayoutContext();
  return <div className="layout-mask" onClick={closeMenu} />;
}
