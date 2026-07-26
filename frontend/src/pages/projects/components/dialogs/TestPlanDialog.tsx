import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Button } from 'primereact/button';

type TestPlanDialogProps = {
  visible: boolean;
  editing: boolean;
  code: string;
  onCodeChange: (value: string) => void;
  name: string;
  onNameChange: (value: string) => void;
  description: string;
  onDescriptionChange: (value: string) => void;
  error: string | null;
  onHide: () => void;
  onSave: () => void;
};

export function TestPlanDialog({
  visible,
  editing,
  code,
  onCodeChange,
  name,
  onNameChange,
  description,
  onDescriptionChange,
  error,
  onHide,
  onSave,
}: TestPlanDialogProps) {
  return (
    <Dialog header={editing ? 'Edit Test Plan' : 'New Test Plan'} visible={visible} onHide={onHide} style={{ width: '30rem' }}>
      <div className="flex flex-column gap-3">
        <div className="flex flex-column gap-1">
          <label htmlFor="plan-code">Code</label>
          <InputText id="plan-code" value={code} onChange={(e) => onCodeChange(e.target.value)} placeholder="Automatic if left empty" />
        </div>
        <div className="flex flex-column gap-1">
          <label htmlFor="plan-name" className={error ? 'p-error' : ''}>Name</label>
          <InputText id="plan-name" value={name} onChange={(e) => onNameChange(e.target.value)} className={error ? 'p-invalid' : ''} autoFocus />
        </div>
        <div className="flex flex-column gap-1">
          <label htmlFor="plan-description">Description</label>
          <InputTextarea id="plan-description" value={description} onChange={(e) => onDescriptionChange(e.target.value)} rows={3} />
        </div>
        {error && <small className="p-error">{error}</small>}
        <Button label="Save" size="small" onClick={onSave} />
      </div>
    </Dialog>
  );
}
