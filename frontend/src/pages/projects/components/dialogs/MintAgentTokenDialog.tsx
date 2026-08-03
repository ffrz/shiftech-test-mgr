import { useState } from 'react';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { Button } from 'primereact/button';
import { FloatLabel } from 'primereact/floatlabel';
import { Message } from 'primereact/message';
import { toastHelper } from '../../../../helpers/toast';
import { buildMcpSetupPrompt, buildUsagePromptStarters, MCP_AGENT_TARGET_OPTIONS, type McpAgentTarget } from '../../../../helpers/mcpSetupPrompt';
import type { TokenAccessLevel } from '../../../../services/apiTokenService';

const ACCESS_LEVEL_OPTIONS: { label: string; value: TokenAccessLevel }[] = [
  { label: 'Read Only', value: 'readonly' },
  { label: 'Read & Write', value: 'readwrite' },
];

const MCP_SERVER_URL = import.meta.env.VITE_MCP_SERVER_URL as string | undefined;

type MintAgentTokenDialogProps = {
  visible: boolean;
  projectId: string;
  projectName: string;
  onHide: () => void;
  onMint: (name: string, level: TokenAccessLevel) => Promise<{ token: string } | null>;
};

export function MintAgentTokenDialog({ visible, projectId, projectName, onHide, onMint }: MintAgentTokenDialogProps) {
  const [name, setName] = useState('');
  const [accessLevel, setAccessLevel] = useState<TokenAccessLevel>('readwrite');
  const [error, setError] = useState<string | null>(null);
  const [mintedToken, setMintedToken] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [agentTarget, setAgentTarget] = useState<McpAgentTarget>('claude-code');

  function reset() {
    setName('');
    setAccessLevel('readwrite');
    setError(null);
    setMintedToken(null);
    setSubmitting(false);
    setAgentTarget('claude-code');
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
      const result = await onMint(name.trim(), accessLevel);
      if (result) setMintedToken(result.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate token');
    } finally {
      setSubmitting(false);
    }
  }

  function copyToken() {
    if (!mintedToken) return;
    navigator.clipboard.writeText(mintedToken);
    toastHelper.success('Copied to clipboard');
  }

  function copySetupPrompt() {
    if (!mintedToken) return;
    const prompt = buildMcpSetupPrompt({
      serverUrl: MCP_SERVER_URL ?? '<ask your project owner for the MCP server URL>',
      token: mintedToken,
      projectId,
      projectName,
      accessLevel,
      target: agentTarget,
    });
    navigator.clipboard.writeText(prompt);
    toastHelper.success('Setup prompt copied — paste it to your AI agent');
  }

  function copyUsageStarter(starter: { id: string; label: string; prompt: string }) {
    navigator.clipboard.writeText(starter.prompt);
    toastHelper.success('Prompt copied — paste it into the agent chat');
  }

  const usageStarters = mintedToken
    ? buildUsagePromptStarters({ projectName, projectId, accessLevel })
    : [];

  return (
    <Dialog header="Generate Agent Token" visible={visible} onHide={handleHide} style={{ width: '32rem' }}>
      {mintedToken ? (
        <div className="flex flex-column gap-3">
          <Message
            severity="warn"
            text="Copy this token now — it will not be shown again."
          />
          <div className="flex gap-2">
            <InputText value={mintedToken} readOnly className="w-full font-mono text-sm" />
            <Button icon="pi pi-copy" onClick={copyToken} tooltip="Copy raw token" />
          </div>
          <div className="flex flex-column gap-2">
            <p className="text-color-secondary text-sm m-0">
              Easiest way to connect an AI agent: pick which agent you're using, then copy the
              setup prompt and paste it directly into its chat. It will configure the
              connection itself.
            </p>
            <div className="flex flex-column">
              <FloatLabel className="ifta-field">
                <Dropdown
                  id="agent-target"
                  value={agentTarget}
                  options={MCP_AGENT_TARGET_OPTIONS}
                  onChange={(e) => setAgentTarget(e.value)}
                  className="w-full"
                />
                <label htmlFor="agent-target">Target Agent</label>
              </FloatLabel>
            </div>
            <Button label="Copy Setup Prompt" icon="pi pi-copy" size="small" outlined onClick={copySetupPrompt} />
          </div>
          <div className="flex flex-column gap-2">
            <p className="text-color-secondary text-sm m-0">
              <strong>Usage starters</strong> — after the connection works, paste one of these
              into the agent chat to get started right away.
            </p>
            {usageStarters.map((starter) => (
              <div key={starter.id} className="flex align-items-center justify-content-between gap-2">
                <span className="text-sm">{starter.label}</span>
                <Button icon="pi pi-copy" size="small" text tooltip="Copy prompt" onClick={() => copyUsageStarter(starter)} />
              </div>
            ))}
          </div>
          <Button label="Done" size="small" onClick={handleHide} />
        </div>
      ) : (
        <div className="flex flex-column gap-2">
          {error && <small className="p-error">{error}</small>}
          <p className="text-color-secondary text-sm mt-0 mb-1">
            The agent gets the same project access as your own account, at the access level you
            pick below — it can never do more than you can.
          </p>
          <div className="flex flex-column">
            <FloatLabel className="ifta-field">
              <InputText id="token-name" value={name} onChange={(e) => setName(e.target.value)} className="w-full" />
              <label htmlFor="token-name">Name (e.g. "coding-agent")</label>
            </FloatLabel>
          </div>
          <div className="flex flex-column">
            <FloatLabel className="ifta-field">
              <Dropdown
                id="token-access-level"
                value={accessLevel}
                options={ACCESS_LEVEL_OPTIONS}
                onChange={(e) => setAccessLevel(e.value)}
                className="w-full"
              />
              <label htmlFor="token-access-level">Access Level</label>
            </FloatLabel>
          </div>
          <Button label="Generate" size="small" onClick={handleSubmit} loading={submitting} />
        </div>
      )}
    </Dialog>
  );
}
