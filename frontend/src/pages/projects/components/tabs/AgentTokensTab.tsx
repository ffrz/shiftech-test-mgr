import { Button } from 'primereact/button';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Tag } from 'primereact/tag';
import { RowActionsMenu } from '../../../../components/ui/RowActionsMenu';
import { accessLevelForScopes } from '../../../../services/apiTokenService';
import { formatDateTime, formatLastUsedRelative } from '../../../../helpers/dateFormatter';
import type { ApiToken } from '../../../../types/domain';

type AgentTokensTabProps = {
  tokens: ApiToken[];
  isMobile: boolean;
  onMint: () => void;
  onRevoke: (row: ApiToken) => void;
};

function AccessLevelTag({ row }: { row: ApiToken }) {
  const level = accessLevelForScopes(row.scopes);
  return (
    <Tag
      value={level === 'readwrite' ? 'Read & Write' : 'Read Only'}
      severity={level === 'readwrite' ? 'warning' : 'info'}
      title={row.scopes.join(', ')}
    />
  );
}

function LastUsedCell({ row }: { row: ApiToken }) {
  if (!row.lastUsedAt) return <span className="text-color-secondary">Never used</span>;
  return <span title={formatDateTime(row.lastUsedAt)}>{formatLastUsedRelative(row.lastUsedAt)}</span>;
}

export function AgentTokensTab({ tokens, isMobile, onMint, onRevoke }: AgentTokensTabProps) {
  const activeTokens = tokens.filter((t) => !t.revokedAt);

  const mobileBody = (row: ApiToken) => (
    <div className="flex align-items-start justify-content-between gap-2 py-1">
      <div className="flex flex-column gap-2">
        <div className="font-medium">{row.name}</div>
        <div className="text-sm text-color-secondary">{row.tokenPrefix}...</div>
        <AccessLevelTag row={row} />
      </div>
      <RowActionsMenu items={[{ label: 'Revoke', icon: 'pi pi-ban', className: 'p-error', command: () => onRevoke(row) }]} />
    </div>
  );

  return (
    <>
      <p className="text-color-secondary text-sm mb-3">
        Tokens let an AI agent connect to the MCP server and act within this project, at the
        access level granted below. The raw token is shown once at creation — copy it
        immediately.
      </p>
      <div className="flex justify-content-end mb-2">
        <Button label="Generate Agent Token" icon="pi pi-plus" size="small" onClick={onMint} />
      </div>
      <DataTable value={activeTokens} size="small" emptyMessage="No agent tokens yet" dataKey="id">
        {isMobile && <Column header="Token" body={mobileBody} />}
        {!isMobile && <Column header="Name" field="name" />}
        {!isMobile && <Column header="Prefix" body={(row: ApiToken) => `${row.tokenPrefix}...`} />}
        {!isMobile && <Column header="Access" body={(row: ApiToken) => <AccessLevelTag row={row} />} />}
        {!isMobile && (
          <Column
            header="Created"
            body={(row: ApiToken) => new Date(row.createdAt).toLocaleDateString()}
          />
        )}
        {!isMobile && <Column header="Last Used" body={(row: ApiToken) => <LastUsedCell row={row} />} />}
        {!isMobile && (
          <Column
            header=""
            style={{ width: '3.5rem' }}
            body={(row: ApiToken) => (
              <RowActionsMenu items={[{ label: 'Revoke', icon: 'pi pi-ban', className: 'p-error', command: () => onRevoke(row) }]} />
            )}
          />
        )}
      </DataTable>
    </>
  );
}
