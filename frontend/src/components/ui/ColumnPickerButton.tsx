import { useRef, useState } from 'react';
import { Button } from 'primereact/button';
import { OverlayPanel } from 'primereact/overlaypanel';
import { Checkbox } from 'primereact/checkbox';
import type { ColumnDef } from '../../hooks/useColumnPreferences';

type ColumnPickerButtonProps = {
  reorderableColumns: ColumnDef[];
  order: string[];
  isVisible: (key: string) => boolean;
  setVisible: (key: string, value: boolean) => void;
  reset: () => void;
  /** Drag-to-reorder is desktop-only (mirrors the amanah-pos-dev reference) — pass
   * `!isMobile` from the caller. When false, the list renders without drag handles and
   * dragging is disabled entirely. */
  canReorder?: boolean;
  reorderColumn?: (draggedKey: string, targetKey: string) => void;
  /** Sort-by section — optional; omitted entirely when the table has no sortable
   * columns. Mirrors the table's own onSort so picking a field/direction here stays in
   * sync with clicking a column header. */
  sortableColumns?: ColumnDef[];
  sortField?: string;
  sortOrder?: 1 | -1;
  onSortFieldChange?: (field: string) => void;
  onSortOrderChange?: (order: 1 | -1) => void;
};

// Icon button for a resizable DataTable's header (top-right corner, currently placed in
// the empty actions-column header) that opens a checkbox list of every non-locked column
// — check/uncheck to show/hide, drag the handle to reorder (desktop only) — followed by
// an optional "sort by" section. Pairs with useColumnPreferences, which owns the actual
// visible/order state this just reads and writes.
//
// UI/UX ported from amanah-pos-dev's TableColumnControl.vue (Quasar q-menu + q-list),
// per an explicit request to match that pattern.
export function ColumnPickerButton({
  reorderableColumns,
  order,
  isVisible,
  setVisible,
  reset,
  canReorder = false,
  reorderColumn,
  sortableColumns = [],
  sortField,
  sortOrder,
  onSortFieldChange,
  onSortOrderChange,
}: ColumnPickerButtonProps) {
  const overlayRef = useRef<OverlayPanel>(null);
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);

  const byKey = new Map(reorderableColumns.map((c) => [c.key, c]));
  const orderedColumns = order.map((k) => byKey.get(k)).filter((c): c is ColumnDef => !!c);

  function handleDrop(targetKey: string) {
    if (dragKey && dragKey !== targetKey) {
      reorderColumn?.(dragKey, targetKey);
    }
    setDragKey(null);
    setDragOverKey(null);
  }

  return (
    <>
      <Button
        icon="pi pi-sliders-h"
        text
        rounded
        severity="secondary"
        size="small"
        aria-label="Show/hide columns"
        tooltip="Columns"
        tooltipOptions={{ position: 'bottom' }}
        onClick={(e) => overlayRef.current?.toggle(e)}
      />
      <OverlayPanel ref={overlayRef} className="column-picker-panel">
        {orderedColumns.length > 0 && (
          <>
            <div className="column-picker-section-label">Show columns</div>
            <ul className="column-picker-list">
              {orderedColumns.map((col) => (
                <li
                  key={col.key}
                  className={`column-picker-item${dragOverKey === col.key ? ' column-picker-item-dragover' : ''}`}
                  draggable={canReorder}
                  onDragStart={() => canReorder && setDragKey(col.key)}
                  onDragOver={(e) => { if (canReorder) { e.preventDefault(); setDragOverKey(col.key); } }}
                  onDragLeave={() => setDragOverKey((k) => (k === col.key ? null : k))}
                  onDrop={(e) => { if (canReorder) { e.preventDefault(); handleDrop(col.key); } }}
                  onDragEnd={() => { setDragKey(null); setDragOverKey(null); }}
                >
                  {canReorder && <i className="pi pi-bars column-picker-handle" aria-hidden="true" />}
                  <Checkbox
                    inputId={`col-picker-${col.key}`}
                    checked={isVisible(col.key)}
                    onChange={(e) => setVisible(col.key, !!e.checked)}
                  />
                  <label htmlFor={`col-picker-${col.key}`} className="column-picker-label">{col.label}</label>
                </li>
              ))}
            </ul>
          </>
        )}

        {sortableColumns.length > 0 && (
          <>
            {orderedColumns.length > 0 && <div className="column-picker-separator" />}
            <div className="column-picker-section-label">Sort by</div>
            <ul className="column-picker-list">
              {sortableColumns.map((col) => (
                <li
                  key={col.key}
                  className="column-picker-item column-picker-item-clickable"
                  onClick={() => col.sortField && onSortFieldChange?.(col.sortField)}
                >
                  <i className={`pi pi-check column-picker-check ${sortField === col.sortField ? 'column-picker-check-active' : ''}`} aria-hidden="true" />
                  <span className="column-picker-label">{col.label}</span>
                </li>
              ))}
            </ul>
            <div className="column-picker-separator" />
            <ul className="column-picker-list">
              <li className="column-picker-item column-picker-item-clickable" onClick={() => onSortOrderChange?.(1)}>
                <i className={`pi pi-check column-picker-check ${sortOrder === 1 ? 'column-picker-check-active' : ''}`} aria-hidden="true" />
                <span className="column-picker-label">Ascending</span>
              </li>
              <li className="column-picker-item column-picker-item-clickable" onClick={() => onSortOrderChange?.(-1)}>
                <i className={`pi pi-check column-picker-check ${sortOrder === -1 ? 'column-picker-check-active' : ''}`} aria-hidden="true" />
                <span className="column-picker-label">Descending</span>
              </li>
            </ul>
          </>
        )}

        <div className="column-picker-footer">
          <Button label="Reset" text size="small" className="p-0" onClick={() => { reset(); }} />
        </div>
      </OverlayPanel>
    </>
  );
}
