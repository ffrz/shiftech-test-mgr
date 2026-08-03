import type { RunnerConfig } from './config.js';
import type { AutomationJob, JobLogStream, JobResult, StepCommand } from './api.js';
import type { CollectedArtifact } from './artifacts.js';
import type { ExecutorAdapter } from '@testmanager/agent-core';

export interface ExecutionOutcome {
  result: JobResult;
  errorMessage?: string;
  notes?: string;
  artifacts: CollectedArtifact[];
}

export interface ExecutionMode {
  headed: boolean;
  slowMoMs: number;
  pauseOnFailure: boolean;
}

export interface RunnerExecutionRequest {
  config: RunnerConfig;
  job: AutomationJob;
  projectDir: string;
  onLog?: (stream: JobLogStream, content: string) => void;
  subscribeCommands?: (deliver: (command: StepCommand) => void) => () => void;
}

export type RunnerExecutorAdapter = ExecutorAdapter<RunnerExecutionRequest, ExecutionOutcome>;

const SUPPORTED_BROWSERS = ['chromium', 'firefox', 'webkit'] as const;
export interface ExecutionTarget { browser: (typeof SUPPORTED_BROWSERS)[number]; deviceProfile: string | null; }

export function resolveExecutionTarget(job: AutomationJob): ExecutionTarget {
  const browser = job.browser ?? 'chromium';
  if (!SUPPORTED_BROWSERS.includes(browser)) throw new Error('browser pada job tidak didukung');
  const deviceProfile = job.device_profile?.trim() || null;
  if (deviceProfile && !/^[\w .+()-]{1,80}$/.test(deviceProfile)) throw new Error('device_profile pada job tidak valid');
  return { browser, deviceProfile };
}

export function resolveExecutionMode(config: RunnerConfig, job: AutomationJob): ExecutionMode {
  const slowMoMs = job.slow_mo_ms == null ? config.slowMoMs : job.slow_mo_ms;
  if (!Number.isInteger(slowMoMs) || slowMoMs < 0) {
    throw new Error('slow_mo_ms pada job harus berupa integer milidetik >= 0');
  }
  return {
    headed: job.pause_on_failure ? true : job.headed ?? (slowMoMs > 0 ? true : config.headed),
    slowMoMs,
    pauseOnFailure: job.pause_on_failure ?? false,
  };
}
