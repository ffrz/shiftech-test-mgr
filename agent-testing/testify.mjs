#!/usr/bin/env node
// Thin MCP client for Testify testing agents. This file intentionally knows
// nothing about Supabase URLs, keys, tables, or PostgREST.
//
// Required env:
//   TESTIFY_MCP_URL=https://your-testify-host/mcp
//   TESTIFY_API_TOKEN=tm_<64 hex>
//   TESTIFY_PROJECT_ID=<project uuid>

const MCP_URL = required('TESTIFY_MCP_URL');
const API_TOKEN = required('TESTIFY_API_TOKEN');
const PROJECT_ID = required('TESTIFY_PROJECT_ID');

let requestId = 0;
let sessionId = '';

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function parseResponse(text) {
  if (!text.trim()) return null;
  if (text.trimStart().startsWith('{')) return JSON.parse(text);
  const data = text
    .split(/\r?\n/)
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trim())
    .filter(Boolean)
    .at(-1);
  return data ? JSON.parse(data) : null;
}

async function rpc(method, params, notification = false) {
  const body = { jsonrpc: '2.0', method };
  if (!notification) body.id = ++requestId;
  if (params !== undefined) body.params = params;
  const headers = {
    Authorization: `Bearer ${API_TOKEN}`,
    'X-Testify-Project-Id': PROJECT_ID,
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream',
  };
  if (sessionId) headers['Mcp-Session-Id'] = sessionId;
  const response = await fetch(MCP_URL, { method: 'POST', headers, body: JSON.stringify(body) });
  const text = await response.text();
  if (!response.ok) throw new Error(`${method} failed ${response.status}: ${text}`);
  sessionId ||= response.headers.get('mcp-session-id') ?? '';
  const payload = parseResponse(text);
  if (payload?.error) throw new Error(`${method}: ${payload.error.message}`);
  return payload?.result ?? null;
}

async function initialize() {
  await rpc('initialize', {
    protocolVersion: '2025-03-26',
    capabilities: {},
    clientInfo: { name: 'testify-testing-agent', version: '1.0.0' },
  });
  if (!sessionId) throw new Error('MCP server did not return Mcp-Session-Id');
  await rpc('notifications/initialized', undefined, true);
}

async function callTool(name, args = {}) {
  const result = await rpc('tools/call', { name, arguments: args });
  if (result?.isError) {
    const message = result.content?.map((item) => item.text).filter(Boolean).join('\n') || 'tool call failed';
    throw new Error(`${name}: ${message}`);
  }
  return result?.structuredContent ?? result?.content ?? result;
}

const commands = {
  projects: () => callTool('testify.project.list'),
  plans: ([projectId]) => {
    assertProject(projectId);
    return callTool('testify.testplan.list');
  },
  cases: ([planId]) => callTool('testify.testplan.execution_context', { testplan_id: planId }),
  start: ([projectId, planId, ...nameParts]) => {
    assertProject(projectId);
    return callTool('testify.testrun.create', {
      project_id: PROJECT_ID,
      testplan_id: planId,
      name: nameParts.join(' ') || `Agent run ${new Date().toISOString().slice(0, 16)}`,
    });
  },
  async results([runId]) {
    const [run, steps] = await Promise.all([
      callTool('testify.testrun.summary', { testrun_id: runId }),
      callTool('testify.testresult.steps', { testrun_id: runId }),
    ]);
    return { run, steps };
  },
  step: ([stepResultId, status, ...actual]) =>
    callTool('testify.testresult.recordStep', {
      step_result_id: stepResultId,
      status,
      actual_result: actual.join(' ') || undefined,
    }),
  record: ([resultId, status, ...notes]) =>
    callTool('testify.testrun.recordResult', {
      result_id: resultId,
      status,
      notes: notes.join(' ') || undefined,
    }),
  complete: ([runId]) => callTool('testify.testrun.complete', { testrun_id: runId }),
  call: ([toolName, json = '{}']) => callTool(toolName, JSON.parse(json)),
};

function assertProject(value) {
  if (value && value !== PROJECT_ID) throw new Error('project id does not match TESTIFY_PROJECT_ID');
}

const [command, ...args] = process.argv.slice(2);
if (!commands[command]) {
  console.error(`commands: ${Object.keys(commands).join(', ')}`);
  process.exit(1);
}

try {
  await initialize();
  console.log(JSON.stringify(await commands[command](args), null, 2));
} catch (error) {
  console.error(String(error?.message ?? error));
  process.exit(1);
}
