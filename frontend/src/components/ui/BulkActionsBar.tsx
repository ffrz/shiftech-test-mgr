import type { ReactNode } from 'react';
import { Button } from 'primereact/button';

interface BulkActionsBarProps {
  selectedCount: number;
  onClear: () => void;
  actions: ReactNode;
}

// Slim bar shown above a DataTable only while rows are selected — hosts bulk
// actions (e.g. "Delete Selected") so they don't clutter the table toolbar.
export function BulkActionsBar({ selectedCount, onClear, actions }: BulkActionsBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="flex align-items-center justify-content-between surface-100 border-round px-3 py-2 mb-2">
      <span className="text-sm">{selectedCount} selected</span>
      <div className="flex align-items-center gap-2">
        {actions}
        <Button label="Cancel" text size="small" onClick={onClear} />
      </div>
    </div>
  );
}
