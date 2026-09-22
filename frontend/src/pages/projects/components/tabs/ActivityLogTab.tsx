import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { DataTable, type DataTablePageEvent } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { MultiSelect } from 'primereact/multiselect';
import { Tag } from 'primereact/tag';
import { Button } from 'primereact/button';
import SearchInput from '../../../../components/ui/SearchInput';
import { FilterToolbar } from '../../../../components/ui/FilterToolbar';
import { dataTablePaginatorProps } from '../../../../components/ui/dataTablePaginator';
import { useTableHeight } from '../../../../hooks/useTableHeight';
import { useColumnPreferences, type ColumnDef } from '../../../../hooks/useColumnPreferences';
import { ColumnPickerButton } from '../../../../components/ui/ColumnPickerButton';
import { UserHoverCard } from '../../../../components/ui/UserHoverCard';
import { auditLogService } from '../../../../services/auditLogService';
import { useStoredState } from '../../../../hooks/useStoredState';
import { formatDateTime } from '../../../../helpers/dateFormatter';
import { describeSystemEvent, eventTypeLabel } from '../../../../helpers/activityDescribe';
import { pathForActivityEntity, ACTIVITY_ENTITY_LABEL } from '../../../../helpers/activityRoutes';
import type { AuditLogEntry } from '../../../../repositories/auditLogRepository';
import type { ActivityEntityType } from '../../../../types/domain';

const ENTITY_TYPE_OPTIONS: { label: string; value: ActivityEntityType }[] = [
  { label: 'Issue', value: 'issue' },
  { label: 'Test Case', value: 'test_case' },
  { label: 'Test Plan', value: 'test_plan' },
  { label: 'Test Run', value: 'test_run' },
  { label: 'Project', value: 'project' },
];

const ACTIVITY_LOG_COLUMNS: ColumnDef[] = [
  { key: 'createdAt', label: 'Time', fallbackWidth: '12rem' },
  { key: 'actorName', label: 'User', fallbackWidth: '10rem' },
  { key: 'entityType', label: 'Entity', fallbackWidth: '8rem' },
  { key: 'eventType', label: 'Event', fallbackWidth: '8rem' },
  { key: 'description', label: 'Description' },
];

// Combined activity feed across every Issue/TestCase/TestPlan/TestRun/Project entry in
// this one project — distinct from each entity detail page's own "Activity" tab, which
// only shows that single entity's comments/events. Any project member can see this (same
// has_project_access RLS as the rest of entity_activity), not just managers/owners.
export function ActivityLogTab({ projectId, isMobile, visible, detailCollapsed }: { projectId: string; isMobile: boolean; visible: boolean; detailCollapsed: boolean }) {
  const navigate = useNavigate();

  const [entityTypes, setEntityTypes] = useStoredState<ActivityEntityType[]>(`project-${projectId}:activityLog:entityTypes`, []);
  const [search, setSearch] = useStoredState(`project-${projectId}:activityLog:search`, '');
  const [page, setPage] = useStoredState(`project-${projectId}:activityLog:page`, 1);
  const [rowsPerPage, setRowsPerPage] = useStoredState(`project-${projectId}:activityLog:rowsPerPage`, 20);
  // The persisted `filterVisible` stored state was dropped — the responsive FilterToolbar
  // owns visibility now (hidden on first open on small screens, desktop default otherwise).
  const [filterVisible, setFilterVisible] = useState(!isMobile);
  const { containerRef, tableHeight } = useTableHeight({
    enabled: isMobile,
    deps: [isMobile, visible, detailCollapsed, filterVisible],
  });
  const cp = useColumnPreferences('activityLog', ACTIVITY_LOG_COLUMNS);

  const hasActiveFilters = entityTypes.length > 0 || !!search;

  const { data, isLoading: loading } = useQuery({
    queryKey: ['activityLog', projectId, entityTypes, search, page, rowsPerPage],
    queryFn: () =>
      auditLogService.listByProject(projectId, {
        entityTypes: entityTypes.length ? entityTypes : undefined,
        search: search || undefined,
        page,
        pageSize: rowsPerPage,
      }),
  });

  const entries = data?.data ?? [];
  const totalRecords = data?.total ?? 0;

  function onPage(e: DataTablePageEvent) {
    setPage((e.page ?? 0) + 1);
    if (e.rows) setRowsPerPage(e.rows);
  }

  function resetFilters() {
    setEntityTypes([]);
    setSearch('');
    setPage(1);
  }

  const eventTypeBodyTemplate = (row: AuditLogEntry) => (
    <span title={eventTypeLabel(row.eventType)}>
      <Tag value={eventTypeLabel(row.eventType)} severity={row.eventType === 'comment' ? 'info' : 'secondary'} />
    </span>
  );

  const descriptionBodyTemplate = (row: AuditLogEntry) => (
    <span className="text-sm">
      {row.eventType === 'comment'
        ? (typeof row.payload.body === 'string' ? row.payload.body.slice(0, 120) : '')
        : describeSystemEvent(row)}
    </span>
  );

  const actorBodyTemplate = (row: AuditLogEntry) =>
    row.actorId ? (
      <UserHoverCard userId={row.actorId}>
        <span className="username-text cursor-pointer font-medium" title={row.actorName}>{row.actorName}</span>
      </UserHoverCard>
    ) : (
      <span title={row.actorName}>{row.actorName}</span>
    );

  const mobileBody = (row: AuditLogEntry) => (
    <div className="flex flex-column gap-1">
      <div className="text-sm">
        {row.eventType === 'comment'
          ? (typeof row.payload.body === 'string' ? row.payload.body.slice(0, 120) : '')
          : describeSystemEvent(row)}
      </div>
      <div className="flex gap-1 align-items-center text-sm flex-wrap">
        <Tag value={eventTypeLabel(row.eventType)} severity={row.eventType === 'comment' ? 'info' : 'secondary'} />
        <Tag value={ACTIVITY_ENTITY_LABEL[row.entityType] ?? row.entityType} severity="info" />
      </div>
      <div className="text-sm text-color-secondary">
        {formatDateTime(row.createdAt)}
      </div>
      <div className="text-sm text-color-secondary">
        {row.actorName}
      </div>
    </div>
  );

  return (
    <>
      <FilterToolbar
        secondaryActions={!isMobile && (
          <ColumnPickerButton
            reorderableColumns={cp.reorderableColumns}
            order={cp.order}
            isVisible={cp.isVisible}
            setVisible={cp.setVisible}
            reset={cp.reset}
            canReorder={!isMobile}
            reorderColumn={cp.reorderColumn}
          />
        )}
        onVisibilityChange={setFilterVisible}
      >
        <div className="col-12 md:col-3 p-1">
          <MultiSelect
            value={entityTypes}
            options={ENTITY_TYPE_OPTIONS}
            onChange={(e) => { setEntityTypes(e.value); setPage(1); }}
            placeholder="All Entity Types"
            className="w-full"
            selectAll
            selectAllLabel="All"
          />
        </div>
        <div className="col-12 md:col p-1">
          <div className="flex gap-2">
            <SearchInput
              value={search}
              onChange={(v) => { setSearch(v); setPage(1); }}
              placeholder="Search comments..."
              className="flex-1"
            />
            <Button
              icon="pi pi-refresh"
              outlined
              severity="secondary"
              size="small"
              disabled={!hasActiveFilters}
              onClick={resetFilters}
              tooltip="Reset filters"
              tooltipOptions={{ position: 'bottom' }}
            />
          </div>
        </div>
      </FilterToolbar>

      <div ref={containerRef}>
      <DataTable
        key={isMobile ? 'mobile' : 'desktop'}
        value={entries}
        loading={loading}
        size="small"
        emptyMessage="No activity found"
        lazy
        totalRecords={totalRecords}
        first={(page - 1) * rowsPerPage}
        rows={rowsPerPage}
        rowsPerPageOptions={[10, 20, 50, 100]}
        onPage={onPage}
        {...dataTablePaginatorProps}
        scrollHeight={tableHeight}
        onRowClick={(e) => navigate(pathForActivityEntity((e.data as AuditLogEntry).entityType, (e.data as AuditLogEntry).entityId))}
        rowHover
        className={isMobile ? 'cursor-pointer' : 'cursor-pointer dt-resizable'}
        cellMemo={false}
        resizableColumns={!isMobile}
        columnResizeMode="expand"
        onColumnResizeEnd={cp.onColumnResizeEnd}
        tableStyle={isMobile ? undefined : cp.tableStyle}
      >
        {isMobile
          ? <Column header="Activity" body={mobileBody} />
          : cp.arrange([
            ['createdAt', <Column
              key="createdAt"
              field="createdAt"
              header="Time"
              body={(row: AuditLogEntry) => formatDateTime(row.createdAt)}
              style={{ width: cp.colWidth('createdAt', '12rem') }}
              headerClassName="white-space-nowrap"
            />],
            ['actorName', <Column key="actorName" field="actorName" header="User" body={actorBodyTemplate} style={{ width: cp.colWidth('actorName', '10rem') }} />],
            ['entityType', <Column
              key="entityType"
              field="entityType"
              header="Entity"
              body={(row: AuditLogEntry) => {
                const label = ACTIVITY_ENTITY_LABEL[row.entityType] ?? row.entityType;
                return <span title={label}>{label}</span>;
              }}
              style={{ width: cp.colWidth('entityType', '8rem') }}
            />],
            ['eventType', <Column key="eventType" field="eventType" header="Event" body={eventTypeBodyTemplate} style={{ width: cp.colWidth('eventType', '8rem') }} />],
            ['description', <Column key="description" columnKey="description" header="Description" body={descriptionBodyTemplate} className="dt-title-fill" headerClassName="dt-title-fill" style={{ width: cp.colWidth('description') }} />],
          ])}
      </DataTable>
      </div>
    </>
  );
}
