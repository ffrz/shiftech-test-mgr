import { useRef } from 'react';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';

type StartTestRunDialogProps = {
  visible: boolean;
  onHide: () => void;
  name: string;
  onNameChange: (value: string) => void;
  error: string | null;
  onStart: () => void;
};

export function StartTestRunDialog({ visible, onHide, name, onNameChange, error, onStart }: StartTestRunDialogProps) {
  const nameRef = useRef<HTMLInputElement>(null);

  return (
    <Dialog header="Start Test Run" visible={visible} onHide={onHide} onShow={() => nameRef.current?.focus()} style={{ width: '25rem' }}>
      <div className="flex flex-column gap-3">
        <div className="flex flex-column gap-1">
          <label htmlFor="run-name" className={error ? 'p-error' : ''}>Test Run Name</label>
          <InputText id="run-name" ref={nameRef} value={name} onChange={(e) => onNameChange(e.target.value)} className={error ? 'p-invalid' : ''} />
          {error && <small className="p-error">{error}</small>}
        </div>
        <Button label="Start" size="small" onClick={onStart} />
      </div>
    </Dialog>
  );
}
