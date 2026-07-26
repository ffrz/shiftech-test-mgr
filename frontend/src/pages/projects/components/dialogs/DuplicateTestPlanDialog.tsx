import { useEffect, useRef } from 'react';
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
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (error && nameRef.current) {
      nameRef.current.focus();
      nameRef.current.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
    }
  }, [error]);

  return (
    <Dialog header="Duplicate Test Plan" visible={visible} onHide={onHide} style={{ width: '28rem' }}>
      <div className="flex flex-column gap-3">
        <div className="flex flex-column gap-1">
          <label htmlFor="duplicate-plan-name" className={error ? 'p-error' : ''}>Test Plan Name</label>
          <InputText id="duplicate-plan-name" ref={nameRef} value={name} onChange={(e) => onNameChange(e.target.value)} className={error ? 'p-invalid' : ''} autoFocus />
          {error && <small className="p-error">{error}</small>}
        </div>
        <Button label="Duplicate" size="small" onClick={onDuplicate} />
      </div>
    </Dialog>
  );
}
