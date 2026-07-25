import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type ThemeMode = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'theme-mode.v1';
const THEME_LINK_ID = 'prime-theme';
const THEME_HREF: Record<'light' | 'dark', string> = {
  light: '/prime-themes/soho-light/theme.css',
  dark: '/prime-themes/soho-dark/theme.css',
};

interface ThemeContextValue {
  mode: ThemeMode;
  resolvedMode: 'light' | 'dark';
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function getSystemPrefersDark() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function resolve(mode: ThemeMode): 'light' | 'dark' {
  return mode === 'system' ? (getSystemPrefersDark() ? 'dark' : 'light') : mode;
}

function applyTheme(next: 'light' | 'dark') {
  document.documentElement.classList.toggle('dark', next === 'dark');
  const link = document.getElementById(THEME_LINK_ID) as HTMLLinkElement | null;
  if (link) link.href = THEME_HREF[next];
}

// PrimeReact ships separate light/dark theme CSS files (no shared runtime toggle) —
// we swap the <link> href between them instead of maintaining manual CSS variable
// overrides on top of a single light theme.
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
  });
  const [resolvedMode, setResolvedMode] = useState<'light' | 'dark'>(() => resolve(mode));

  useEffect(() => {
    const next = resolve(mode);
    setResolvedMode(next);
    applyTheme(next);
  }, [mode]);

  useEffect(() => {
    if (mode !== 'system') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = () => {
      const next = resolve('system');
      setResolvedMode(next);
      applyTheme(next);
    };
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [mode]);

  function setMode(next: ThemeMode) {
    localStorage.setItem(STORAGE_KEY, next);
    setModeState(next);
  }

  return <ThemeContext.Provider value={{ mode, resolvedMode, setMode }}>{children}</ThemeContext.Provider>;
}

export function useThemeContext() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useThemeContext must be used within ThemeProvider');
  return ctx;
}
