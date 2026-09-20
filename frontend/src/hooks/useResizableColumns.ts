import { useCallback, useEffect, useMemo, useState } from 'react';
import type { DataTableColumnResizeEndEvent } from 'primereact/datatable';
import type { ColumnProps } from 'primereact/column';

// Persists per-column pixel widths to localStorage, so a user's manual column resize
// survives reload/navigation.
//
// Deliberately hand-rolled instead of PrimeReact's own `stateKey`/`stateStorage` DataTable
// state mechanism: that mechanism bundles column widths together with sort/filter/
// pagination/selection state, and marking a table "stateful" changes how it computes
// paging internally even when a custom save/restore only persists widths — on a
// lazy/server-paginated table (controlled `first`/`rows`/`onPage`/`totalRecords`) this
// corrupted pagination on reload ("NaN-NaN of N"). Tracking widths ourselves, fully
// outside PrimeReact's stateful-table code path, avoids that interaction entirely.
//
// The table element also needs an explicit total width restored, not just each <Column>:
// PrimeReact's `.p-datatable-table` renders at `width: 100%` of its wrapper by default, so
// under `table-layout: fixed` the browser scales every column's declared width down
// proportionally to fit that 100% whenever the *sum* of all columns' widths exceeds the
// wrapper's width — a column saved at 320px can render back much narrower after reload.
// During a live drag, PrimeReact compensates by growing the table element itself
// (`columnResizeMode="expand"`'s internal `updateTableWidth`); on reload there's no live
// drag to do that, so this hook is given the full list of columns' (field, fallback width)
// up front and sums their resolved pixel widths itself for the DataTable's `tableStyle`.
//
// Usage:
//   const { colWidth, tableStyle, onColumnResizeEnd } = useResizableColumns('issues', [
//     ['code', '7rem'], ['title', '20rem'], ['status', '9rem'],
//   ]);
//   <DataTable tableStyle={tableStyle} resizableColumns columnResizeMode="expand"
//     onColumnResizeEnd={onColumnResizeEnd} ...>
//     <Column style={{ width: colWidth('code', '7rem') }} .../>
export function useResizableColumns(storageKey: string, columns: readonly (readonly [field: string, fallback: string])[]) {
  const key = `table-col-widths:${storageKey}`;
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      setColumnWidths(raw ? JSON.parse(raw) : {});
    } catch {
      setColumnWidths({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const onColumnResizeEnd = useCallback(
    (e: DataTableColumnResizeEndEvent) => {
      const props = e.column.props as ColumnProps;
      const field = props.field ?? props.columnKey;
      if (!field) return;
      const width = Math.round(e.element.getBoundingClientRect().width);
      if (!width) return;
      setColumnWidths((prev) => {
        const next = { ...prev, [field]: width };
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
  // consistently, e.g. a short slug). fallback is the design-time width (e.g. '10rem').
  const colWidth = useCallback(
    (field: string, fallback: string): string => {
      const saved = columnWidths[field];
      return saved ? `${saved}px` : fallback;
    },
    [columnWidths],
  );

  // Only force an explicit table width once at least one of this table's columns has
  // actually been resized — otherwise an untouched table keeps its normal
  // 100%-of-wrapper sizing so it still fills the available space by default.
  const tableStyle = useMemo(() => {
    const hasResizedColumn = columns.some(([field]) => columnWidths[field] !== undefined);
    if (!hasResizedColumn) return undefined;
    const sum = columns.reduce((total, [field, fallback]) => total + (columnWidths[field] ?? remOrPxToPx(fallback)), 0);
    return { width: `${sum}px`, minWidth: '100%' };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columnWidths, columns]);

  return { onColumnResizeEnd, colWidth, tableStyle };
}

function remOrPxToPx(value: string): number {
  const remMatch = value.match(/^([\d.]+)rem$/);
  if (remMatch) return parseFloat(remMatch[1]) * 16;
  const pxMatch = value.match(/^([\d.]+)px$/);
  if (pxMatch) return parseFloat(pxMatch[1]);
  return 0;
}
