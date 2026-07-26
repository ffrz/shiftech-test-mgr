import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';

type DuplicateTestPlanDialogProps = {
  visible: boolean;
  name: string;
  onNameChange: (value: string) => void;
  error: string | null;
  onHide: () => void;
  onDuplicate: () => void;
};

export function DuplicateTestPlanDialog({ visible, name, onNameChange, error, onHide, onDuplicate }: DuplicateTestPlanDialogProps) {
  return (
    <Dialog header="Duplicate Test Plan" visible={visible} onHide={onHide} style={{ width: '28rem' }}>
      <div className="flex flex-column gap-3">
        {error && <small className="p-error">{error}</small>}
        <div className="flex flex-column gap-1">
          <label htmlFor="duplicate-plan-name">Test Plan Name</label>
          <InputText id="duplicate-plan-name" value={name} onChange={(e) => onNameChange(e.target.value)} autoFocus />
        </div>
        <Button label="Duplicate" size="small" onClick={onDuplicate} />
      </div>
    </Dialog>
  );
}
