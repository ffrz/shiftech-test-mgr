import { useCallback, useEffect, useState } from 'react';
import type { DataTableColumnResizeEndEvent } from 'primereact/datatable';

// Persists every column's pixel width (not just the one being dragged) to localStorage,
// so a user's manual column resize survives reload/navigation.
//
// Deliberately hand-rolled instead of PrimeReact's own `stateKey`/`stateStorage` DataTable
// state mechanism: that mechanism bundles column widths together with sort/filter/
// pagination/selection state, and marking a table "stateful" changes how it computes
// paging internally even when a custom save/restore only persists widths — on a
// lazy/server-paginated table (controlled `first`/`rows`/`onPage`/`totalRecords`) this
// corrupted pagination on reload ("NaN-NaN of N"). Tracking widths ourselves, fully
// outside PrimeReact's stateful-table code path, avoids that interaction entirely.
//
// Why EVERY column, not just the resized one: PrimeReact's DataTable renders at
// `width: 100%` of its wrapper by default, and any flex-fill column (the "Title"/"Name"
// column, styled via the `dt-title-fill` class with `width: 100%`) claims the rest. Under
// `table-layout: fixed`, mixing that 100%-width column with fixed px/rem siblings makes
// the browser's column-width algorithm misallocate space across the WHOLE row, not just
// that one column — so a resized column can render narrower than its own saved width even
// though nothing else changed. During a live drag PrimeReact works around this by
// snapshotting and re-applying every column's width via an injected stylesheet
// (`columnResizeMode="expand"`'s internal `resizeTableCells`); on reload there's no live
// drag to do that, so `onColumnResizeEnd` here mirrors the same idea — on any resize it
// reads and saves every header cell's current rendered width by its position in the row,
// and `colWidthAt` returns an explicit px value for all of them (including the fill
// column) once any resize has happened, so nothing is left for the browser to reflow.
//
// Positions are plain left-to-right index among ALL rendered <th> in the row, including
// the selection-checkbox and actions columns — pass the same index consistently between
// `colWidthAt` calls and column order in JSX.
//
// Usage:
//   const { colWidthAt, onColumnResizeEnd } = useResizableColumns('issues');
//   <DataTable resizableColumns columnResizeMode="expand" onColumnResizeEnd={onColumnResizeEnd} ...>
//     <Column selectionMode="multiple" style={{ width: colWidthAt(0, '3rem') }} />
//     <Column field="code" style={{ width: colWidthAt(1, '7rem') }} .../>
//     <Column field="title" className="dt-title-fill" style={{ width: colWidthAt(2) }} .../>
export function useResizableColumns(storageKey: string) {
  const key = `table-col-widths:${storageKey}`;
  const [columnWidths, setColumnWidths] = useState<Record<number, number>>(() => {
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
      const table = e.element.closest('table');
      const headerRow = table?.querySelector('thead tr');
      if (!headerRow) return;
      const headers = Array.from(headerRow.children) as HTMLElement[];
      const next: Record<number, number> = {};
      headers.forEach((th, index) => {
        const width = Math.round(th.getBoundingClientRect().width);
        if (width) next[index] = width;
      });
      setColumnWidths(next);
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch {
        // best-effort only — a full/blocked localStorage shouldn't break resizing
      }
    },
    [key],
  );

  // fallback is the design-time width (e.g. '10rem', '7rem'), or omitted for a flex-fill
  // column (e.g. "Title") that has no fixed fallback — once ANY column in this table has
  // been resized, every tracked column (including the fill one) gets an explicit
  // saved-or-computed px width; until then, fill columns keep their normal `width: 100%`
  // (via className="dt-title-fill") and fixed columns keep their rem fallback, exactly as
  // before any resizing ever happened.
  const colWidthAt = useCallback(
    (index: number, fallback?: string): string | undefined => {
      const saved = columnWidths[index];
      if (saved) return `${saved}px`;
      return fallback;
    },
    [columnWidths],
  );

  // Once every column has an explicit saved px width (including the fill column), the
  // table itself also needs to be at least that wide — otherwise the browser proportionally
  // compresses all of them to fit the wrapper anyway, same failure mode as relying on each
  // column's own style in isolation. min-width (not width) so the table can still grow
  // past this if its wrapper is wider.
  const savedWidths = Object.values(columnWidths);
  const tableStyle = savedWidths.length > 0
    ? { minWidth: `${savedWidths.reduce((a, b) => a + b, 0)}px` }
    : undefined;

  return { onColumnResizeEnd, colWidthAt, tableStyle };
}
