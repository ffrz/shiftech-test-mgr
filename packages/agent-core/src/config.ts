import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

export type AgentProcess = 'runner' | 'mcp';
export type AgentEnvironment = Readonly<Record<string, string | undefined>>;

type EnvRule = {
  readonly processes: readonly AgentProcess[];
  readonly requiredFor?: readonly AgentProcess[];
  readonly validate?: (value: string) => boolean;
  readonly expectation?: string;
};

const positiveInteger = (maximum = Number.MAX_SAFE_INTEGER) => (value: string): boolean => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= maximum;
};
const nonNegativeInteger = (value: string): boolean => Number.isInteger(Number(value)) && Number(value) >= 0;
const booleanValue = (value: string): boolean => ['0', '1', 'true', 'false', 'yes', 'no', 'on', 'off'].includes(value.toLowerCase());

/** The single allow-list and validation schema shared by every local-agent process. */
export const AGENT_ENV_SCHEMA = {
  TM_SUPABASE_URL: { processes: ['runner', 'mcp'], requiredFor: ['runner', 'mcp'] },
  TM_SUPABASE_ANON_KEY: { processes: ['runner', 'mcp'], requiredFor: ['runner', 'mcp'] },
  TM_RUNNER_TOKEN: { processes: ['runner'], requiredFor: ['runner'] },
  TM_RUNNER_NAME: { processes: ['runner'], validate: (value) => value.trim().length <= 120, expectation: 'at most 120 characters' },
  TM_RUNNER_LABELS: { processes: ['runner'] },
  TM_API_TOKEN: { processes: ['mcp'], requiredFor: ['mcp'] },
  TM_PROJECT_ID: { processes: ['mcp'], requiredFor: ['mcp'] },
  TM_SUPABASE_ACCESS_TOKEN: { processes: ['mcp'] },
  TM_PROJECT_DIR: { processes: ['runner'] },
  TM_TRUSTED_REPOSITORIES: { processes: ['runner'] },
  TM_REPOSITORY_CACHE_DIR: { processes: ['runner'] },
  TM_PLAYWRIGHT_CMD: { processes: ['runner'] },
  TM_PLAYWRIGHT_HEADED: { processes: ['runner'], validate: booleanValue, expectation: 'a boolean (0/1, true/false, yes/no, or on/off)' },
  TM_PLAYWRIGHT_SLOW_MO_MS: { processes: ['runner'], validate: nonNegativeInteger, expectation: 'an integer greater than or equal to 0' },
  TM_PLAYWRIGHT_VIEWPORT: { processes: ['runner'], validate: (value) => /^\d+x\d+$/.test(value), expectation: 'WIDTHxHEIGHT' },
  TM_PLAYWRIGHT_DEVICE_PROFILE: { processes: ['runner'] },
  TM_POLL_INTERVAL_SECONDS: { processes: ['runner'], validate: positiveInteger(), expectation: 'a positive integer' },
  TM_HEARTBEAT_INTERVAL_SECONDS: { processes: ['runner', 'mcp'], validate: positiveInteger(86_400), expectation: 'an integer between 1 and 86400' },
  TM_JOB_TIMEOUT_SECONDS: { processes: ['runner'], validate: positiveInteger(), expectation: 'a positive integer' },
  TM_ARTIFACT_DIR: { processes: ['runner'] },
  TM_ARTIFACT_UPLOAD: { processes: ['runner'], validate: booleanValue, expectation: 'a boolean (0/1, true/false, yes/no, or on/off)' },
  TM_PAUSE_ON_FAILURE: { processes: ['runner'], validate: booleanValue, expectation: 'a boolean (0/1, true/false, yes/no, or on/off)' },
  TM_STEP_CONTROL_CHANNEL: { processes: ['runner'], validate: (value) => value === 'stdin-jsonl', expectation: 'stdin-jsonl' },
  TM_MCP_READONLY: { processes: ['mcp'], validate: (value) => value === '0' || value === '1', expectation: '0 or 1' },
  TM_MCP_TRANSPORT: { processes: ['mcp'], validate: (value) => value === 'stdio' || value === 'http', expectation: 'stdio or http' },
  TM_MCP_HTTP_HOST: { processes: ['mcp'] },
  TM_MCP_HTTP_PORT: { processes: ['mcp'], validate: positiveInteger(65_535), expectation: 'an integer between 1 and 65535' },
  TM_MCP_RATE_LIMIT: { processes: ['mcp'], validate: positiveInteger(10_000), expectation: 'an integer between 1 and 10000' },
  TM_MCP_RATE_LIMIT_WINDOW_SECONDS: { processes: ['mcp'], validate: positiveInteger(86_400), expectation: 'an integer between 1 and 86400' },
  TM_MCP_RERUN_FAILED_MAX_TESTS: { processes: ['mcp'], validate: positiveInteger(500), expectation: 'an integer between 1 and 500' },
  TM_MCP_REPOSITORY_CACHE_DIR: { processes: ['mcp'] },
} as const satisfies Record<string, EnvRule>;

export function validateAgentEnv(env: AgentEnvironment, process: AgentProcess, requireProcessValues = true): void {
  const unknown = Object.keys(env).filter((name) => name.startsWith('TM_') && !(name in AGENT_ENV_SCHEMA));
  if (unknown.length > 0) throw new Error(`Unknown TestManager environment variable${unknown.length > 1 ? 's' : ''}: ${unknown.sort().join(', ')}`);

  for (const [name, rule] of Object.entries(AGENT_ENV_SCHEMA) as [keyof typeof AGENT_ENV_SCHEMA, EnvRule][]) {
    const value = env[name]?.trim();
    if (requireProcessValues && rule.requiredFor?.includes(process) && !value) throw new Error(`Environment variable ${name} is required for ${process}`);
    if (value && rule.validate && !rule.validate(value)) throw new Error(`Environment variable ${name} must be ${rule.expectation}`);
  }
}

function readDotEnv(path: string): Record<string, string> {
  if (!existsSync(path)) return {};
  if (process.platform !== 'win32' && (statSync(path).mode & 0o077) !== 0) {
    throw new Error(`Agent config must be private (chmod 600): ${path}`);
  }
  const result: Record<string, string> = {};
  for (const raw of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const separator = line.indexOf('=');
    if (separator < 1) throw new Error(`Invalid environment entry in ${path}: expected NAME=value`);
    const name = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    result[name] = value;
  }
  return result;
}

export interface LoadAgentEnvOptions {
  readonly process: AgentProcess;
  readonly env?: AgentEnvironment;
  readonly envPath?: string;
  /** Interactive runner commands do not contact the server, but still validate supplied values. */
  readonly requireProcessValues?: boolean;
}

/** Loads optional dotenv values, applies process env precedence, then validates once. */
export function loadAgentEnv(options: LoadAgentEnvOptions): Record<string, string | undefined> {
  const source = options.env ?? process.env;
  const fileValues = options.envPath ? readDotEnv(resolve(options.envPath)) : {};
  const loaded = { ...fileValues, ...source };
  validateAgentEnv(loaded, options.process, options.requireProcessValues ?? true);
  return loaded;
}
