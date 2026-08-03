import { spawn, type ChildProcess } from 'node:child_process';
import { watch } from 'node:fs';
import type { InteractiveRunnerConfig, RunnerCommand } from './config.js';
import { log } from './logger.js';
import { assertTrustedRepository, childProcessEnvironment, parseAllowedPlaywrightCommand } from './security.js';

const TEST_FILE_PATTERN = /(?:^|[/\\])[^/\\]+\.(?:spec|test)\.(?:[cm]?[jt]sx?)$/i;
const IGNORED_DIRECTORY_PATTERN = /(?:^|[/\\])(?:node_modules|\.git|test-results|playwright-report|artifacts)(?:[/\\]|$)/;

export interface InteractiveInvocation {
  command: string;
  args: string[];
  env: NodeJS.ProcessEnv;
}

export function createInteractiveInvocation(
  config: InteractiveRunnerConfig,
  mode: Exclude<RunnerCommand, 'start' | 'codegen' | 'sync'>,
  playwrightArgs: string[],
): InteractiveInvocation {
  const invocation = parseAllowedPlaywrightCommand(config.playwrightCmd);
  return {
    command: invocation.command,
    args: [...invocation.args, ...playwrightArgs, ...(mode === 'ui' ? ['--ui'] : mode === 'debug' ? ['--debug'] : [])],
    env: childProcessEnvironment(mode === 'debug' ? { PWDEBUG: '1' } : {}),
  };
}

function spawnPlaywright(config: InteractiveRunnerConfig, mode: Exclude<RunnerCommand, 'start' | 'codegen' | 'sync'>, playwrightArgs: string[]): ChildProcess {
  const invocation = createInteractiveInvocation(config, mode, playwrightArgs);
  log.info(`Starting Playwright ${mode} mode`, { projectDir: config.projectDir });
  return spawn(invocation.command, invocation.args, {
    cwd: config.projectDir,
    env: invocation.env,
    stdio: 'inherit',
  });
}

function waitForExit(child: ChildProcess): Promise<number> {
  return new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('close', (code, signal) => resolve(signal ? 1 : (code ?? 1)));
  });
}

async function runWatch(config: InteractiveRunnerConfig, playwrightArgs: string[]): Promise<number> {
  let running = false;
  let rerunQueued = false;
  let stopped = false;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let child: ChildProcess | null = null;

  const run = async (): Promise<void> => {
    if (running) {
      rerunQueued = true;
      return;
    }
    running = true;
    child = spawnPlaywright(config, 'watch', playwrightArgs);
    try {
      await waitForExit(child);
    } catch (error) {
      log.error('Playwright watch run failed', { error: (error as Error).message });
    } finally {
      child = null;
      running = false;
    }
    if (rerunQueued && !stopped) {
      rerunQueued = false;
      await run();
    }
  };

  const watcher = watch(config.projectDir, { recursive: true }, (_event, filename) => {
    if (!filename) return;
    const path = String(filename);
    if (IGNORED_DIRECTORY_PATTERN.test(path) || !TEST_FILE_PATTERN.test(path)) return;
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      log.info('Test file changed, scheduling re-run', { file: path });
      void run();
    }, 150);
  });

  const stop = () => {
    stopped = true;
    watcher.close();
    if (debounceTimer) clearTimeout(debounceTimer);
    child?.kill('SIGTERM');
  };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);

  await run();
  await new Promise<void>((resolve) => watcher.once('close', resolve));
  return 0;
}

export async function runInteractiveCommand(
  config: InteractiveRunnerConfig,
  mode: Exclude<RunnerCommand, 'start' | 'codegen' | 'sync'>,
  playwrightArgs: string[],
): Promise<number> {
  assertTrustedRepository(config.projectDir, config.trustedRepositories);
  if (mode === 'watch') return runWatch(config, playwrightArgs);
  return waitForExit(spawnPlaywright(config, mode, playwrightArgs));
}
