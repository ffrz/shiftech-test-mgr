import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Tag } from 'primereact/tag';
import { Dropdown } from 'primereact/dropdown';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
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
    toast.current?.show({ severity: 'success', summary: `Status changed to ${TEST_PLAN_STATUS_LABEL[status]}` });
  }

  // --- Duplicate: quick access from this cross-project list without opening the detail page ---
  const [duplicateRow, setDuplicateRow] = useState<TestPlan | null>(null);
  const [duplicateName, setDuplicateName] = useState('');
  const [duplicateError, setDuplicateError] = useState<string | null>(null);

  function openDuplicateDialog(row: TestPlan) {
    setDuplicateRow(row);
    setDuplicateName(`${row.name} (Copy)`);
    setDuplicateError(null);
  }

  async function handleDuplicate() {
    if (!duplicateRow) return;
    setDuplicateError(null);
    try {
      await testPlanService.duplicate(duplicateRow.id, duplicateName);
      setDuplicateRow(null);
      await reload();
      toast.current?.show({ severity: 'success', summary: 'Test plan duplicated' });
    } catch (err) {
      setDuplicateError(err instanceof Error ? err.message : 'Failed to duplicate test plan');
    }
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
            placeholder="Select project"
            className="w-15rem"
            showClear
          />
        }
      />

      {!projectId && (
        <p className="text-color-secondary">
          Select a project above to view its test plans. New test plans are created from the project detail page.
        </p>
      )}

      <DataTable value={testPlans} loading={loading} paginator rows={5} emptyMessage="No test plans yet" size="small"
        selectionMode="single" onSelectionChange={(e) => navigate(`/test-plans/${(e.value as TestPlan).id}`)}>
        <Column field="code" header="Code" sortable style={{ width: '7rem' }} />
        <Column field="name" header="Name" sortable />
        <Column field="status" header="Status" body={(row: TestPlan) => <Tag value={TEST_PLAN_STATUS_LABEL[row.status]} severity={TEST_PLAN_STATUS_SEVERITY[row.status]} />} />
        <Column field="updatedAt" header="Last Updated" body={(row: TestPlan) => formatDate(row.updatedAt)} sortable />
        {canEditContent && (
          <Column
            header=""
            style={{ width: '4rem' }}
            body={(row: TestPlan) => (
              <RowActionsMenu
                items={[
                  { label: 'Duplicate', icon: 'pi pi-copy', command: () => openDuplicateDialog(row) },
                  ...TEST_PLAN_STATUS_OPTIONS.filter((s) => s !== row.status).map((status) => ({
                    label: `Change to ${TEST_PLAN_STATUS_LABEL[status]}`,
                    command: () => handleChangeStatus(row, status),
                  })),
                ]}
              />
            )}
          />
        )}
      </DataTable>

      <Dialog header="Duplicate Test Plan" visible={!!duplicateRow} onHide={() => setDuplicateRow(null)} style={{ width: '28rem' }}>
        <div className="flex flex-column gap-3">
          {duplicateError && <small className="p-error">{duplicateError}</small>}
          <div className="flex flex-column gap-1">
            <label htmlFor="duplicate-plan-name">New Test Plan Name</label>
            <InputText id="duplicate-plan-name" value={duplicateName} onChange={(e) => setDuplicateName(e.target.value)} autoFocus />
          </div>
          <Button label="Duplicate" size="small" onClick={handleDuplicate} />
        </div>
      </Dialog>
    </div>
  );
}
