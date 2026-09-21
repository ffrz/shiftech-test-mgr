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
  setOrder: (order: string[]) => void;
  reset: () => void;
};

// Icon button for a resizable DataTable's header (top-right corner) that opens a
// checkbox list of every non-locked column — check/uncheck to show/hide, drag the handle
// to reorder. Pairs with useColumnPreferences, which owns the actual visible/order state
// this just reads and writes; this component has no state of its own beyond which row is
// mid-drag.
//
// Reorder uses plain HTML5 drag-and-drop (draggable + dragstart/dragover/drop) rather
// than a library — the list is always short (a handful of columns), so the native API's
// rough edges (no built-in touch support, no auto-scroll) don't matter here, and it adds
// zero new dependencies.
export function ColumnPickerButton({ reorderableColumns, order, isVisible, setVisible, setOrder, reset }: ColumnPickerButtonProps) {
  const overlayRef = useRef<OverlayPanel>(null);
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);

  const byKey = new Map(reorderableColumns.map((c) => [c.key, c]));
  const orderedColumns = order.map((k) => byKey.get(k)).filter((c): c is ColumnDef => !!c);

  function handleDrop(targetKey: string) {
    if (!dragKey || dragKey === targetKey) {
      setDragKey(null);
      setDragOverKey(null);
      return;
    }
    const fromIndex = order.indexOf(dragKey);
    const toIndex = order.indexOf(targetKey);
    if (fromIndex === -1 || toIndex === -1) return;
    const next = [...order];
    next.splice(fromIndex, 1);
    next.splice(toIndex, 0, dragKey);
    setOrder(next);
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
        aria-label="Show/hide and reorder columns"
        tooltip="Columns"
        tooltipOptions={{ position: 'bottom' }}
        onClick={(e) => overlayRef.current?.toggle(e)}
      />
      <OverlayPanel ref={overlayRef} className="column-picker-panel">
        <div className="flex align-items-center justify-content-between mb-2">
          <span className="font-medium text-sm">Columns</span>
          <Button label="Reset" text size="small" className="p-0" onClick={() => { reset(); }} />
        </div>
        <ul className="column-picker-list">
          {orderedColumns.map((col) => (
            <li
              key={col.key}
              className={`column-picker-item${dragOverKey === col.key ? ' column-picker-item-dragover' : ''}`}
              draggable
              onDragStart={() => setDragKey(col.key)}
              onDragOver={(e) => { e.preventDefault(); setDragOverKey(col.key); }}
              onDragLeave={() => setDragOverKey((k) => (k === col.key ? null : k))}
              onDrop={(e) => { e.preventDefault(); handleDrop(col.key); }}
              onDragEnd={() => { setDragKey(null); setDragOverKey(null); }}
            >
              <i className="pi pi-bars column-picker-handle" aria-hidden="true" />
              <Checkbox
                inputId={`col-picker-${col.key}`}
                checked={isVisible(col.key)}
                onChange={(e) => setVisible(col.key, !!e.checked)}
              />
              <label htmlFor={`col-picker-${col.key}`} className="column-picker-label">{col.label}</label>
            </li>
          ))}
        </ul>
      </OverlayPanel>
    </>
  );
}
