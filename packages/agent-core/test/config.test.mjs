import assert from 'node:assert/strict';
import test from 'node:test';
import { loadAgentEnv, validateAgentEnv } from '../dist/index.js';

const runnerEnv = { TM_SUPABASE_URL: 'https://example.test', TM_SUPABASE_ANON_KEY: 'anon', TM_RUNNER_TOKEN: 'token' };
const mcpEnv = { TM_SUPABASE_URL: 'https://example.test', TM_SUPABASE_ANON_KEY: 'anon', TM_API_TOKEN: 'token', TM_PROJECT_ID: 'project' };

test('shared validator accepts runner and MCP environments from one schema', () => {
  assert.doesNotThrow(() => validateAgentEnv(runnerEnv, 'runner'));
  assert.doesNotThrow(() => validateAgentEnv(mcpEnv, 'mcp'));
});

test('shared validator rejects unknown TM_ variables with their names', () => {
  assert.throws(() => validateAgentEnv({ ...runnerEnv, TM_RUNER_TOKEN: 'typo' }, 'runner'), /Unknown TestManager environment variable: TM_RUNER_TOKEN/);
});

test('shared validator rejects invalid known values clearly', () => {
  assert.throws(() => loadAgentEnv({ process: 'mcp', env: { ...mcpEnv, TM_MCP_HTTP_PORT: '70000' } }), /TM_MCP_HTTP_PORT must be an integer between 1 and 65535/);
});
