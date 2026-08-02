import type { TokenAccessLevel } from '../services/apiTokenService';

// Generates a copy-paste prompt a user can hand to their AI coding agent so the agent
// configures its own MCP connection to backend/mcp-server/cmd-http — no manual JSON config
// editing required from the user. Deliberately stops once the connection is ready to use;
// it does NOT tell the agent what to do with it (e.g. "list and work Issues") — that's the
// user's next prompt, not part of setup. See backend/RUNNING.md "Skenario: agen AI menarik
// & mengerjakan Issue suatu project" for the connect-then-work flow this feeds into.
//
// Different agents configure remote MCP servers differently enough (CLI command vs. editing
// a JSON config file) that a single generic instruction risks being unusable — so the caller
// picks a target and gets exact, agent-appropriate steps instead of a guess.
export type McpAgentTarget = 'claude-code' | 'opencode' | 'generic';

export const MCP_AGENT_TARGET_OPTIONS: { label: string; value: McpAgentTarget }[] = [
  { label: 'Claude Code', value: 'claude-code' },
  { label: 'opencode', value: 'opencode' },
  { label: 'Other / not sure', value: 'generic' },
];

type PromptParams = {
  serverUrl: string;
  token: string;
  projectId: string;
  projectName: string;
  accessLevel: TokenAccessLevel;
  target: McpAgentTarget;
};

function setupSteps(params: PromptParams): string {
  const { serverUrl, token, projectId, target } = params;

  if (target === 'claude-code') {
    return `Register this as an MCP server using the Claude Code CLI:
claude mcp add --scope local --transport http --header "Authorization: Bearer ${token}" --header "X-Testify-Project-Id: ${projectId}" testify ${serverUrl}
After that, the testify.* tools should be available to you directly — no further setup needed.`;
  }

  if (target === 'opencode') {
    return `Add this server to the "mcp" object in your opencode.json config (create the file at the project root if it doesn't exist yet, or merge into the existing "mcp" object if it does):
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "testify": {
      "type": "remote",
      "url": "${serverUrl}",
      "enabled": true,
      "headers": {
        "Authorization": "Bearer ${token}",
        "X-Testify-Project-Id": "${projectId}"
      }
    }
  }
}
After saving the file, the testify.* tools should be available to you directly — no further setup needed.`;
  }

  return `If you have a built-in way to register a remote MCP server with custom headers (e.g. an "mcp add" command, or a config file you can edit), use that with the connection details above.

Otherwise, verify the connection manually as MCP JSON-RPC over HTTP — it's a two-step session: send an "initialize" request and capture the "Mcp-Session-Id" response header, then include that header on every following request along with the Authorization/X-Testify-Project-Id headers above. Example:
curl -s -i -X POST ${serverUrl} -H "Content-Type: application/json" -H "Accept: application/json, text/event-stream" -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"agent","version":"0.0.1"}}}'
(capture Mcp-Session-Id from the response headers, then reuse it on subsequent calls, e.g. "tools/list")`;
}

export function buildMcpSetupPrompt(params: PromptParams): string {
  const { serverUrl, token, projectId, projectName, accessLevel } = params;
  const accessNote = accessLevel === 'readwrite'
    ? 'This token can read and write (e.g. update Issue status).'
    : 'This token is read-only — it can list/inspect data but cannot create or update anything in Testify.';

  return `Please configure yourself to use the Testify MCP server for the project "${projectName}" (id: ${projectId}). It's a StreamableHTTP MCP server exposing Testing/Issue tracking tools (testify.*).

Connection details:
- MCP endpoint: ${serverUrl}
- Authorization header: Bearer ${token}
- Required header: X-Testify-Project-Id: ${projectId}
- ${accessNote}

${setupSteps(params)}

Once connected, just confirm the connection works (e.g. list the available testify.* tools) and wait for further instructions — don't take any action in the project yet.`;
}
