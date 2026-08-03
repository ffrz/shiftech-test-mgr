import { Button } from 'primereact/button';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Tag } from 'primereact/tag';
import { runnerStatus } from '../../../../services/automationRunnerService';
import type { AutomationRunner } from '../../../../types/domain';

type AutomationRunnersTabProps = {
  runners: AutomationRunner[];
  isMobile: boolean;
  onMint: () => void;
};

function StatusTag({ row }: { row: AutomationRunner }) {
  const status = runnerStatus(row);
  return <Tag value={status === 'online' ? 'Online' : 'Offline'} severity={status === 'online' ? 'success' : 'secondary'} />;
}

export function AutomationRunnersTab({ runners, isMobile, onMint }: AutomationRunnersTabProps) {
  const mobileBody = (row: AutomationRunner) => (
    <div className="flex align-items-start justify-content-between gap-2 py-1">
      <div className="flex flex-column gap-2">
        <div className="font-medium">{row.name}</div>
        <div className="text-sm text-color-secondary">{row.tokenPrefix}...</div>
        <StatusTag row={row} />
      </div>
    </div>
  );

  return (
    <>
      <p className="text-color-secondary text-sm mb-3">
        A Playwright Local Runner installed on a tester machine or on-prem server polls for
        automation jobs and executes them locally. Generate a token here, then follow the
        setup steps in <code>runner/README.md</code> — the raw token is shown once, copy it
        immediately.
      </p>
      <div className="flex justify-content-end mb-2">
        <Button label="Create Runner" icon="pi pi-plus" size="small" onClick={onMint} />
      </div>
      <DataTable value={runners} size="small" emptyMessage="No runners registered yet" dataKey="id">
        {isMobile && <Column header="Runner" body={mobileBody} />}
        {!isMobile && <Column header="Name" field="name" />}
        {!isMobile && <Column header="Prefix" body={(row: AutomationRunner) => `${row.tokenPrefix}...`} />}
        {!isMobile && <Column header="Labels" body={(row: AutomationRunner) => row.labels.join(', ') || '—'} />}
        {!isMobile && <Column header="Status" body={(row: AutomationRunner) => <StatusTag row={row} />} />}
        {!isMobile && (
          <Column
            header="Last Seen"
            body={(row: AutomationRunner) => (row.lastSeenAt ? new Date(row.lastSeenAt).toLocaleString() : 'Never')}
          />
        )}
      </DataTable>
    </>
  );
}
