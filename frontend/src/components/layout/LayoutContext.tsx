import { createContext, useContext, useState, type ReactNode } from 'react';

interface LayoutContextValue {
  menuActive: boolean;
  onMenuToggle: () => void;
  closeMenu: () => void;
}

const LayoutContext = createContext<LayoutContextValue | undefined>(undefined);

const DESKTOP_BREAKPOINT = 992;

function isDesktop() {
  return typeof window !== 'undefined' && window.innerWidth >= DESKTOP_BREAKPOINT;
}

// Desktop (>= 992px): sidebar is a static, always-in-flow panel that starts
// open and can be toggled closed. Tablet/mobile: sidebar behaves as a
// slide-in overlay, closed by default.
export function LayoutProvider({ children }: { children: ReactNode }) {
  const [menuActive, setMenuActive] = useState(isDesktop);

  function onMenuToggle() {
    setMenuActive((prev) => !prev);
  }

  // On desktop the sidebar is static/in-flow, not an overlay, so a nav click
  // shouldn't collapse it — only the explicit toggle button should.
  function closeMenu() {
    if (isDesktop()) return;
    setMenuActive(false);
  }

  return (
    <LayoutContext.Provider value={{ menuActive, onMenuToggle, closeMenu }}>
      {children}
    </LayoutContext.Provider>
  );
}

export function useLayoutContext() {
  const ctx = useContext(LayoutContext);
  if (!ctx) throw new Error('useLayoutContext must be used within LayoutProvider');
  return ctx;
}
