import { useRef } from 'react';
import { Menu } from 'primereact/menu';
import type { MenuItem } from 'primereact/menuitem';
import { Button } from 'primereact/button';

interface RowActionsMenuProps {
  items: MenuItem[];
}

// Single kebab (three-dot) button that opens an overlay menu with row actions —
// used instead of a row of separate icon buttons in every "Aksi" column.
export function RowActionsMenu({ items }: RowActionsMenuProps) {
  const menuRef = useRef<Menu>(null);

  return (
    <div className="flex align-items-start">
      <Button
        icon="pi pi-ellipsis-v"
        text
        rounded
        plain
        size="small"
        className="text-color-secondary"
        aria-label=""
        onClick={(e) => {
          e.stopPropagation();
          menuRef.current?.toggle(e);
        }}
      />
      <Menu ref={menuRef} model={items} popup appendTo={document.body} />
    </div>
  );
}
