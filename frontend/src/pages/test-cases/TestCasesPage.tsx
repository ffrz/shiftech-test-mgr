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
            placeholder="Select project"
            className="w-15rem"
            showClear
          />
        }
      />

      {!projectId && (
        <p className="text-color-secondary">
          Select a project above to view its test cases. New test cases are created from the project detail page.
        </p>
      )}

      <DataTable value={testCases} loading={loading} paginator rows={5} emptyMessage="No test cases yet" size="small">
        <Column field="code" header="Code" sortable style={{ width: '7rem' }} />
        <Column field="title" header="Title" sortable />
        <Column field="module.name" header="Module" body={(row: TestCaseWithDetails) => row.module?.name ?? '-'} sortable />
        <Column
          field="priority"
          header="Priority"
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
