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
import { PageHeader } from '../../components/ui/PageHeader';
import {
  TEST_CASE_PRIORITY_LABEL,
  TEST_CASE_PRIORITY_SEVERITY,
  TEST_CASE_STATUS_LABEL,
  TEST_CASE_STATUS_SEVERITY,
} from '../../helpers/statusLabels';

export function TestCasesPage() {
  const navigate = useNavigate();
  const { lt } = useScreenSize();
  const isMobile = lt.sm;
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
      <PageHeader
        title="Test Cases"
        actions={
          <Dropdown
            value={projectId}
            options={projects.map((p) => ({ label: p.name, value: p.id }))}
            onChange={(e) => setProjectId(e.value)}
            placeholder="Pilih project"
            className="w-15rem"
            showClear
          />
        }
      />

      {!projectId && (
        <p className="text-color-secondary">
          Pilih project di atas untuk melihat test case-nya. Test case baru dibuat dari halaman detail project.
        </p>
      )}

      <DataTable value={testCases} loading={loading} paginator rows={5} emptyMessage="Belum ada test case" size="small">
        {isMobile && <Column body={mobileBodyTemplate} />}
        {!isMobile && <Column field="code" header="Kode" sortable style={{ width: '7rem' }} />}
        {!isMobile && <Column field="title" header="Judul" sortable />}
        {!isMobile && <Column field="module.name" header="Module" body={(row: TestCaseWithDetails) => row.module?.name ?? '-'} sortable />}
        {!isMobile && (
          <Column
            field="priority"
            header="Prioritas"
            body={(row: TestCaseWithDetails) => <Tag value={TEST_CASE_PRIORITY_LABEL[row.priority]} severity={TEST_CASE_PRIORITY_SEVERITY[row.priority]} />}
            sortable
          />
        )}
        {!isMobile && (
          <Column
            field="status"
            header="Status"
            body={(row: TestCaseWithDetails) => <Tag value={TEST_CASE_STATUS_LABEL[row.status]} severity={TEST_CASE_STATUS_SEVERITY[row.status]} />}
            sortable
          />
        )}
        <Column header="" style={{ width: '3.5rem' }} body={actionBodyTemplate} />
      </DataTable>
    </div>
  );
}
