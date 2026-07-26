import { useEffect, useRef } from 'react';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';

type QuickAddDialogProps = {
  visible: boolean;
  title: string;
  label: string;
  placeholder?: string;
  showCode?: boolean;
  codeValue?: string;
  onCodeChange?: (value: string) => void;
  name: string;
  onNameChange: (value: string) => void;
  error?: string | null;
  onHide: () => void;
  onSave: () => void;
};

export function QuickAddDialog({
  visible,
  title,
  label,
  placeholder,
  showCode,
  codeValue,
  onCodeChange,
  name,
  onNameChange,
  error,
  onHide,
  onSave,
}: QuickAddDialogProps) {
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (error && nameRef.current) {
      nameRef.current.focus();
      nameRef.current.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
    }
  }, [error]);

  return (
    <Dialog header={title} visible={visible} onHide={onHide} onShow={() => nameRef.current?.focus()} style={{ width: '25rem' }}>
      <div className="flex flex-column gap-3">
        {showCode && (
          <div className="flex flex-column gap-1">
            <label htmlFor="quick-add-code">Code</label>
            <InputText
              id="quick-add-code"
              value={codeValue ?? ''}
              onChange={(e) => onCodeChange?.(e.target.value)}
              placeholder="Automatic if left empty"
            />
          </div>
        )}
        <div className="flex flex-column gap-1">
          <label htmlFor="quick-add-name" className={error ? 'p-error' : ''}>{label}</label>
          <InputText
            id="quick-add-name"
            ref={nameRef}
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            className={error ? 'p-invalid' : ''}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSave();
            }}
            placeholder={placeholder}
          />
          {error && <small className="p-error">{error}</small>}
        </div>
        <Button label="Save" size="small" onClick={onSave} />
      </div>
    </Dialog>
  );
}
