import {
  SupabaseRpcError,
  SupabaseRpcTransport,
  RunnerTokenAuth,
  createAgentHeartbeat,
  type AuthAdapter,
  type TransportAdapter,
} from '@testmanager/agent-core';
import type { RunnerConfig } from './config.js';
import type { LocalRepositoryMetadata } from './localRepository.js';
import type { RunnerVersionPolicy } from './versionCompatibility.js';

// Shapes returned by the server RPCs in supabase/schema_024_p3_automation.sql.
export interface AutomationJob {
  id: string;
  test_run_id: string;
  test_case_id: string;
  test_case_code: string | null;
  test_case_title: string | null;
  script_ref: string;
  attempt: number;
  max_attempts: number;
  headed?: boolean;
  slow_mo_ms?: number | null;
  browser?: 'chromium' | 'firefox' | 'webkit';
  device_profile?: string | null;
  pause_on_failure?: boolean;
  base_url?: string | null;
  build_version?: string | null;
  repository: JobRepository | null;
}

export interface JobRepository {
  id: string;
  source_type: 'local_path' | 'github_public' | 'github_private' | 'git_url';
  url_or_path: string;
  default_branch: string | null;
  subdirectory: string | null;
  token: string | null;
}

export type JobResult = 'pass' | 'fail' | 'blocked' | 'skip';
export type JobLogStream = 'stdout' | 'stderr' | 'system';
export type StepCommand = 'next' | 'continue';
export interface AutomationJobCommand { id: number; command: StepCommand; requested_at: string; }
export interface RunnerDiagnosticJob { id: string; base_url: string | null; }

export interface EnvironmentMetadata {
  browser: 'chromium' | 'firefox' | 'webkit';
  browserVersion: string;
  os: string;
  viewport: { width: number; height: number };
  baseUrl: string | null;
  buildVersion: string | null;
  commitSha: string | null;
}

export interface ReportArtifact {
  type: 'screenshot' | 'video' | 'trace' | 'log' | 'network' | 'dom';
  url: string;
  name?: string;
  // Set when the artifact was uploaded to Supabase Storage; the UI builds a
  // signed download URL from these. Absent for local-path fallback.
  path?: string;
  bucket?: string;
}

export interface ReportPayload {
  result: JobResult;
  retry?: boolean;
  notes?: string;
  error_message?: string;
  artifacts?: ReportArtifact[];
  repository?: LocalRepositoryMetadata;
  environment?: EnvironmentMetadata;
}

export interface CodegenTestCase {
  id: string;
  code: string;
  title: string;
  script_ref: string | null;
  steps: CodegenTestCaseStep[];
}

export interface CodegenTestCaseStep {
  step_number: number;
  action: string;
  expected_result: string | null;
}

export { SupabaseRpcError as ApiError };

export interface BootstrapConnectionConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
}

export interface RedeemedRunner {
  id: string;
  project_id: string;
  name: string;
  labels: string[];
}

/** API boundary used only while exchanging a short-lived bootstrap code. */
export class BootstrapApi {
  private readonly transport: TransportAdapter;

  constructor(config: BootstrapConnectionConfig, transport?: TransportAdapter) {
    this.transport = transport ?? new SupabaseRpcTransport(config);
  }

  async redeem(code: string, runnerToken: string, runnerName: string, runnerLabels: string[] = ['local', 'playwright']): Promise<RedeemedRunner> {
    const response = await this.transport.request<{ runner: RedeemedRunner }>({
      operation: 'redeem_agent_bootstrap_code',
      body: {
        p_code: code,
        p_runner_token: runnerToken,
        p_runner_name: runnerName,
        p_runner_labels: runnerLabels,
      },
    });
    return response.data.runner;
  }

  async heartbeat(runnerToken: string): Promise<void> {
    const auth = new RunnerTokenAuth({ token: runnerToken, subject: 'automation-runner' });
    await this.transport.request({
      operation: 'heartbeat_local_agent',
      body: { p_payload: createAgentHeartbeat('runner', ['execute', 'artifacts', 'repository']) },
      auth: await auth.getAuthContext(),
    });
  }
}

// The automation RPCs are granted to anon; the runner token in the body is the
// real credential. Outbound HTTPS only — the local machine never opens a port.
export class AutomationApi {
  private readonly transport: TransportAdapter;
  private readonly auth: AuthAdapter;
  private readonly startedAt = new Date().toISOString();

  constructor(config: RunnerConfig, transport?: TransportAdapter, auth?: AuthAdapter) {
    this.transport = transport ?? new SupabaseRpcTransport({
      supabaseUrl: config.supabaseUrl,
      supabaseAnonKey: config.supabaseAnonKey,
    });
    this.auth = auth ?? new RunnerTokenAuth({
      token: config.runnerToken,
      subject: 'automation-runner',
    });
  }

  private async rpc<T>(fn: string, params: Record<string, unknown>): Promise<T> {
    const response = await this.transport.request<T>({
      operation: fn,
      body: params,
      auth: await this.auth.getAuthContext(),
    });
    return response.data;
  }

  heartbeat(scriptRefs: string[] = []): Promise<{ agent_id: string; active: boolean; last_seen_at: string } & RunnerVersionPolicy> {
    return this.rpc('heartbeat_local_agent', {
      p_payload: createAgentHeartbeat('runner', ['execute', 'artifacts', 'repository'], {
        os: `${process.platform} ${process.arch}`,
        startedAt: this.startedAt,
        scriptRefs,
      }),
    });
  }

  async poll(): Promise<AutomationJob | null> {
    const data = await this.rpc<{ job: AutomationJob | null }>('poll_automation_job', {});
    return data.job ?? null;
  }
  async pollDiagnostic(): Promise<RunnerDiagnosticJob | null> {
    const data = await this.rpc<{ job: RunnerDiagnosticJob | null }>('poll_runner_diagnostic', {});
    return data.job ?? null;
  }
  reportDiagnostic(jobId: string, result: Record<string, unknown>): Promise<unknown> {
    return this.rpc('report_runner_diagnostic', { p_job_id: jobId, p_result: result });
  }

  report(jobId: string, payload: ReportPayload): Promise<{ job_id: string; status: string; requeued: boolean }> {
    return this.rpc('report_automation_job', {
      p_job_id: jobId,
      p_payload: payload,
    });
  }

  appendLog(jobId: string, attempt: number, sequence: number, stream: JobLogStream, content: string): Promise<{ job_id: string; sequence: number }> {
    return this.rpc('append_automation_job_log', {
      p_job_id: jobId,
      p_attempt: attempt,
      p_sequence: sequence,
      p_stream: stream,
      p_content: content,
    });
  }

  async pollCommands(jobId: string): Promise<AutomationJobCommand[]> {
    const data = await this.rpc<{ commands: AutomationJobCommand[] }>('poll_automation_job_commands', {
      p_job_id: jobId,
    });
    return data.commands ?? [];
  }

  listCodegenTestCases(): Promise<CodegenTestCase[]> {
    return this.rpc('list_runner_codegen_test_cases', {});
  }

  attachCodegenScript(testCaseId: string, scriptRef: string): Promise<{ test_case_id: string; script_ref: string }> {
    return this.rpc('attach_runner_codegen_script', {
      p_test_case_id: testCaseId,
      p_script_ref: scriptRef,
    });
  }
}
