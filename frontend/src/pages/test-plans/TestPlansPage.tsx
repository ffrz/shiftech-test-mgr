import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Tag } from 'primereact/tag';
import { Dropdown } from 'primereact/dropdown';
import { Toast } from 'primereact/toast';
import { useTestPlans } from '../../hooks/useTestPlans';
import { useProjectRole } from '../../hooks/useProjectRole';
import { projectService } from '../../services/projectService';
import { testPlanService } from '../../services/testPlanService';
import { queryKeys } from '../../hooks/queryKeys';
import type { TestPlan, TestPlanStatus } from '../../types/domain';
import { formatDate } from '../../helpers/dateFormatter';
import { PageHeader } from '../../components/ui/PageHeader';
import { RowActionsMenu } from '../../components/ui/RowActionsMenu';
import { TEST_PLAN_STATUS_LABEL, TEST_PLAN_STATUS_SEVERITY } from '../../helpers/statusLabels';

const TEST_PLAN_STATUS_OPTIONS: TestPlanStatus[] = ['draft', 'active', 'completed', 'archived'];

export function TestPlansPage() {
  const navigate = useNavigate();
  const toast = useRef<Toast>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const { testPlans, loading, reload } = useTestPlans(projectId);
  const { canEditContent } = useProjectRole(projectId ?? undefined);

  const { data: projects = [] } = useQuery({
    queryKey: queryKeys.projects(),
    queryFn: () => projectService.list(),
  });

  async function handleChangeStatus(row: TestPlan, status: TestPlanStatus) {
    if (status === row.status) return;
    await testPlanService.changeStatus(row.id, status);
    await reload();
    toast.current?.show({ severity: 'success', summary: `Status diubah ke ${TEST_PLAN_STATUS_LABEL[status]}` });
  }

  return (
    <div>
      <Toast ref={toast} />
      <PageHeader
        title="Test Plans"
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
          Pilih project di atas untuk melihat test plan-nya. Test plan baru dibuat dari halaman detail project.
        </p>
      )}

      <DataTable value={testPlans} loading={loading} paginator rows={10} emptyMessage="Belum ada test plan" size="small"
        selectionMode="single" onSelectionChange={(e) => navigate(`/test-plans/${(e.value as TestPlan).id}`)}>
        <Column field="code" header="Kode" sortable style={{ width: '7rem' }} />
        <Column field="name" header="Nama" sortable />
        <Column field="status" header="Status" body={(row: TestPlan) => <Tag value={TEST_PLAN_STATUS_LABEL[row.status]} severity={TEST_PLAN_STATUS_SEVERITY[row.status]} />} />
        <Column field="updatedAt" header="Update Terakhir" body={(row: TestPlan) => formatDate(row.updatedAt)} sortable />
        {canEditContent && (
          <Column
            header=""
            style={{ width: '4rem' }}
            body={(row: TestPlan) => (
              <RowActionsMenu
                items={TEST_PLAN_STATUS_OPTIONS.filter((s) => s !== row.status).map((status) => ({
                  label: `Ubah ke ${TEST_PLAN_STATUS_LABEL[status]}`,
                  command: () => handleChangeStatus(row, status),
                }))}
              />
            )}
          />
        )}
      </DataTable>
    </div>
  );
}
