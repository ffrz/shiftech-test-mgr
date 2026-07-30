import type { ReactNode } from 'react';
import { Button } from 'primereact/button';

interface BulkActionsBarProps {
  selectedCount: number;
  onClear: () => void;
  actions: ReactNode;
}

// Slim bar shown above a DataTable only while rows are selected — hosts bulk
// actions (e.g. "Delete Selected") so they don't clutter the table toolbar.
//
// Actions sit on the left, right under the selection checkboxes the user just clicked —
// not on the far right, which would force a long reach across the table on every bulk
// operation. Count + Cancel stay on the right as a fixed anchor. This is the one place to
// change that layout for all 9 tables that use this component (Issue/TestCase/TestPlan/
// TestRun/Member/Module/Tag/TestRole/PlanTestCases) — see ROADMAP_V2 Phase 8 T08.
export function BulkActionsBar({ selectedCount, onClear, actions }: BulkActionsBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="flex align-items-center justify-content-between flex-wrap gap-2 surface-100 border-round py-2 mb-2">
      <div className="flex align-items-center gap-2 flex-wrap">
        {actions}
        <Button label="Cancel" size="small" severity="secondary" text onClick={onClear} />
      </div>
      <div className="flex align-items-center gap-2 flex-shrink-0">
        <span className="text-sm text-color-secondary">{selectedCount} selected</span>
      </div>
    </div>
  );
}
