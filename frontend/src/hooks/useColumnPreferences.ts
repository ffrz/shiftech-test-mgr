import { useCallback, useEffect, useMemo, useState } from 'react';
import type { DataTableColumnResizeEndEvent } from 'primereact/datatable';
import type { ColumnProps } from 'primereact/column';

export type ColumnDef = {
  /** Stable identity for this column — the Column's `field` or `columnKey`. Must match
   * exactly what's passed to that <Column>, since resize/visibility are keyed on this
   * rather than array position (position shifts once columns can be hidden, which would
   * silently corrupt a position-keyed record). */
  key: string;
  /** Label shown in the column picker checkbox list. */
  label: string;
  /** Design-time fallback width (e.g. '10rem'), or omit for a flex-fill column (the
   * "Title"/"Name" column, styled width:100% via the dt-title-fill class). */
  fallbackWidth?: string;
  /** Locked columns (selection checkbox, actions) are always visible, excluded from the
   * picker, and pinned to their original position — never hidden. */
  locked?: boolean;
};

type Prefs = {
  /** Every column's on/off state, key -> visible. Absent key defaults to visible. */
  visible: Record<string, boolean>;
  /** Saved pixel widths, key -> width. */
  widths: Record<string, number>;
};

const EMPTY_PREFS: Prefs = { visible: {}, widths: {} };

function load(key: string): Prefs {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return EMPTY_PREFS;
    const parsed = JSON.parse(raw);
    return { visible: parsed.visible ?? {}, widths: parsed.widths ?? {} };
  } catch {
    return EMPTY_PREFS;
  }
}

function save(key: string, prefs: Prefs) {
  try {
    localStorage.setItem(key, JSON.stringify(prefs));
  } catch {
    // best-effort only — a full/blocked localStorage shouldn't break the table
  }
}

// Single source of truth for a resizable table's column widths and visibility — unifies
// what would otherwise be two separate concerns, because they interact: hiding a column
// changes which columns need a width restored, so both have to be keyed and persisted
// together to stay consistent, and a "reset to default" needs to touch both at once too.
// Column order is fixed by the ColumnDef[] declaration order — not user-customizable.
//
// Column width restoration on reload needs every visible column's width set explicitly
// (not just the one a user last resized): PrimeReact's DataTable renders at width:100% of
// its wrapper, and under table-layout:fixed mixing a flex-fill column (width:100% via
// dt-title-fill) with fixed px/rem siblings makes the browser misallocate space across the
// whole row on reload, when there's no live drag to correct it. onColumnResizeEnd here
// snapshots every rendered header cell's width whenever any one of them is resized.
//
// Usage:
//   const COLUMNS: ColumnDef[] = [
//     { key: 'sel', locked: true },
//     { key: 'code', label: 'Code', fallbackWidth: '7rem' },
//     { key: 'title', label: 'Title' },              // flex-fill, no fallbackWidth
//     { key: 'status', label: 'Status', fallbackWidth: '9rem' },
//     { key: 'actions', locked: true },
//   ];
//   const cp = useColumnPreferences('issues', COLUMNS);
//   <ColumnPickerButton {...cp} />
//   <DataTable tableStyle={cp.tableStyle} resizableColumns columnResizeMode="expand"
//     onColumnResizeEnd={cp.onColumnResizeEnd} ...>
//     {cp.arrange([
//       ['sel', <Column key="sel" selectionMode="multiple" style={{ width: cp.colWidth('sel', '3rem') }} />],
//       ['code', <Column key="code" field="code" header="Code" style={{ width: cp.colWidth('code', '7rem') }} />],
//       ['title', <Column key="title" field="title" header="Title" className="dt-title-fill" style={{ width: cp.colWidth('title') }} />],
//       ['status', <Column key="status" field="status" header="Status" style={{ width: cp.colWidth('status', '9rem') }} />],
//       ['actions', <Column key="actions" columnKey="actions" resizeable={false} .../>],
//     ])}
//   </DataTable>
export function useColumnPreferences(storageKey: string, columns: ColumnDef[]) {
  const key = `table-col-prefs:${storageKey}`;
  const [prefs, setPrefs] = useState<Prefs>(() => load(key));

  useEffect(() => {
    setPrefs(load(key));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const reorderable = useMemo(() => columns.filter((c) => !c.locked), [columns]);
  const orderedKeys = useMemo(() => reorderable.map((c) => c.key), [reorderable]);

  const isVisible = useCallback(
    (colKey: string) => {
      const def = columns.find((c) => c.key === colKey);
      if (def?.locked) return true;
      return prefs.visible[colKey] !== false;
    },
    [prefs.visible, columns],
  );

  const setVisible = useCallback(
    (colKey: string, value: boolean) => {
      setPrefs((prev) => {
        const next = { ...prev, visible: { ...prev.visible, [colKey]: value } };
        save(key, next);
        return next;
      });
    },
    [key],
  );

  const reset = useCallback(() => {
    setPrefs(EMPTY_PREFS);
    try {
      localStorage.removeItem(key);
    } catch {
      // best-effort
    }
  }, [key]);

  const onColumnResizeEnd = useCallback(
    (e: DataTableColumnResizeEndEvent) => {
      const table = e.element.closest('table');
      const headerRow = table?.querySelector('thead tr');
      if (!headerRow) return;
      const headers = Array.from(headerRow.children) as HTMLElement[];
      // Column identity per header cell: PrimeReact exposes the originating <Column>'s
      // props on `e.column`, but only for the ONE column that was actually dragged — the
      // rest are plain DOM <th> elements with no link back to a React key (React keys
      // aren't readable from the DOM). `arrange()` stamps every rendered <Column> with a
      // `dt-colkey-<key>` class via className/headerClassName specifically so identity
      // can be recovered here, straight from the DOM, for every header cell at once.
      const next: Record<string, number> = { ...prefs.widths };
      let changed = false;
      headers.forEach((th) => {
        const match = Array.from(th.classList).find((c) => c.startsWith('dt-colkey-'));
        if (!match) return;
        const colKey = match.slice('dt-colkey-'.length);
        const width = Math.round(th.getBoundingClientRect().width);
        if (width && next[colKey] !== width) {
          next[colKey] = width;
          changed = true;
        }
      });
      if (!changed) return;
      setPrefs((prev) => {
        const merged = { ...prev, widths: next };
        save(key, merged);
        return merged;
      });
    },
    [key, prefs.widths],
  );

  const colWidth = useCallback(
    (colKey: string, fallback?: string): string | undefined => {
      const saved = prefs.widths[colKey];
      if (saved) return `${saved}px`;
      return fallback;
    },
    [prefs.widths],
  );

  // Table needs an explicit min-width once any column's width is pinned, or the browser
  // proportionally compresses every column (including untouched ones) to fit — see
  // useColumnPreferences' module comment / the git history this was ported from for the
  // full explanation.
  const tableStyle = useMemo(() => {
    const visibleKeys = columns.filter((c) => isVisible(c.key)).map((c) => c.key);
    const widthsForVisible = visibleKeys.map((k) => prefs.widths[k]).filter((w): w is number => !!w);
    if (widthsForVisible.length === 0) return undefined;
    const sum = columns
      .filter((c) => isVisible(c.key))
      .reduce((total, c) => total + (prefs.widths[c.key] ?? remOrPxToPx(c.fallbackWidth)), 0);
    return { minWidth: `${sum}px` };
  }, [columns, prefs.widths, isVisible]);

  // Arranges a list of [key, element] pairs into render order, dropping hidden ones, and
  // stamping each rendered Column's header/body cell with a `dt-colkey-<key>` class so
  // onColumnResizeEnd can recover column identity purely from the DOM (see there for why
  // that's necessary).
  //
  // Locked columns (selection checkbox, actions) stay at whatever position they occupy in
  // the INPUT list — arrange() never moves them. Every non-locked slot in the input list
  // is filled, in order, from the user's customized sequence of visible non-locked keys
  // (`orderedKeys` filtered to this table's actual non-locked, visible entries). This
  // lets a locked column sit first, last, or in the middle of `entries` and keep that
  // exact spot regardless of how the user reordered everything else.
  const arrange = useCallback(
    (entries: [string, React.ReactElement<ColumnProps>][]): React.ReactElement[] => {
      const byKey = new Map(entries);
      const lockedKeys = new Set(columns.filter((c) => c.locked).map((c) => c.key));
      const nonLockedInInput = new Set(entries.filter(([k]) => !lockedKeys.has(k)).map(([k]) => k));
      const visibleOrdered = orderedKeys.filter((k) => nonLockedInInput.has(k) && isVisible(k));

      const result: React.ReactElement[] = [];
      let cursor = 0;
      for (const [entryKey, element] of entries) {
        if (lockedKeys.has(entryKey)) {
          result.push(stampColumn(element, entryKey));
          continue;
        }
        const nextKey = visibleOrdered[cursor];
        cursor += 1;
        if (nextKey === undefined) continue; // more input slots than visible columns left
        const nextElement = byKey.get(nextKey);
        if (nextElement) result.push(stampColumn(nextElement, nextKey));
      }
      return result;
    },
    [columns, orderedKeys, isVisible],
  );

  return {
    columns,
    reorderableColumns: reorderable,
    orderedKeys,
    isVisible,
    setVisible,
    order: orderedKeys,
    reset,
    colWidth,
    onColumnResizeEnd,
    tableStyle,
    arrange,
  };
}

function stampColumn(element: React.ReactElement<ColumnProps>, colKey: string): React.ReactElement {
  const existingClass = element.props.className ?? '';
  const existingHeaderClass = element.props.headerClassName ?? '';
  const token = `dt-colkey-${colKey}`;
  return {
    ...element,
    props: {
      ...element.props,
      className: `${existingClass} ${token}`.trim(),
      headerClassName: `${existingHeaderClass} ${token}`.trim(),
    },
  };
}

function remOrPxToPx(value: string | undefined): number {
  if (!value) return 0;
  const remMatch = value.match(/^([\d.]+)rem$/);
  if (remMatch) return parseFloat(remMatch[1]) * 16;
  const pxMatch = value.match(/^([\d.]+)px$/);
  if (pxMatch) return parseFloat(pxMatch[1]);
  return 0;
}
