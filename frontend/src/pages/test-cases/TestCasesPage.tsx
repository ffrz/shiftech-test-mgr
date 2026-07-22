import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Tag } from 'primereact/tag';
import { Dropdown } from 'primereact/dropdown';
import { testCaseService } from '../../services/testCaseService';
import { projectService } from '../../services/projectService';
import { queryKeys } from '../../hooks/queryKeys';
import type { TestCaseWithDetails } from '../../types/domain';
import { PageHeader } from '../../components/ui/PageHeader';
import {
  TEST_CASE_PRIORITY_LABEL,
  TEST_CASE_PRIORITY_SEVERITY,
  TEST_CASE_STATUS_LABEL,
  TEST_CASE_STATUS_SEVERITY,
} from '../../helpers/statusLabels';

export function TestCasesPage() {
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

      <DataTable value={testCases} loading={loading} paginator rows={10} emptyMessage="Belum ada test case" size="small">
        <Column field="code" header="Kode" sortable style={{ width: '7rem' }} />
        <Column field="title" header="Judul" sortable />
        <Column field="module.name" header="Module" body={(row: TestCaseWithDetails) => row.module?.name ?? '-'} sortable />
        <Column
          field="priority"
          header="Prioritas"
          body={(row: TestCaseWithDetails) => <Tag value={TEST_CASE_PRIORITY_LABEL[row.priority]} severity={TEST_CASE_PRIORITY_SEVERITY[row.priority]} />}
          sortable
        />
        <Column
          field="status"
          header="Status"
          body={(row: TestCaseWithDetails) => <Tag value={TEST_CASE_STATUS_LABEL[row.status]} severity={TEST_CASE_STATUS_SEVERITY[row.status]} />}
          sortable
        />
      </DataTable>
    </div>
  );
}
