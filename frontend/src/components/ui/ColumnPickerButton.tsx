import { useRef } from 'react';
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
};

// Icon button for a resizable DataTable's header (top-right corner) that opens a
// checkbox list of every non-locked column — check/uncheck to show/hide. Pairs with
// useColumnPreferences, which owns the actual visible state this just reads and writes.
export function ColumnPickerButton({ reorderableColumns, order, isVisible, setVisible, reset }: ColumnPickerButtonProps) {
  const overlayRef = useRef<OverlayPanel>(null);

  const byKey = new Map(reorderableColumns.map((c) => [c.key, c]));
  const orderedColumns = order.map((k) => byKey.get(k)).filter((c): c is ColumnDef => !!c);

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
        <div className="flex align-items-center justify-content-between mb-2">
          <span className="font-medium text-sm">Columns</span>
          <Button label="Reset" text size="small" className="p-0" onClick={() => { reset(); }} />
        </div>
        <ul className="column-picker-list">
          {orderedColumns.map((col) => (
            <li key={col.key} className="column-picker-item">
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
