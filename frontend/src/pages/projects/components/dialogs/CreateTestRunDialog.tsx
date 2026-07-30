import { useEffect, useRef } from 'react';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { MultiSelect } from 'primereact/multiselect';
import { SelectButton } from 'primereact/selectbutton';
import { Button } from 'primereact/button';
import { FloatLabel } from 'primereact/floatlabel';
import type { TestPlan, TestCaseWithDetails } from '../../../../types/domain';

type CreateTestRunDialogProps = {
  visible: boolean;
  mode: 'plan' | 'custom';
  onModeChange: (value: 'plan' | 'custom') => void;
  name: string;
  onNameChange: (value: string) => void;
  planId: string | null;
  onPlanIdChange: (value: string | null) => void;
  caseIds: string[];
  onCaseIdsChange: (value: string[]) => void;
  error: string | null;
  testPlans: TestPlan[];
  testCases: TestCaseWithDetails[];
  onHide: () => void;
  onCreate: () => void;
};

export function CreateTestRunDialog({
  visible,
  mode,
  onModeChange,
  name,
  onNameChange,
  planId,
  onPlanIdChange,
  caseIds,
  onCaseIdsChange,
  error,
  testPlans,
  testCases,
  onHide,
  onCreate,
}: CreateTestRunDialogProps) {
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (error && nameRef.current) {
      nameRef.current.focus();
      nameRef.current.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
    }
  }, [error]);

  return (
    <Dialog header="Create Test Run" visible={visible} onHide={onHide} style={{ width: '32rem' }}>
      <div className="flex flex-column gap-2">
        <SelectButton
          value={mode}
          onChange={(e) => e.value && onModeChange(e.value)}
          options={[
            { label: 'From Test Plan', value: 'plan' },
            { label: 'Unplanned / Custom', value: 'custom' },
          ]}
        />
        <div className="flex flex-column gap-1">
          <FloatLabel className="ifta-field">
            <InputText id="run-name" ref={nameRef} value={name} onChange={(e) => onNameChange(e.target.value)} className={error ? 'p-invalid w-full' : 'w-full'} autoFocus />
            <label htmlFor="run-name" className={error ? 'p-error' : ''}>Name</label>
          </FloatLabel>
          {error && <small className="p-error">{error}</small>}
        </div>
        {mode === 'plan' ? (
          <div className="flex flex-column">
            <FloatLabel className="ifta-field">
              <Dropdown
                id="run-plan"
                value={planId}
                options={testPlans.map((p) => ({ label: `${p.code} — ${p.name}`, value: p.id }))}
                onChange={(e) => onPlanIdChange(e.value)}
                className="w-full"
                filter
              />
              <label htmlFor="run-plan">Test Plan</label>
            </FloatLabel>
          </div>
        ) : (
          <div className="flex flex-column">
            <FloatLabel className="ifta-field">
              <MultiSelect
                id="run-cases"
                value={caseIds}
                options={testCases.filter((c) => c.status === 'active').map((c) => ({ label: `${c.code} — ${c.title}`, value: c.id }))}
                onChange={(e) => onCaseIdsChange(e.value)}
                filter
                display="chip"
                className="w-full"
              />
              <label htmlFor="run-cases">Test Case</label>
            </FloatLabel>
          </div>
        )}
        <Button label="Create" size="small" onClick={onCreate} />
      </div>
    </Dialog>
  );
}
