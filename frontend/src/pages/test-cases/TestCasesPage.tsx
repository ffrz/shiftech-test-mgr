import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Tag } from 'primereact/tag';
import { Dropdown } from 'primereact/dropdown';
import { Button } from 'primereact/button';
import { testCaseService } from '../../services/testCaseService';
import { projectService } from '../../services/projectService';
import { queryKeys } from '../../hooks/queryKeys';
import { useScreenSize } from '../../hooks/useScreenSize';
import type { TestCaseWithDetails } from '../../types/domain';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import { PageHeader } from '../../components/ui/PageHeader';
import { dataTablePaginatorProps } from '../../components/ui/dataTablePaginator';
import { useTableHeight } from '../../hooks/useTableHeight';
import { useColumnPreferences, type ColumnDef } from '../../hooks/useColumnPreferences';
import { ColumnPickerButton } from '../../components/ui/ColumnPickerButton';
import {
  TEST_CASE_PRIORITY_LABEL,
  TEST_CASE_PRIORITY_SEVERITY,
  TEST_CASE_STATUS_LABEL,
  TEST_CASE_STATUS_SEVERITY,
} from '../../helpers/statusLabels';

const TEST_CASES_PAGE_COLUMNS: ColumnDef[] = [
  { key: 'code', label: 'Code', fallbackWidth: '7rem' },
  { key: 'title', label: 'Title' },
  { key: 'module.name', label: 'Module', fallbackWidth: '10rem' },
  { key: 'priority', label: 'Priority', fallbackWidth: '8rem' },
  { key: 'status', label: 'Status', fallbackWidth: '8rem' },
  { key: 'actions', label: 'Actions', locked: true },
];

export function TestCasesPage() {
  const navigate = useNavigate();
  const { lt } = useScreenSize();
  const isMobile = lt.sm;

  const { containerRef, tableHeight } = useTableHeight({ enabled: isMobile, deps: [isMobile] });
  const cp = useColumnPreferences('testCasesCrossProject', TEST_CASES_PAGE_COLUMNS);

  const [projectId, setProjectId] = useState<string | null>(null);

  const { data: projects = [] } = useQuery({
    queryKey: queryKeys.projects(),
    queryFn: () => projectService.list(),
  });

  const { data: testCases = [], isLoading: loading } = useQuery({
    queryKey: queryKeys.testCasesWithDetails(projectId ?? ''),
    queryFn: () => testCaseService.listByProjectWithDetails(projectId!),
    enabled: !!projectId,
  });

  const mobileBodyTemplate = useCallback((row: TestCaseWithDetails) => (
    <div className="flex flex-column gap-2 py-1">
      <span className="font-bold">{row.code}</span>
      <span className="text-sm text-color-secondary">{row.title}</span>
      <span className="text-sm text-color-secondary">{row.module?.name ?? '-'}</span>
      <span className="text-sm text-color-secondary">
        <Tag value={TEST_CASE_PRIORITY_LABEL[row.priority]} severity={TEST_CASE_PRIORITY_SEVERITY[row.priority]} />
      </span>
      <span className="text-sm text-color-secondary">
        <Tag value={TEST_CASE_STATUS_LABEL[row.status]} severity={TEST_CASE_STATUS_SEVERITY[row.status]} />
      </span>
    </div>
  ), []);

  const actionBodyTemplate = useCallback((row: TestCaseWithDetails) => (
    <Button
      icon="pi pi-eye"
      text
      rounded
      size="small"
      onClick={(e) => {
        e.stopPropagation();
        navigate(`/test-cases/${row.id}`);
      }}
    />
  ), [navigate]);

  return (
    <div>
      <Breadcrumb items={[{ label: 'Test Cases' }]} />
      <PageHeader
        title="Test Cases"
        actions={
          <div className="flex align-items-center gap-2">
            <Dropdown
              value={projectId}
              options={projects.map((p) => ({ label: p.name, value: p.id }))}
              onChange={(e) => setProjectId(e.value)}
              placeholder="Select project"
              className="w-15rem"
              showClear
            />
          </div>
        }
      />

      {!projectId && (
        <p className="text-color-secondary">
          Select a project above to view its test cases. New test cases are created from the project detail page.
        </p>
      )}

      <div ref={containerRef}>
        <DataTable value={testCases} loading={loading} {...dataTablePaginatorProps} scrollHeight={tableHeight} rows={10} rowsPerPageOptions={[5, 10, 25, 50]} emptyMessage="No test cases yet" size="small"
          resizableColumns={!isMobile} columnResizeMode="expand" onColumnResizeEnd={cp.onColumnResizeEnd} tableStyle={isMobile ? undefined : cp.tableStyle} className={isMobile ? undefined : 'dt-resizable'}>
        {isMobile && <Column body={mobileBodyTemplate} />}
        {!isMobile && cp.arrange([
        ['code', <Column key="code" field="code" header="Code" sortable style={{ width: cp.colWidth('code', '7rem') }} className="dt-code-nowrap" headerClassName="dt-code-nowrap" />],
        ['title', <Column key="title" field="title" header="Title" sortable className="dt-title-fill" headerClassName="dt-title-fill" style={{ width: cp.colWidth('title') }} />],
        ['module.name', <Column key="module.name" field="module.name" header="Module" style={{ width: cp.colWidth('module.name', '10rem') }} body={(row: TestCaseWithDetails) => row.module?.name ?? '-'} sortable />],
        ['priority', <Column
          key="priority"
          field="priority"
          header="Priority"
          style={{ width: cp.colWidth('priority', '8rem') }}
          body={(row: TestCaseWithDetails) => <Tag value={TEST_CASE_PRIORITY_LABEL[row.priority]} severity={TEST_CASE_PRIORITY_SEVERITY[row.priority]} />}
          sortable
        />],
        ['status', <Column
          key="status"
          field="status"
          header="Status"
          style={{ width: cp.colWidth('status', '8rem') }}
          body={(row: TestCaseWithDetails) => <Tag value={TEST_CASE_STATUS_LABEL[row.status]} severity={TEST_CASE_STATUS_SEVERITY[row.status]} />}
          sortable
        />],
        ['actions', <Column
          key="actions"
          columnKey="actions"
          header={(
            <ColumnPickerButton
              reorderableColumns={cp.reorderableColumns}
              order={cp.order}
              isVisible={cp.isVisible}
              setVisible={cp.setVisible}
              reset={cp.reset}
            />
          )}
          resizeable={false}
          className="dt-col-actions"
          headerClassName="dt-col-actions"
          style={{ width: '3.5rem', minWidth: '3.5rem' }}
          body={actionBodyTemplate}
        />],
        ])}
      </DataTable>
      </div>
    </div>
  );
}
