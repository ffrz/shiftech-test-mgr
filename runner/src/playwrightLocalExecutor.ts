import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { mkdirSync, statSync, writeFileSync } from 'node:fs';
import { isAbsolute, join, relative, resolve } from 'node:path';
import { collectArtifacts } from './artifacts.js';
import { checkBaseUrlReachable } from './baseUrlSanityCheck.js';
import {
  type ExecutionOutcome,
  type RunnerExecutionRequest,
  type RunnerExecutorAdapter,
  resolveExecutionMode,
  resolveExecutionTarget,
} from './executor.js';
import { log } from './logger.js';
import {
  assertPathInsideRepository,
  childProcessEnvironment,
  parseAllowedPlaywrightCommand,
  redactSecrets,
  SecretRedactorStream,
} from './security.js';

// Uses the Playwright CLI from the repository under test, keeping the runner
// independent of a particular Playwright library version.
export class PlaywrightLocalExecutor implements RunnerExecutorAdapter {
  private readonly activeProcesses = new Map<string, ChildProcessWithoutNullStreams>();

  async execute(request: RunnerExecutionRequest): Promise<ExecutionOutcome> {
    const { config, job, projectDir, onLog, subscribeCommands } = request;
    if (isAbsolute(job.script_ref)) {
      return { result: 'blocked', errorMessage: 'script_ref harus berupa path relatif di repository', artifacts: [] };
    }
    const resolvedScript = resolve(projectDir, job.script_ref);
    const relativeScript = relative(projectDir, resolvedScript);
    if (!relativeScript || relativeScript.startsWith('..') || isAbsolute(relativeScript)) {
      return { result: 'blocked', errorMessage: 'script_ref berada di luar root repository', artifacts: [] };
    }
    try {
      assertPathInsideRepository(projectDir, resolvedScript);
      if (!statSync(resolvedScript).isFile() || !/\.(?:spec|test)\.(?:[cm]?[jt]sx?)$/i.test(relativeScript)) {
        throw new Error('script_ref harus menunjuk file test Playwright yang didukung');
      }
    } catch (error) {
      return { result: 'blocked', errorMessage: (error as Error).message, artifacts: [] };
    }

    let executionMode;
    let executionTarget;
    try {
      executionMode = resolveExecutionMode(config, job);
      executionTarget = resolveExecutionTarget(job);
    } catch (error) {
      return { result: 'blocked', errorMessage: (error as Error).message, artifacts: [] };
    }

    const sanityCheck = await checkBaseUrlReachable(job.base_url);
    if (!sanityCheck.reachable) return { result: 'blocked', errorMessage: sanityCheck.errorMessage, artifacts: [] };
    if (job.base_url?.trim()) onLog?.('system', `Base URL ${new URL(job.base_url).origin} dapat dijangkau\n`);

    const jobOutputDir = join(config.artifactDir, job.id);
    mkdirSync(jobOutputDir, { recursive: true });
    let invocation;
    try { invocation = parseAllowedPlaywrightCommand(config.playwrightCmd); }
    catch (error) { return { result: 'blocked', errorMessage: (error as Error).message, artifacts: [] }; }
    const cmd = invocation.command;
    // Playwright's test-file argument is matched as a regex-ish path pattern, not
    // resolved via the OS path separator — on Windows relativeScript comes out with
    // backslashes (from node:path.relative), which combined with shell:true's lack
    // of arg-escaping breaks argument boundaries and Playwright reports "No tests
    // found". Forward slashes work identically on every platform Playwright supports.
    const scriptArg = relativeScript.split('\\').join('/');
    const args = [
      ...invocation.args,
      scriptArg,
      `--output=${jobOutputDir}`,
      '--trace=retain-on-failure',
      '--reporter=list',
      `--browser=${executionTarget.browser}`,
      ...(executionMode.headed ? ['--headed'] : []),
    ];

    return new Promise<ExecutionOutcome>((complete) => {
      log.info('Executing job', { jobId: job.id, testCase: job.test_case_code, script: job.script_ref, attempt: job.attempt, ...executionMode, ...executionTarget });
      // node:child_process.spawn cannot exec npx/npm/pnpm/yarn on Windows: they're
      // .cmd shims, not native executables, and CreateProcess refuses them outright
      // (EINVAL) even when given the .cmd extension explicitly — shell:true is the
      // only way to run them. stdin piping to the child (used below for the
      // step-control channel) still works the same under shell:true on Windows.
      const child = spawn(cmd ?? 'npx', args, {
        cwd: projectDir,
        shell: process.platform === 'win32',
        env: childProcessEnvironment({ TM_PLAYWRIGHT_SLOW_MO_MS: String(executionMode.slowMoMs), TM_PLAYWRIGHT_DEVICE_PROFILE: executionTarget.deviceProfile ?? '', TM_PAUSE_ON_FAILURE: executionMode.pauseOnFailure ? '1' : '0', TM_STEP_CONTROL_CHANNEL: 'stdin-jsonl' }),
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      this.activeProcesses.set(job.id, child);
      const unsubscribeCommands = subscribeCommands?.((command) => {
        if (!child.stdin.destroyed) {
          child.stdin.write(`${JSON.stringify({ type: 'step-control', command })}\n`);
          onLog?.('system', `Perintah step-through "${command}" diteruskan ke channel lokal.\n`);
        }
      });
      let stdout = '';
      let stderr = '';
      const stdoutRedactor = new SecretRedactorStream();
      const stderrRedactor = new SecretRedactorStream();
      let settled = false;
      let timer: ReturnType<typeof setTimeout> | null = null;
      child.stdout.on('data', (chunk: Buffer) => {
        const content = stdoutRedactor.write(chunk.toString()); stdout += content; if (content) onLog?.('stdout', content);
        if (executionMode.pauseOnFailure && content.includes('[TM_PAUSE_ON_FAILURE]') && timer) {
          clearTimeout(timer); timer = null;
          onLog?.('system', 'Job gagal dan dijeda untuk inspeksi lokal; tekan Resume di Playwright Inspector.\n');
        }
      });
      child.stderr.on('data', (chunk: Buffer) => { const content = stderrRedactor.write(chunk.toString()); stderr += content; if (content) onLog?.('stderr', content); });
      timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        child.kill('SIGKILL');
        finalize('blocked', `Job timed out after ${config.jobTimeoutMs / 1000}s`);
      }, config.jobTimeoutMs);

      const finalize = (result: ExecutionOutcome['result'], errorMessage?: string): void => {
        this.activeProcesses.delete(job.id);
        unsubscribeCommands?.();
        const finalStdout = stdoutRedactor.flush();
        const finalStderr = stderrRedactor.flush();
        stdout += finalStdout; stderr += finalStderr;
        if (finalStdout) onLog?.('stdout', finalStdout);
        if (finalStderr) onLog?.('stderr', finalStderr);
        try { writeFileSync(join(jobOutputDir, 'runner-output.log'), redactSecrets(`$ ${cmd} ${args.join(' ')}\n\n[stdout]\n${stdout}\n[stderr]\n${stderr}\n`), { mode: 0o600 }); } catch { /* best effort */ }
        complete({ result, errorMessage, notes: errorMessage ? undefined : 'Automation run selesai', artifacts: collectArtifacts(jobOutputDir) });
      };
      child.on('error', (error) => {
        if (settled) return;
        settled = true; if (timer) clearTimeout(timer);
        finalize('blocked', `Failed to spawn Playwright: ${error.message}`);
      });
      child.on('close', (code) => {
        if (settled) return;
        settled = true; if (timer) clearTimeout(timer);
        if (code === 0) finalize('pass'); else finalize('fail', `Playwright exited with code ${code}`);
      });
    });
  }

  async cancel(jobId: string): Promise<void> {
    const child = this.activeProcesses.get(jobId);
    if (!child) return;
    child.kill('SIGTERM');
  }
}
