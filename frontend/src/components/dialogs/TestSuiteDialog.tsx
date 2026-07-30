import { useEffect, useRef, useState } from 'react';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { CharacterCount } from '../ui/CharacterCount';
import { Dropdown } from 'primereact/dropdown';
import { Button } from 'primereact/button';
import { FloatLabel } from 'primereact/floatlabel';
import type { TestSuiteVisibility } from '../../types/domain';

const VISIBILITY_OPTIONS: { label: string; value: TestSuiteVisibility }[] = [
  { label: 'Private — only invited members', value: 'private' },
  { label: 'Unlisted — anyone with the link can view', value: 'unlisted' },
  { label: 'Public — visible to everyone', value: 'public' },
];

type TestSuiteDialogMode = 'create' | 'edit' | 'duplicate';

type TestSuiteDialogProps = {
  visible: boolean;
  mode: TestSuiteDialogMode;
  initialData?: { name: string; description?: string | null; visibility?: TestSuiteVisibility };
  saving?: boolean;
  onHide: () => void;
  onSave: (data: { name: string; description: string; visibility: TestSuiteVisibility }) => Promise<void>;
};

export function TestSuiteDialog({ visible, mode, initialData, saving, onHide, onSave }: TestSuiteDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<TestSuiteVisibility>('private');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!visible) return;
    setName(initialData?.name ?? '');
    setDescription(initialData?.description ?? '');
    setVisibility(initialData?.visibility ?? 'private');
    setError(null);
    setSubmitting(false);
  }, [visible, initialData]);

  useEffect(() => {
    if (error && nameRef.current) {
      nameRef.current.focus();
      nameRef.current.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
    }
  }, [error]);

  async function handleSave() {
    if (!name.trim()) {
      setError('Name cannot be empty');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await onSave({ name: name.trim(), description: description.trim(), visibility });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSubmitting(false);
    }
  }

  const header = mode === 'edit' ? 'Edit Suite' : mode === 'duplicate' ? 'Duplicate Suite' : 'New Suite';

  return (
    <Dialog header={header} visible={visible} onHide={onHide} style={{ width: '30rem' }}>
      <div className="flex flex-column gap-4">
        <div className="flex flex-column gap-1">
          <FloatLabel className="ifta-field">
            <InputText id="suite-name" ref={nameRef} value={name} onChange={(e) => setName(e.target.value)} className={error ? 'p-invalid w-full' : 'w-full'} autoFocus />
            <label htmlFor="suite-name" className={error ? 'p-error' : ''}>Name</label>
          </FloatLabel>
          {error && <small className="p-error">{error}</small>}
        </div>
        <div className="flex flex-column gap-1">
          <FloatLabel className="ifta-field">
            <InputTextarea id="suite-description" value={description} onChange={(e) => setDescription(e.target.value)} rows={1} autoResize maxLength={1000} className="w-full" />
            <label htmlFor="suite-description">Description</label>
          </FloatLabel>
          <CharacterCount value={description} maxLength={1000} />
        </div>
        {mode !== 'duplicate' && (
          <div className="flex flex-column gap-1">
            <FloatLabel className="ifta-field">
              <Dropdown
                id="suite-visibility"
                value={visibility}
                options={VISIBILITY_OPTIONS}
                onChange={(e) => setVisibility(e.value)}
                className="w-full"
              />
              <label htmlFor="suite-visibility">Visibility</label>
            </FloatLabel>
          </div>
        )}
        <Button label="Save" size="small" onClick={handleSave} loading={submitting || saving} />
      </div>
    </Dialog>
  );
}
