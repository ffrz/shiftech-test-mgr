import { useRef } from 'react';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { FloatLabel } from 'primereact/floatlabel';

type TagDialogProps = {
  visible: boolean;
  editing: boolean;
  name: string;
  onNameChange: (value: string) => void;
  error: string | null;
  onHide: () => void;
  onSave: () => void;
};

export function TagDialog({ visible, editing, name, onNameChange, error, onHide, onSave }: TagDialogProps) {
  const nameRef = useRef<HTMLInputElement>(null);

  return (
    <Dialog
      header={editing ? 'Edit Tag' : 'Tag Baru'}
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
              id="tag-name"
              ref={nameRef}
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onSave();
              }}
              className="w-full"
            />
            <label htmlFor="tag-name">Nama Tag</label>
          </FloatLabel>
        </div>
        <Button label="Save" size="small" onClick={onSave} />
      </div>
    </Dialog>
  );
}
