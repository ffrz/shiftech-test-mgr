export const LOCAL_AGENT_NAME = 'testmanager-agent' as const;
export const LOCAL_AGENT_VERSION = '0.1.0' as const;

export type AgentProcess = 'runner' | 'mcp';

/** Shared wire format emitted by every TestManager local-agent process. */
export interface AgentHeartbeatPayload {
  readonly agent: typeof LOCAL_AGENT_NAME;
  readonly version: typeof LOCAL_AGENT_VERSION;
  readonly process: AgentProcess;
  readonly capabilities: readonly string[];
  readonly runtime?: { readonly os: string; readonly startedAt: string; readonly scriptRefs?: readonly string[] };
}

export function createAgentHeartbeat(
  process: AgentProcess,
  capabilities: readonly string[],
  runtime?: AgentHeartbeatPayload['runtime'],
): AgentHeartbeatPayload {
  return {
    agent: LOCAL_AGENT_NAME,
    version: LOCAL_AGENT_VERSION,
    process,
    capabilities: [...capabilities].sort(),
    ...(runtime ? { runtime } : {}),
  };
}
