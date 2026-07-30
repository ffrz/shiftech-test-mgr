import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { DataTable, type DataTablePageEvent } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { MultiSelect } from 'primereact/multiselect';
import { Tag } from 'primereact/tag';
import { Button } from 'primereact/button';
import SearchInput from '../../../../components/ui/SearchInput';
import { FilterToolbar } from '../../../../components/ui/FilterToolbar';
import { dataTablePaginatorProps } from '../../../../components/ui/dataTablePaginator';
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

// Combined activity feed across every Issue/TestCase/TestPlan/TestRun/Project entry in
// this one project — distinct from each entity detail page's own "Activity" tab, which
// only shows that single entity's comments/events. Any project member can see this (same
// has_project_access RLS as the rest of entity_activity), not just managers/owners.
export function ActivityLogTab({ projectId }: { projectId: string }) {
  const navigate = useNavigate();

  const [entityTypes, setEntityTypes] = useStoredState<ActivityEntityType[]>(`project-${projectId}:activityLog:entityTypes`, []);
  const [search, setSearch] = useStoredState(`project-${projectId}:activityLog:search`, '');
  const [page, setPage] = useStoredState(`project-${projectId}:activityLog:page`, 1);
  const [rowsPerPage, setRowsPerPage] = useStoredState(`project-${projectId}:activityLog:rowsPerPage`, 20);
  const [filterVisible, setFilterVisible] = useStoredState(`project-${projectId}:activityLog:filterVisible`, true);

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
    <Tag value={eventTypeLabel(row.eventType)} severity={row.eventType === 'comment' ? 'info' : 'secondary'} />
  );

  const descriptionBodyTemplate = (row: AuditLogEntry) => (
    <span className="text-sm">
      {row.eventType === 'comment'
        ? (typeof row.payload.body === 'string' ? row.payload.body.slice(0, 120) : '')
        : describeSystemEvent(row)}
    </span>
  );

  return (
    <>
      <FilterToolbar
        filterVisible={filterVisible}
        onToggleFilterVisible={() => setFilterVisible(!filterVisible)}
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

      <DataTable
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
        onRowClick={(e) => navigate(pathForActivityEntity((e.data as AuditLogEntry).entityType, (e.data as AuditLogEntry).entityId))}
        rowHover
        className="cursor-pointer"
      >
        <Column field="createdAt" header="Time" body={(row: AuditLogEntry) => formatDateTime(row.createdAt)} style={{ width: '12rem' }} />
        <Column field="actorName" header="Actor" style={{ width: '10rem' }} />
        <Column
          field="entityType"
          header="Entity"
          body={(row: AuditLogEntry) => ACTIVITY_ENTITY_LABEL[row.entityType] ?? row.entityType}
          style={{ width: '8rem' }}
        />
        <Column field="eventType" header="Event" body={eventTypeBodyTemplate} style={{ width: '8rem' }} />
        <Column header="Description" body={descriptionBodyTemplate} />
      </DataTable>
    </>
  );
}
