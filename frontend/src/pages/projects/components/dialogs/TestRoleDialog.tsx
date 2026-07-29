import { useRef } from 'react';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';

type TestRoleDialogProps = {
  visible: boolean;
  editing: boolean;
  name: string;
  onNameChange: (value: string) => void;
  error: string | null;
  onHide: () => void;
  onSave: () => void;
};

export function TestRoleDialog({ visible, editing, name, onNameChange, error, onHide, onSave }: TestRoleDialogProps) {
  const nameRef = useRef<HTMLInputElement>(null);

  return (
    <Dialog
      header={editing ? 'Edit Role' : 'Add Test Role'}
      visible={visible}
      onHide={onHide}
      onShow={() => nameRef.current?.focus()}
      style={{ width: '25rem' }}
    >
      <div className="flex flex-column gap-3">
        {error && <small className="p-error">{error}</small>}
        <div className="flex flex-column gap-1">
          <label htmlFor="test-role-name">Role Name</label>
          <InputText
            id="test-role-name"
            ref={nameRef}
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSave();
            }}
            placeholder="ex. Admin, Manager, Member"
          />
        </div>
        <Button label="Save" size="small" onClick={onSave} />
      </div>
    </Dialog>
  );
}
