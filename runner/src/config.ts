import { isAbsolute, resolve } from 'node:path';
import { loadAgentEnv } from '@testmanager/agent-core';
import { parseAllowedPlaywrightCommand, registerEnvironmentSecrets, registerSecret } from './security.js';
import { loadTrustedRepositories } from './trustStore.js';

export interface RunnerConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  runnerToken: string;
  projectDir: string;
  repositoryCacheDir: string;
  playwrightCmd: string;
  trustedRepositories: string[];
  headed: boolean;
  slowMoMs: number;
  pollIntervalMs: number;
  heartbeatIntervalMs: number;
  jobTimeoutMs: number;
  artifactDir: string;
  artifactUpload: boolean;
}

export interface RunnerCliOptions {
  headed?: boolean;
  slowMoMs?: number;
}

export type RunnerCommand = 'start' | 'ui' | 'debug' | 'watch' | 'codegen' | 'sync' | 'init' | 'trust';

export interface RunnerCliInput {
  command: RunnerCommand;
  options: RunnerCliOptions;
  playwrightArgs: string[];
  codegenUrl?: string;
  initCode?: string;
  trustPath?: string;
}

export interface InteractiveRunnerConfig {
  projectDir: string;
  playwrightCmd: string;
  trustedRepositories: string[];
}

function intEnv(env: NodeJS.ProcessEnv, name: string, fallback: number): number {
  const value = env[name];
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function nonNegativeIntEnv(env: NodeJS.ProcessEnv, name: string, fallback: number): number {
  const value = env[name];
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function boolEnv(env: NodeJS.ProcessEnv, name: string, fallback: boolean): boolean {
  const value = env[name]?.trim().toLowerCase();
  if (!value) return fallback;
  if (['1', 'true', 'yes', 'on'].includes(value)) return true;
  if (['0', 'false', 'no', 'off'].includes(value)) return false;
  return fallback;
}

export function parseCliOptions(args: string[]): RunnerCliOptions {
  const options: RunnerCliOptions = {};
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === '--headed') {
      options.headed = true;
      continue;
    }
    if (argument === '--slow-mo' || argument?.startsWith('--slow-mo=')) {
      const raw = argument === '--slow-mo' ? args[++index] : argument.slice('--slow-mo='.length);
      const value = Number(raw);
      if (!raw || !Number.isInteger(value) || value < 0) {
        throw new Error('--slow-mo harus berupa integer milidetik >= 0');
      }
      options.slowMoMs = value;
      options.headed = true;
      continue;
    }
    throw new Error(`Unknown runner option: ${argument}`);
  }
  return options;
}

export function parseCliInput(args: string[]): RunnerCliInput {
  const command = args[0];
  if (command === 'trust') {
    if (args.length > 2) throw new Error('Usage: runner trust [repository-path]');
    return { command, options: {}, playwrightArgs: [], trustPath: args[1]?.trim() || process.cwd() };
  }
  if (command === 'init') {
    const code = args[1] === '--code' ? args[2]?.trim() : undefined;
    if (!code || args.length !== 3) throw new Error('Usage: runner init --code <CODE>');
    return { command, options: {}, playwrightArgs: [], initCode: code };
  }
  if (command === 'sync') {
    if (args.length > 1) throw new Error('Usage: runner sync');
    return { command, options: {}, playwrightArgs: [] };
  }
  if (command === 'codegen') {
    const url = args[1]?.trim();
    if (!url || args.length > 2) throw new Error('Usage: runner codegen <url>');
    try {
      const parsed = new URL(url);
      if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error();
    } catch {
      throw new Error('URL codegen harus berupa URL HTTP(S) yang valid');
    }
    return { command, options: {}, playwrightArgs: [], codegenUrl: url };
  }
  if (command === 'ui' || command === 'debug' || command === 'watch') {
    return { command, options: {}, playwrightArgs: args.slice(1) };
  }
  return { command: 'start', options: parseCliOptions(command === 'start' ? args.slice(1) : args), playwrightArgs: [] };
}

export function loadInteractiveConfig(envPath = '.env'): InteractiveRunnerConfig {
  const env = loadAgentEnv({ process: 'runner', envPath: resolve(process.cwd(), envPath), requireProcessValues: false });
  registerEnvironmentSecrets(env);
  const projectDir = env.TM_PROJECT_DIR?.trim() || process.cwd();
  if (env.TM_PROJECT_DIR && !isAbsolute(projectDir)) {
    throw new Error('TM_PROJECT_DIR must be an absolute path');
  }
  const config = {
    projectDir: resolve(projectDir),
    playwrightCmd: env.TM_PLAYWRIGHT_CMD?.trim() || 'npx playwright test',
    trustedRepositories: loadTrustedRepositories(),
  };
  parseAllowedPlaywrightCommand(config.playwrightCmd);
  return config;
}

export function loadConfig(envPath = '.env', cliOptions: RunnerCliOptions = {}): RunnerConfig {
  const env = loadAgentEnv({ process: 'runner', envPath: resolve(process.cwd(), envPath) });
  registerEnvironmentSecrets(env);
  const projectDir = env.TM_PROJECT_DIR?.trim() || process.cwd();
  if (env.TM_PROJECT_DIR && !isAbsolute(projectDir)) {
    throw new Error('TM_PROJECT_DIR must be an absolute path');
  }
  const config = {
    supabaseUrl: env.TM_SUPABASE_URL!.trim().replace(/\/+$/, ''),
    supabaseAnonKey: env.TM_SUPABASE_ANON_KEY!.trim(),
    runnerToken: env.TM_RUNNER_TOKEN!.trim(),
    projectDir: resolve(projectDir),
    repositoryCacheDir: resolve(process.cwd(), env.TM_REPOSITORY_CACHE_DIR?.trim() || './repositories'),
    playwrightCmd: env.TM_PLAYWRIGHT_CMD?.trim() || 'npx playwright test',
    trustedRepositories: loadTrustedRepositories(),
    headed: cliOptions.headed ?? boolEnv(env, 'TM_PLAYWRIGHT_HEADED', false),
    slowMoMs: cliOptions.slowMoMs ?? nonNegativeIntEnv(env, 'TM_PLAYWRIGHT_SLOW_MO_MS', 0),
    pollIntervalMs: intEnv(env, 'TM_POLL_INTERVAL_SECONDS', 5) * 1000,
    heartbeatIntervalMs: intEnv(env, 'TM_HEARTBEAT_INTERVAL_SECONDS', 30) * 1000,
    jobTimeoutMs: intEnv(env, 'TM_JOB_TIMEOUT_SECONDS', 900) * 1000,
    artifactDir: resolve(process.cwd(), env.TM_ARTIFACT_DIR?.trim() || './artifacts'),
    artifactUpload: (env.TM_ARTIFACT_UPLOAD?.trim().toLowerCase() ?? 'true') !== 'false',
  };
  parseAllowedPlaywrightCommand(config.playwrightCmd);
  registerSecret(config.supabaseAnonKey);
  registerSecret(config.runnerToken);
  return config;
}
