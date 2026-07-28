import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBreadcrumbContext } from '../layout/BreadcrumbContext';

export interface BreadcrumbItem {
  label: string;
  path?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

function BreadcrumbTrail({ items, className }: { items: BreadcrumbItem[]; className?: string }) {
  const navigate = useNavigate();

  return (
    <nav className={className} aria-label="breadcrumb">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <span key={index} className="flex align-items-center gap-2">
            {index > 0 && <i className="pi pi-angle-right text-color-secondary" style={{ fontSize: '0.7rem' }} />}
            {!item.path ? (
              <span className={isLast ? 'text-color font-bold' : 'text-color-secondary'}>{item.label}</span>
            ) : (
              <a
                href={item.path}
                className={`breadcrumb-link cursor-pointer ${isLast ? 'text-color font-bold' : 'text-color-secondary'}`}
                onClick={(e) => {
                  e.preventDefault();
                  if (isLast) {
                    window.location.href = `/app${item.path}`;
                  } else {
                    navigate(item.path!);
                  }
                }}
              >
                {item.label}
              </a>
            )}
          </span>
        );
      })}
    </nav>
  );
}

// Navigational trail shown above detail pages so users know which project/module they're in.
// On desktop it's rendered inside the topbar (via BreadcrumbContext, see AppTopbar); this
// component only renders its own inline copy on small screens where the topbar has no room.
export function Breadcrumb({ items }: BreadcrumbProps) {
  const { setItems } = useBreadcrumbContext();

  useEffect(() => {
    setItems(items);
    // No cleanup: the next page's Breadcrumb sets its own items on mount before
    // this one's cleanup would run, so clearing here only causes a blank flash
    // in the topbar between unmount and the next page's effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(items)]);

  return <BreadcrumbTrail items={items} className={`${items.length > 1 ? 'flex' : 'hidden'} lg:hidden align-items-center flex-wrap gap-2 mb-3 text-sm`} />;
}

export { BreadcrumbTrail };
