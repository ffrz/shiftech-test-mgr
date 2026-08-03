import { realpathSync, statSync } from 'node:fs';
import { isAbsolute, relative } from 'node:path';
export { SecretRedactorStream, redactSecrets, redactValue, registerEnvironmentSecrets, registerSecret } from '@testmanager/agent-core';
const SENSITIVE_ENV_NAME = /(?:TOKEN|SECRET|PASSWORD|PASSWD|API_KEY|PRIVATE_KEY|CREDENTIAL|AUTHORIZATION|COOKIE)/i;

export function assertPrivateConfigFile(path: string): void {
  if (process.platform === 'win32') return;
  const permissions = statSync(path).mode & 0o777;
  if ((permissions & 0o077) !== 0) {
    throw new Error(`Runner config harus private (chmod 600): ${path}`);
  }
}

export function assertTrustedRepository(repositoryRoot: string, trustedRepositories: readonly string[]): string {
  const root = realpathSync(repositoryRoot);
  if (!trustedRepositories.includes(root)) {
    throw new Error(`Repository belum dipercaya oleh runner: ${root}. Periksa seluruh repository, termasuk playwright.config.*, lalu jalankan: tm-runner trust ${root}`);
  }
  return root;
}

export function assertPathInsideRepository(repositoryRoot: string, path: string): string {
  const root = realpathSync(repositoryRoot);
  const target = realpathSync(path);
  const child = relative(root, target);
  if (!child || child === '..' || child.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`) || isAbsolute(child)) {
    throw new Error('script_ref berada di luar root repository');
  }
  return target;
}

export interface AllowedCommand { command: string; args: string[] }

export function parseAllowedPlaywrightCommand(raw: string | undefined): AllowedCommand {
  const command = raw?.trim() || 'npx playwright test';
  const allowed: Record<string, AllowedCommand> = {
    'npx playwright test': { command: 'npx', args: ['playwright', 'test'] },
    'npm exec playwright test': { command: 'npm', args: ['exec', 'playwright', 'test'] },
    'pnpm exec playwright test': { command: 'pnpm', args: ['exec', 'playwright', 'test'] },
    'yarn playwright test': { command: 'yarn', args: ['playwright', 'test'] },
  };
  const invocation = allowed[command];
  if (!invocation) throw new Error('TM_PLAYWRIGHT_CMD tidak diizinkan; gunakan invocation Playwright resmi yang didukung');
  return { command: invocation.command, args: [...invocation.args] };
}

export function childProcessEnvironment(overrides: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {};
  for (const [name, value] of Object.entries(process.env)) {
    if (!SENSITIVE_ENV_NAME.test(name) && !name.startsWith('TM_SUPABASE_') && name !== 'TM_RUNNER_TOKEN') env[name] = value;
  }
  return { ...env, ...overrides };
}
