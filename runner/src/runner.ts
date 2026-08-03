import { AutomationApi, ApiError, type JobLogStream, type StepCommand } from './api.js';
import type { RunnerConfig } from './config.js';
import type { RunnerExecutorAdapter } from './executor.js';
import { PlaywrightLocalExecutor } from './playwrightLocalExecutor.js';
import { collectEnvironmentMetadata } from './environmentMetadata.js';
import { uploadArtifacts } from './upload.js';
import { SupabaseStorageAdapter } from './supabaseStorageAdapter.js';
import { LOCAL_AGENT_VERSION, type ArtifactStorageAdapter } from '@testmanager/agent-core';
import { hasCompleteFailureBundle } from './artifacts.js';
import { log } from './logger.js';
import type { LocalRepositoryMetadata } from './localRepository.js';
import { prepareJobRepository } from './repositoryWorkspace.js';
import { registerSecret, redactSecrets } from './security.js';
import { evaluateRunnerCompatibility, type RunnerVersionPolicy } from './versionCompatibility.js';
import { discoverScriptRefs } from './scriptInventory.js';
import { runDiagnostics } from './diagnostics.js';

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

const RUNNER_TOKEN_REJECTED_MESSAGE =
  'Token runner ditolak server karena sudah dicabut, dirotasi, atau tidak valid. Hubungkan ulang runner dengan token baru.';

export function isRunnerTokenRejected(error: unknown): boolean {
  return error instanceof ApiError
    && (error.status === 401
      || error.status === 403
      || error.message.includes('INVALID_RUNNER_TOKEN'));
}

class JobLogStreamer {
  private sequence = 0;
  private pending: Array<{ stream: JobLogStream; content: string }> = [];
  private sending: Promise<void> = Promise.resolve();
  private timer: ReturnType<typeof setInterval>;

  constructor(private readonly api: AutomationApi, private readonly jobId: string, private readonly attempt: number) {
    this.timer = setInterval(() => this.flush(), 1_000);
  }

  push(stream: JobLogStream, content: string): void {
    content = redactSecrets(content);
    for (let offset = 0; offset < content.length; offset += 32_768) {
      const chunk = content.slice(offset, offset + 32_768);
      if (chunk) this.pending.push({ stream, content: chunk });
    }
  }

  flush(): void {
    const chunks = this.pending.splice(0);
    if (!chunks.length) return;
    this.sending = this.sending.then(async () => {
      for (const chunk of chunks) {
        const sequence = this.sequence++;
        try { await this.api.appendLog(this.jobId, this.attempt, sequence, chunk.stream, chunk.content); }
        catch (error) { log.warn('Live log chunk failed', { jobId: this.jobId, sequence, error: (error as Error).message }); }
      }
    });
  }

  async close(): Promise<void> {
    clearInterval(this.timer);
    this.flush();
    await this.sending;
  }
}

export class Runner {
  private readonly api: AutomationApi;
  private stopping = false;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private compatibilityError: Error | null = null;
  private warnedServerVersion: string | null = null;
  private scriptRefs: string[] = [];

  constructor(
    private readonly config: RunnerConfig,
    private readonly executor: RunnerExecutorAdapter = new PlaywrightLocalExecutor(),
    private readonly artifactStorage: ArtifactStorageAdapter = SupabaseStorageAdapter.fromConfig(config),
    api?: AutomationApi,
  ) {
    this.api = api ?? new AutomationApi(config);
  }

  stop(): void {
    this.stopping = true;
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
  }

  private startHeartbeat(): void {
    const beat = async () => {
      try { this.checkVersionCompatibility(await this.api.heartbeat(this.scriptRefs)); }
      catch (err) { log.warn('Heartbeat failed', { error: (err as Error).message }); }
    };
    void beat();
    this.heartbeatTimer = setInterval(() => void beat(), this.config.heartbeatIntervalMs);
  }

  private checkVersionCompatibility(policy: RunnerVersionPolicy): void {
    const compatibility = evaluateRunnerCompatibility(LOCAL_AGENT_VERSION, policy);
    if (compatibility === 'unsupported') {
      this.compatibilityError = new Error(
        `Versi runner ${LOCAL_AGENT_VERSION} tidak lagi didukung server. Versi minimum yang didukung adalah ${policy.minimum_supported_runner_version}. Perbarui runner sebelum menjalankan job.`,
      );
      this.stop();
    } else if (compatibility === 'outdated' && this.warnedServerVersion !== policy.server_version) {
      this.warnedServerVersion = policy.server_version;
      log.warn('Versi runner tertinggal dari server; perbarui runner sesegera mungkin', {
        runnerVersion: LOCAL_AGENT_VERSION,
        serverVersion: policy.server_version,
        minimumSupportedRunnerVersion: policy.minimum_supported_runner_version,
      });
    }
  }

  private subscribeJobCommands(jobId: string, onCommand: (command: StepCommand) => void): () => void {
    let stopped = false;
    let polling = false;
    const poll = async () => {
      if (stopped || polling) return;
      polling = true;
      try {
        const commands = await this.api.pollCommands(jobId);
        if (stopped) return;
        commands.forEach(({ command }) => onCommand(command));
      } catch (error) {
        log.warn('Step command poll failed', { jobId, error: (error as Error).message });
      } finally { polling = false; }
    };
    void poll();
    const timer = setInterval(() => void poll(), this.config.pollIntervalMs);
    return () => { stopped = true; clearInterval(timer); };
  }

  async start(): Promise<void> {
    log.info('Runner workspace ready', { repositoryCacheDir: this.config.repositoryCacheDir });
    this.scriptRefs = await discoverScriptRefs(this.config.projectDir);

    // Fail fast if the token is invalid so operators get a clear error on boot.
    try {
      const hb = await this.api.heartbeat(this.scriptRefs);
      this.checkVersionCompatibility(hb);
      if (this.compatibilityError) throw this.compatibilityError;
      log.info('Runner authenticated', { agentId: hb.agent_id, active: hb.active });
    } catch (err) {
      if (err === this.compatibilityError) throw err;
      if (isRunnerTokenRejected(err)) {
        throw new Error(RUNNER_TOKEN_REJECTED_MESSAGE);
      }
      log.warn('Initial heartbeat failed, will keep retrying', { error: (err as Error).message });
    }

    this.startHeartbeat();
    log.info('Polling for jobs', { intervalMs: this.config.pollIntervalMs, projectDir: this.config.projectDir });

    while (!this.stopping) {
      try {
        const diagnostic = await this.api.pollDiagnostic();
        if (diagnostic) {
          const result = await runDiagnostics(diagnostic.base_url, this.config.projectDir);
          await this.api.reportDiagnostic(diagnostic.id, result as unknown as Record<string, unknown>);
          log.info('Diagnostic no-op reported', { diagnosticId: diagnostic.id, passed: !result.errorMessage });
          continue;
        }
        const job = await this.api.poll();
        if (!job) {
          await sleep(this.config.pollIntervalMs);
          continue;
        }
        let workspace: { projectDir: string; metadata: LocalRepositoryMetadata } | null = null;
        let outcome;
        const logStreamer = new JobLogStreamer(this.api, job.id, job.attempt);
        try {
          registerSecret(job.repository?.token);
          workspace = await prepareJobRepository(this.config, job.repository);
          logStreamer.push('system', `Menjalankan ${job.script_ref}\n`);
          outcome = await this.executor.execute({
            config: this.config,
            job,
            projectDir: workspace.projectDir,
            onLog: (stream, content) => logStreamer.push(stream, content),
            subscribeCommands: (deliver) => this.subscribeJobCommands(job.id, deliver),
          });
        } catch (error) {
          outcome = {
            result: 'blocked' as const,
            errorMessage: error instanceof Error ? error.message : 'Repository tidak dapat disiapkan',
            artifacts: [],
          };
        } finally {
          await logStreamer.close();
        }
        let artifacts;
        try {
          if (outcome.result === 'fail' && !hasCompleteFailureBundle(outcome.artifacts)) {
            throw new Error('Bundle bukti kegagalan tidak lengkap (screenshot, video, trace, console, HAR, dan DOM wajib tersedia)');
          }
          artifacts = await uploadArtifacts(this.config, this.artifactStorage, job.id, outcome.artifacts);
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Upload bundle artifact gagal';
          const report = await this.api.report(job.id, {
            result: 'blocked',
            retry: job.attempt < job.max_attempts,
            error_message: message,
            artifacts: [],
            environment: collectEnvironmentMetadata(
              job,
              { browser: job.browser ?? 'chromium', deviceProfile: job.device_profile?.trim() || null },
              workspace?.metadata,
              workspace?.projectDir ?? this.config.projectDir,
            ),
          });
          log.error('Bundle artifact tidak dapat di-upload seluruhnya', { jobId: job.id, serverStatus: report.status, requeued: report.requeued });
          continue;
        }
        const environment = collectEnvironmentMetadata(
          job,
          { browser: job.browser ?? 'chromium', deviceProfile: job.device_profile?.trim() || null },
          workspace?.metadata,
          workspace?.projectDir ?? this.config.projectDir,
        );
        const report = await this.api.report(job.id, {
          result: outcome.result,
          retry: outcome.result !== 'pass' && job.attempt < job.max_attempts,
          notes: outcome.notes,
          error_message: outcome.errorMessage,
          artifacts,
          repository: workspace?.metadata,
          environment,
        });
        log.info('Reported job', { jobId: job.id, result: outcome.result, serverStatus: report.status, requeued: report.requeued, artifacts: artifacts.length });
      } catch (err) {
        if (isRunnerTokenRejected(err)) {
          this.stop();
          throw new Error(RUNNER_TOKEN_REJECTED_MESSAGE);
        }
        log.error('Poll/execute cycle failed', { error: (err as Error).message });
        await sleep(this.config.pollIntervalMs);
      }
    }
    if (this.compatibilityError) throw this.compatibilityError;
    log.info('Runner stopped');
  }
}
