import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from 'primereact/button';
import { Menu } from 'primereact/menu';
import { useBreadcrumbContext } from '../layout/BreadcrumbContext';

export interface BreadcrumbItem {
  label: string;
  path?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

const MAX_LABEL_LENGTH = 30;

function truncateLabel(label: string): string {
  return label.length > MAX_LABEL_LENGTH ? `${label.slice(0, MAX_LABEL_LENGTH)}…` : label;
}

function BreadcrumbTrail({ items, className }: { items: BreadcrumbItem[]; className?: string }) {
  const navigate = useNavigate();

  return (
    <nav className={className} aria-label="breadcrumb">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        const label = truncateLabel(item.label);
        return (
          <span key={index} className="flex align-items-center gap-2 min-w-0">
            {index > 0 && <span className="text-color-secondary flex-shrink-0">/</span>}
            {!item.path ? (
              <span className={`${isLast ? 'text-color font-bold' : 'text-color-secondary'} whitespace-nowrap overflow-hidden text-ellipsis`}>{label}</span>
            ) : (
              <a
                href={item.path}
                title={label.length > MAX_LABEL_LENGTH ? item.label : undefined}
                className={`breadcrumb-link cursor-pointer whitespace-nowrap overflow-hidden text-ellipsis ${isLast ? 'text-color font-bold' : 'text-color-secondary'}`}
                onClick={(e) => {
                  e.preventDefault();
                  if (isLast) {
                    window.location.href = `/app${item.path}`;
                  } else {
                    navigate(item.path!);
                  }
                }}
              >
                {label}
              </a>
            )}
          </span>
        );
      })}
    </nav>
  );
}

// Collapsed trail for small screens where the topbar has no room for the full
// path: shows only the last item, with a "..." button in front that opens a
// menu listing every hidden item (each keeping its own path).
export function BreadcrumbCollapsed({ items }: { items: BreadcrumbItem[] }) {
  const navigate = useNavigate();
  const menuRef = useRef<Menu>(null);
  const middle = items.slice(0, -1);
  const last = items[items.length - 1];

  const menuItems = middle.map((item) => ({
    label: truncateLabel(item.label),
    command: item.path ? () => navigate(item.path!) : undefined,
  }));

  return (
    <nav className="flex lg:hidden align-items-center gap-2 text-sm min-w-0" aria-label="breadcrumb">
      {middle.length > 0 && (
        <>
          <Button
            icon="pi pi-ellipsis-h"
            text
            rounded
            severity="secondary"
            size="small"
            aria-label="Show path"
            onClick={(e) => menuRef.current?.toggle(e)}
          />
          <Menu model={menuItems} popup ref={menuRef} appendTo={document.body} />
          <span className="text-color-secondary">/</span>
        </>
      )}
      <span className="text-color font-bold whitespace-nowrap overflow-hidden text-ellipsis min-w-0 flex-1" title={last?.label}>
        {last ? truncateLabel(last.label) : ''}
      </span>
    </nav>
  );
}

// Trail fed to the topbar via BreadcrumbContext (see AppTopbar) so every screen
// — desktop and small — renders it in the navbar instead of above the page.
export function Breadcrumb({ items }: BreadcrumbProps) {
  const { setItems } = useBreadcrumbContext();

  useEffect(() => {
    setItems(items);
    // No cleanup: the next page's Breadcrumb sets its own items on mount before
    // this one's cleanup would run, so clearing here only causes a blank flash
    // in the topbar between unmount and the next page's effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(items)]);

  return null;
}

export { BreadcrumbTrail };
