import { useRef } from 'react';
import { Button } from 'primereact/button';
import { Menu } from 'primereact/menu';
import { useThemeContext, type ThemeMode } from '../../hooks/useTheme';

const MODE_ICON: Record<ThemeMode, string> = {
  system: 'pi pi-desktop',
  light: 'pi pi-sun',
  dark: 'pi pi-moon',
};

export function ThemeToggle() {
  const { mode, setMode } = useThemeContext();
  const menuRef = useRef<Menu>(null);

  const items = [
    { label: 'System', icon: MODE_ICON.system, command: () => setMode('system') },
    { label: 'Light', icon: MODE_ICON.light, command: () => setMode('light') },
    { label: 'Dark', icon: MODE_ICON.dark, command: () => setMode('dark') },
  ];

  return (
    <>
      <Button
        icon={MODE_ICON[mode]}
        text
        rounded
        aria-label="Ganti tema"
        onClick={(e) => menuRef.current?.toggle(e)}
      />
      <Menu model={items} popup ref={menuRef} appendTo={document.body} />
    </>
  );
}
