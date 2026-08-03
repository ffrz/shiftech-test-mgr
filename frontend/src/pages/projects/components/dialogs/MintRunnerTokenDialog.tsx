import { useState } from 'react';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { FloatLabel } from 'primereact/floatlabel';
import { Message } from 'primereact/message';
import { toastHelper } from '../../../../helpers/toast';

type MintRunnerTokenDialogProps = {
  visible: boolean;
  onHide: () => void;
  onMint: (name: string, labels: string[]) => Promise<{ token: string } | null>;
};

export function MintRunnerTokenDialog({ visible, onHide, onMint }: MintRunnerTokenDialogProps) {
  const [name, setName] = useState('');
  const [labelsInput, setLabelsInput] = useState('local, playwright');
  const [error, setError] = useState<string | null>(null);
  const [mintedToken, setMintedToken] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setName('');
    setLabelsInput('local, playwright');
    setError(null);
    setMintedToken(null);
    setSubmitting(false);
  }

  function handleHide() {
    reset();
    onHide();
  }

  async function handleSubmit() {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const labels = labelsInput.split(',').map((l) => l.trim()).filter(Boolean);
      const result = await onMint(name.trim(), labels);
      if (result) setMintedToken(result.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create runner');
    } finally {
      setSubmitting(false);
    }
  }

  function copyToken() {
    if (!mintedToken) return;
    navigator.clipboard.writeText(mintedToken);
    toastHelper.success('Copied to clipboard');
  }

  return (
    <Dialog header="Create Runner" visible={visible} onHide={handleHide} style={{ width: '32rem' }}>
      {mintedToken ? (
        <div className="flex flex-column gap-3">
          <Message severity="warn" text="Copy this token now — it will not be shown again." />
          <div className="flex gap-2">
            <InputText value={mintedToken} readOnly className="w-full font-mono text-sm" />
            <Button icon="pi pi-copy" onClick={copyToken} tooltip="Copy raw token" />
          </div>
          <p className="text-color-secondary text-sm m-0">
            Put this in the runner's <code>.env</code> as <code>TM_RUNNER_TOKEN</code>, along
            with <code>TM_SUPABASE_URL</code> and <code>TM_SUPABASE_ANON_KEY</code> (same
            values this app uses), then run <code>npm start</code> from <code>runner/</code>.
          </p>
          <Button label="Done" size="small" onClick={handleHide} />
        </div>
      ) : (
        <div className="flex flex-column gap-2">
          {error && <small className="p-error">{error}</small>}
          <div className="flex flex-column">
            <FloatLabel className="ifta-field">
              <InputText id="runner-name" value={name} onChange={(e) => setName(e.target.value)} className="w-full" />
              <label htmlFor="runner-name">Name (e.g. "My Laptop")</label>
            </FloatLabel>
          </div>
          <div className="flex flex-column">
            <FloatLabel className="ifta-field">
              <InputText id="runner-labels" value={labelsInput} onChange={(e) => setLabelsInput(e.target.value)} className="w-full" />
              <label htmlFor="runner-labels">Labels, comma-separated (e.g. "local, chromium")</label>
            </FloatLabel>
          </div>
          <Button label="Create" size="small" onClick={handleSubmit} loading={submitting} />
        </div>
      )}
    </Dialog>
  );
}
