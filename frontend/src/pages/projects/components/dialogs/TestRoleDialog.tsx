import { useRef } from 'react';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { FloatLabel } from 'primereact/floatlabel';

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
      <div className="flex flex-column gap-2">
        {error && <small className="p-error">{error}</small>}
        <div className="flex flex-column">
          <FloatLabel className="ifta-field">
            <InputText
              id="test-role-name"
              ref={nameRef}
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onSave();
              }}
              className="w-full"
            />
            <label htmlFor="test-role-name">Role Name (ex. Admin, Manager, Member)</label>
          </FloatLabel>
        </div>
        <Button label="Save" size="small" onClick={onSave} />
      </div>
    </Dialog>
  );
}
