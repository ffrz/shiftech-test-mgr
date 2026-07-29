import { useRef } from 'react';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';

type ModuleDialogProps = {
  visible: boolean;
  editing: boolean;
  code: string;
  onCodeChange: (value: string) => void;
  name: string;
  onNameChange: (value: string) => void;
  error: string | null;
  onHide: () => void;
  onSave: () => void;
};

export function ModuleDialog({ visible, editing, code, onCodeChange, name, onNameChange, error, onHide, onSave }: ModuleDialogProps) {
  const nameRef = useRef<HTMLInputElement>(null);

  return (
    <Dialog
      header={editing ? 'Edit Module' : 'Add Module'}
      visible={visible}
      onHide={onHide}
      onShow={() => nameRef.current?.focus()}
      style={{ width: '25rem' }}
    >
      <div className="flex flex-column gap-3">
        {error && <small className="p-error">{error}</small>}
        <div className="flex flex-column gap-1">
          <label htmlFor="module-code">Code</label>
          <InputText id="module-code" value={code} onChange={(e) => onCodeChange(e.target.value)} placeholder="Automatic if left empty" />
        </div>
        <div className="flex flex-column gap-1">
          <label htmlFor="module-name">Module Name</label>
          <InputText
            id="module-name"
            ref={nameRef}
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSave();
            }}
            placeholder="ex. Auth, Dashboard"
          />
        </div>
        <Button label="Save" size="small" onClick={onSave} />
      </div>
    </Dialog>
  );
}
