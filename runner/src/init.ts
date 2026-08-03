import { randomBytes } from 'node:crypto';
import { chmod, rename, rm, writeFile } from 'node:fs/promises';
import { hostname } from 'node:os';
import { resolve } from 'node:path';
import { loadAgentEnv, type TransportAdapter } from '@testmanager/agent-core';
import { BootstrapApi } from './api.js';
import { registerEnvironmentSecrets, registerSecret } from './security.js';

export interface BootstrapInitOptions {
  env?: NodeJS.ProcessEnv;
  configPath?: string;
  cwd?: string;
  transport?: TransportAdapter;
  stdout?: Pick<NodeJS.WriteStream, 'write'>;
}

function requiredConnectionValue(env: Record<string, string | undefined>, name: 'TM_SUPABASE_URL' | 'TM_SUPABASE_ANON_KEY'): string {
  const value = env[name]?.trim();
  if (!value) throw new Error(`${name} wajib tersedia untuk menjalankan init`);
  return value;
}

function serializeConfig(supabaseUrl: string, supabaseAnonKey: string, runnerToken: string, projectDir: string): string {
  return [
    `TM_SUPABASE_URL=${supabaseUrl}`,
    `TM_SUPABASE_ANON_KEY=${supabaseAnonKey}`,
    `TM_RUNNER_TOKEN=${runnerToken}`,
    `TM_PROJECT_DIR=${projectDir}`,
    '',
  ].join('\n');
}

async function writePrivateConfig(path: string, content: string): Promise<void> {
  const temporaryPath = `${path}.${process.pid}.tmp`;
  try {
    await writeFile(temporaryPath, content, { encoding: 'utf8', mode: 0o600, flag: 'wx' });
    await chmod(temporaryPath, 0o600);
    await rename(temporaryPath, path);
    await chmod(path, 0o600);
  } catch (error) {
    await rm(temporaryPath, { force: true });
    throw error;
  }
}

export async function bootstrapRunner(code: string, options: BootstrapInitOptions = {}): Promise<void> {
  if (!/^tmb_[0-9a-f]{48}$/.test(code)) throw new Error('Bootstrap code tidak valid');
  const cwd = resolve(options.cwd ?? process.cwd());
  const configPath = resolve(options.configPath ?? resolve(cwd, '.env'));
  const sourceEnv = options.env ?? process.env;
  const env = loadAgentEnv({ process: 'runner', env: sourceEnv, envPath: configPath, requireProcessValues: false });
  registerEnvironmentSecrets(env);
  registerSecret(code);

  const supabaseUrl = requiredConnectionValue(env, 'TM_SUPABASE_URL').replace(/\/+$/, '');
  const supabaseAnonKey = requiredConnectionValue(env, 'TM_SUPABASE_ANON_KEY');
  const runnerToken = `tm_${randomBytes(36).toString('base64url')}`;
  registerSecret(runnerToken);

  const api = new BootstrapApi({ supabaseUrl, supabaseAnonKey }, options.transport);
  const runnerName = sourceEnv.TM_RUNNER_NAME?.trim() || `Local Runner (${hostname()})`;
  const runnerLabels = Array.from(new Set((sourceEnv.TM_RUNNER_LABELS ?? '').split(',').map((label) => label.trim().toLowerCase()).filter(Boolean)));
  const runner = await api.redeem(code, runnerToken, runnerName, runnerLabels);
  await writePrivateConfig(configPath, serializeConfig(supabaseUrl, supabaseAnonKey, runnerToken, cwd));
  await api.heartbeat(runnerToken);

  (options.stdout ?? process.stdout).write(
    `Runner ${runner.name} tersambung ke project ${runner.project_id}.\n` +
    'Peringatan: runner menjalankan kode dari repo yang kamu tautkan, di mesin ini.\n' +
    'Playwright juga mengeksekusi playwright.config.ts sebagai kode Node sebelum satu test pun berjalan.\n',
  );
}

export async function runInit(code: string): Promise<number> {
  await bootstrapRunner(code);
  return 0;
}
