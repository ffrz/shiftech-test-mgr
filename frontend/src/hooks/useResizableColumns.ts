import { useCallback, useEffect, useRef, useState } from 'react';
import type { DataTableColumnResizeEndEvent } from 'primereact/datatable';
import type { ColumnProps } from 'primereact/column';

// Persists per-column pixel widths to localStorage, keyed by a stable table id, so a
// user's manual column resize survives reload/navigation. Pair with PrimeReact
// DataTable's `resizableColumns` + `columnResizeMode="expand"` and spread
// `columnWidths` onto each <Column style={{ width: columnWidths[field] }}>.
export function useResizableColumns(storageKey: string) {
  const key = `table-col-widths:${storageKey}`;
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const loaded = useRef(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      setColumnWidths(raw ? JSON.parse(raw) : {});
    } catch {
      setColumnWidths({});
    }
    loaded.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const onColumnResizeEnd = useCallback(
    (e: DataTableColumnResizeEndEvent) => {
      const props = e.column.props as ColumnProps;
      const field = props.field ?? props.columnKey;
      if (!field) return;
      setColumnWidths((prev) => {
        const next = { ...prev, [field]: e.element.offsetWidth };
        try {
          localStorage.setItem(key, JSON.stringify(next));
        } catch {
          // best-effort only — a full/blocked localStorage shouldn't break resizing
        }
        return next;
      });
    },
    [key],
  );

  // field is a Column's `field`/`columnKey` (also used as the object key above, and — for
  // columns with no `field`, like body-only ones — any string you pass to both call sites
  // consistently, e.g. header text). fallback is the design-time width (e.g. '10rem').
  const colWidth = useCallback(
    (field: string, fallback: string): string => {
      const saved = columnWidths[field];
      return saved ? `${saved}px` : fallback;
    },
    [columnWidths],
  );

  return { columnWidths, onColumnResizeEnd, colWidth };
}
