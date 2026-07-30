import { useState, type ReactNode } from 'react';
import { Button } from 'primereact/button';

type FilterToolbarProps = {
  /** Extra icon buttons rendered right of the filter toggle, before the primary action (e.g. import/duplicate). */
  secondaryActions?: ReactNode;
  /** Primary action button(s) rendered at the far right (e.g. "New Issue"). */
  primaryAction?: ReactNode;
  /** Filter fields (grid), shown/hidden by the toggle. */
  children: ReactNode;
  /** Hides the whole toolbar (actions + toggle), matching each tab's own permission gate. */
  visible?: boolean;
  defaultFilterVisible?: boolean;
  /** Controlled mode: pass both to let the parent own the toggle state instead of FilterToolbar managing it internally. */
  filterVisible?: boolean;
  onToggleFilterVisible?: () => void;
};

export function FilterToolbar({
  secondaryActions,
  primaryAction,
  children,
  visible = true,
  defaultFilterVisible = true,
  filterVisible: filterVisibleProp,
  onToggleFilterVisible,
}: FilterToolbarProps) {
  const [internalFilterVisible, setInternalFilterVisible] = useState(defaultFilterVisible);
  const filterVisible = filterVisibleProp ?? internalFilterVisible;
  const toggleFilterVisible = onToggleFilterVisible ?? (() => setInternalFilterVisible((v) => !v));

  if (!visible) return null;

  return (
    <>
      <div className="flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
        <Button
          icon={filterVisible ? 'pi pi-filter-fill' : 'pi pi-filter'}
          text
          rounded
          size="large"
          severity={filterVisible ? 'warning' : 'secondary'}
          onClick={toggleFilterVisible}
          tooltip={filterVisible ? 'Hide filters' : 'Show filters'}
          tooltipOptions={{ position: 'bottom' }}
        />
        <div className="flex gap-2 align-items-center ">
          <div className="mr-2">
            {secondaryActions}
          </div>
          {primaryAction}
        </div>
      </div>
      {filterVisible && <div className="grid mb-2 p-1">{children}</div>}
    </>
  );
}
