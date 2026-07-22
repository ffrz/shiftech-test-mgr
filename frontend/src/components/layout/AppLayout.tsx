import { Outlet } from 'react-router-dom';
import { classNames } from 'primereact/utils';
import { AppTopbar } from './AppTopbar';
import { AppSidebar, AppSidebarMask } from './AppSidebar';
import { LayoutProvider, useLayoutContext } from './LayoutContext';
import { BreadcrumbProvider } from './BreadcrumbContext';
import { useRealtimeSync } from '../../hooks/useRealtimeSync';

function AppLayoutInner() {
  const { menuActive } = useLayoutContext();
  // Central Realtime subscriber — one channel for the whole app, mounted once here rather
  // than per-page/per-hook. See hooks/useRealtimeSync.ts for the table -> query key mapping.
  useRealtimeSync();

  const wrapperClass = classNames('layout-wrapper', {
    'layout-menu-active': menuActive,
  });

  return (
    <div className={wrapperClass}>
      <AppTopbar />
      <AppSidebar />
      <AppSidebarMask />
      <div className="layout-main-container">
        <div className="layout-main">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

export function AppLayout() {
  return (
    <LayoutProvider>
      <BreadcrumbProvider>
        <AppLayoutInner />
      </BreadcrumbProvider>
    </LayoutProvider>
  );
}
