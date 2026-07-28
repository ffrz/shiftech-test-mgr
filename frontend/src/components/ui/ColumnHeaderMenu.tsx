import { useRef } from 'react';
import { Menu } from 'primereact/menu';
import type { MenuItem } from 'primereact/menuitem';
import { Button } from 'primereact/button';

interface ColumnHeaderMenuProps {
  label: string;
  field: string;
  sortField?: string;
  sortOrder?: 1 | -1;
  onSort?: (field: string, order: 1 | -1) => void;
  extraItems?: MenuItem[];
}

// Column header for desktop tables: title on the left (click to toggle sort
// asc/desc), sort indicator + a kebab menu pushed to the right (sort actions
// plus room for per-column filter later), mirroring the GitHub Projects table
// header pattern. Mobile view collapses columns into cards and doesn't use
// this — see each page's `isMobile` branch.
export function ColumnHeaderMenu({ label, field, sortField, sortOrder, onSort, extraItems }: ColumnHeaderMenuProps) {
  const menuRef = useRef<Menu>(null);
  const isSorted = sortField === field;

  function toggleSort() {
    const nextOrder: 1 | -1 = isSorted && sortOrder === 1 ? -1 : 1;
    onSort?.(field, nextOrder);
  }

  function sortMenuItem(label: string, icon: string, order: 1 | -1): MenuItem {
    const active = isSorted && sortOrder === order;
    return {
      label,
      icon,
      template: (item, options) => (
        <button type="button" className={`${options.className} flex align-items-center gap-2`} onClick={options.onClick}>
          <span className={`${item.icon} p-menuitem-icon`} />
          <span className={options.labelClassName}>{item.label}</span>
          {active && <i className="pi pi-check ml-auto" />}
        </button>
      ),
      command: () => onSort?.(field, order),
    };
  }

  const items: MenuItem[] = [
    sortMenuItem('Sort ascending', 'pi pi-sort-amount-up', 1),
    sortMenuItem('Sort descending', 'pi pi-sort-amount-down', -1),
    ...(extraItems ?? []),
  ];

  return (
    <div className="flex align-items-center justify-content-between w-full gap-3" style={{ minWidth: 0 }}>
      <span className="cursor-pointer select-none white-space-nowrap" onClick={toggleSort}>{label}</span>
      <div className="flex align-items-center gap-1 flex-shrink-0">
        {isSorted && <i className={`pi ${sortOrder === 1 ? 'pi-sort-amount-up' : 'pi-sort-amount-down'} text-color-secondary text-sm`} />}
        <Button
          icon="pi pi-ellipsis-h"
          text
          rounded
          plain
          size="small"
          className="text-color-secondary"
          style={{ width: '1.5rem', height: '1.5rem', padding: 0, fontSize: '0.75rem' }}
          aria-label={`${label} column menu`}
          onClick={(e) => {
            e.stopPropagation();
            menuRef.current?.toggle(e);
          }}
        />
        <Menu ref={menuRef} model={items} popup popupAlignment="right" appendTo={document.body} />
      </div>
    </div>
  );
}
