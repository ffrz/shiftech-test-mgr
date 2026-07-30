import { useEffect, useRef } from 'react';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { CharacterCount } from '../ui/CharacterCount';
import { Dropdown } from 'primereact/dropdown';
import { Button } from 'primereact/button';
import { FloatLabel } from 'primereact/floatlabel';
import type { TestPlanStatus } from '../../types/domain';
import { TEST_PLAN_STATUS_LABEL } from '../../helpers/statusLabels';

type TestPlanDialogProps = {
  visible: boolean;
  editing: boolean;
  code: string;
  onCodeChange: (value: string) => void;
  name: string;
  onNameChange: (value: string) => void;
  description: string;
  onDescriptionChange: (value: string) => void;
  status: TestPlanStatus;
  onStatusChange: (value: TestPlanStatus) => void;
  error: string | null;
  onHide: () => void;
  onSave: () => void;
};

const STATUS_OPTIONS: { label: string; value: TestPlanStatus }[] = (
  ['draft', 'active', 'completed', 'archived'] as const
).map((v) => ({ label: TEST_PLAN_STATUS_LABEL[v], value: v }));

export function TestPlanDialog({
  visible,
  editing,
  code,
  onCodeChange,
  name,
  onNameChange,
  description,
  onDescriptionChange,
  status,
  onStatusChange,
  error,
  onHide,
  onSave,
}: TestPlanDialogProps) {
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (error && nameRef.current) {
      nameRef.current.focus();
      nameRef.current.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
    }
  }, [error]);

  return (
    <Dialog header={editing ? 'Edit Test Plan' : 'New Test Plan'} visible={visible} onHide={onHide} style={{ width: '30rem' }}>
      <div className="flex flex-column gap-2">
        <div className="flex flex-column">
          <FloatLabel className="ifta-field">
            <InputText id="plan-code" value={code} onChange={(e) => onCodeChange(e.target.value)} className="w-full" />
            <label htmlFor="plan-code">Code (automatic if empty)</label>
          </FloatLabel>
        </div>
        <div className="flex flex-column gap-1">
          <FloatLabel className="ifta-field">
            <InputText id="plan-name" ref={nameRef} value={name} onChange={(e) => onNameChange(e.target.value)} className={error ? 'p-invalid w-full' : 'w-full'} autoFocus />
            <label htmlFor="plan-name" className={error ? 'p-error' : ''}>Name</label>
          </FloatLabel>
          {error && <small className="p-error">{error}</small>}
        </div>
        <div className="flex flex-column gap-1">
          <FloatLabel className="ifta-field">
            <InputTextarea id="plan-description" value={description} onChange={(e) => onDescriptionChange(e.target.value)} rows={1} autoResize maxLength={1000} className="w-full" />
            <label htmlFor="plan-description">Description</label>
          </FloatLabel>
          <CharacterCount value={description} maxLength={1000} />
        </div>
        {editing && (
          <div className="flex flex-column">
            <FloatLabel className="ifta-field">
              <Dropdown id="plan-status" value={status} options={STATUS_OPTIONS} onChange={(e) => onStatusChange(e.value)} className="w-full" />
              <label htmlFor="plan-status">Status</label>
            </FloatLabel>
          </div>
        )}
        <Button label="Save" size="small" onClick={onSave} />
      </div>
    </Dialog>
  );
}
