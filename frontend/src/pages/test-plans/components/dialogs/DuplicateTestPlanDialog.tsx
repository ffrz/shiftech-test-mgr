import { useRef } from 'react';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { FloatLabel } from 'primereact/floatlabel';

type DuplicateTestPlanDialogProps = {
  visible: boolean;
  onHide: () => void;
  name: string;
  onNameChange: (value: string) => void;
  error: string | null;
  onDuplicate: () => void;
};

export function DuplicateTestPlanDialog({ visible, onHide, name, onNameChange, error, onDuplicate }: DuplicateTestPlanDialogProps) {
  const nameRef = useRef<HTMLInputElement>(null);

  return (
    <Dialog header="Duplicate Test Plan" visible={visible} onHide={onHide} onShow={() => nameRef.current?.focus()} style={{ width: '28rem' }}>
      <div className="flex flex-column gap-2">
        <div className="flex flex-column gap-1">
          <FloatLabel className="ifta-field">
            <InputText id="duplicate-plan-name" ref={nameRef} value={name} onChange={(e) => onNameChange(e.target.value)} className={error ? 'p-invalid w-full' : 'w-full'} />
            <label htmlFor="duplicate-plan-name" className={error ? 'p-error' : ''}>New Test Plan Name</label>
          </FloatLabel>
          {error && <small className="p-error">{error}</small>}
        </div>
        <Button label="Duplicate" size="small" onClick={onDuplicate} />
      </div>
    </Dialog>
  );
}
