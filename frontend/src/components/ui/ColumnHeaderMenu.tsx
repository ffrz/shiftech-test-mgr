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
  // Renders below the sort actions inside the same popup — e.g. a MultiSelect
  // to filter this column by. Wrapped in its own menu item with click
  // propagation stopped, since PrimeReact's Menu closes the popup on any
  // item click (see onItemClick in menu.esm.js) regardless of what the
  // item's custom template contains.
  filterContent?: React.ReactNode;
  // Whether filterContent's underlying filter currently narrows the results —
  // swaps the trigger icon from the plain kebab to a filter icon so an active
  // per-column filter is visible without opening the popup.
  isFilterActive?: boolean;
}

// Column header for desktop tables: title on the left (click to toggle sort
// asc/desc), sort indicator + a kebab menu pushed to the right (sort actions
// plus optional per-column filter), mirroring the GitHub Projects table header
// pattern. Mobile view collapses columns into cards and doesn't use this — see
// each page's `isMobile` branch.
export function ColumnHeaderMenu({ label, field, sortField, sortOrder, onSort, filterContent, isFilterActive }: ColumnHeaderMenuProps) {
  const menuRef = useRef<Menu>(null);
  const isSorted = sortField === field;
  const hasFilter = !!filterContent;

  function toggleSort() {
    const nextOrder: 1 | -1 = isSorted && sortOrder === 1 ? -1 : 1;
    onSort?.(field, nextOrder);
  }

  function sortMenuItem(itemLabel: string, icon: string, order: 1 | -1): MenuItem {
    const active = isSorted && sortOrder === order;
    return {
      label: itemLabel,
      icon,
      template: (item, options) => (
        <button type="button" className={`${options.className} gap-2`} onClick={options.onClick}>
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
    ...(filterContent
      ? [
        { separator: true } as MenuItem,
        {
          template: () => (
            <div className="column-header-menu-filter" onClick={(e) => e.stopPropagation()}>
              {filterContent}
            </div>
          ),
        } as MenuItem,
      ]
      : []),
  ];

  return (
    <div
      className="flex align-items-center justify-content-between w-full gap-4 cursor-pointer select-none"
      style={{ minWidth: 0 }}
      onClick={toggleSort}
    >
      <span className="white-space-nowrap">{label}</span>
      <div className="flex align-items-center gap-2 flex-shrink-0 ml-2">
        {isSorted && <i className={`pi ${sortOrder === 1 ? 'pi-sort-amount-up' : 'pi-sort-amount-down'} text-color-secondary text-sm`} />}
        <Button
          icon={hasFilter ? (isFilterActive ? 'pi pi-filter-fill' : 'pi pi-filter') : 'pi pi-ellipsis-h'}
          text
          rounded
          plain={!isFilterActive}
          severity={isFilterActive ? 'warning' : undefined}
          size="small"
          className={isFilterActive ? undefined : 'text-color-secondary'}
          style={{ width: '1.5rem', height: '1.5rem', padding: 0, fontSize: '0.75rem' }}
          aria-label={`${label} column menu`}
          onClick={(e) => {
            e.stopPropagation();
            menuRef.current?.toggle(e);
          }}
        />
        <Menu ref={menuRef} model={items} popup popupAlignment="right" appendTo={document.body} className="column-header-menu-panel" />
      </div>
    </div>
  );
}
