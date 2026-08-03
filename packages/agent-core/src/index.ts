/** A string-to-string collection safe to serialize across process boundaries. */
export type StringMap = Readonly<Record<string, string>>;

export {
  REDACTED,
  SecretRedactorStream,
  createLogger,
  formatCrash,
  installCrashHandlers,
  redactSecrets,
  redactValue,
  registerEnvironmentSecrets,
  registerSecret,
  type LogLevel,
  type AgentLogger,
  type LogWriter,
} from './logging.js';

export {
  AGENT_ENV_SCHEMA,
  loadAgentEnv,
  validateAgentEnv,
  type AgentEnvironment,
  type AgentProcess,
  type LoadAgentEnvOptions,
} from './config.js';

export {
  LOCAL_AGENT_NAME,
  LOCAL_AGENT_VERSION,
  createAgentHeartbeat,
  type AgentHeartbeatPayload,
} from './telemetry.js';

/** Binary data accepted and returned by artifact adapters without a Node.js dependency. */
export type BinaryContent = Uint8Array;

/** Authentication material prepared for one transport request. */
export interface AuthContext {
  readonly headers: StringMap;
  /** Credential fields merged into an object request body by the transport. */
  readonly body?: Readonly<Record<string, unknown>>;
}

/** Identifies an outbound operation without coupling callers to HTTP or Supabase. */
export interface TransportRequest<TBody = unknown> {
  readonly operation: string;
  /** Central-server operation family. RPC is the default for backwards compatibility. */
  readonly kind?: 'rpc' | 'function';
  readonly body?: TBody;
  readonly auth?: AuthContext;
  readonly metadata?: StringMap;
}

/** Normalized response returned by a central-server transport. */
export interface TransportResponse<TData = unknown> {
  readonly data: TData;
  readonly metadata?: StringMap;
}

/**
 * Boundary for all communication with the central TestManager server.
 * Implementations own protocol details, retries, timeouts, and error normalization.
 */
export interface TransportAdapter {
  request<TData = unknown, TBody = unknown>(
    request: TransportRequest<TBody>,
  ): Promise<TransportResponse<TData>>;
}

export {
  SupabaseRpcError,
  SupabaseRpcTransport,
  type SupabaseRpcTransportOptions,
} from './supabaseRpcTransport.js';

export interface ExecutionRequest {
  readonly jobId: string;
  readonly repositoryPath: string;
  readonly scriptRef: string;
  readonly environment?: StringMap;
  readonly metadata?: StringMap;
}

export type ExecutionStatus = 'passed' | 'failed' | 'cancelled' | 'timed_out';

export interface ExecutionResult {
  readonly status: ExecutionStatus;
  readonly exitCode?: number;
  readonly startedAt: string;
  readonly finishedAt: string;
  readonly artifactIds: readonly string[];
  readonly metadata?: StringMap;
}

/**
 * Boundary for executing a test job.
 * Implementations must isolate job input and return normalized results; persistence and
 * central-server reporting belong to their respective adapters.
 */
export interface ExecutorAdapter<
  TRequest = ExecutionRequest,
  TResult = ExecutionResult,
> {
  execute(request: TRequest): Promise<TResult>;
  cancel(jobId: string): Promise<void>;
}

export interface ArtifactDescriptor {
  readonly id: string;
  readonly name: string;
  readonly contentType: string;
  readonly size: number;
  readonly checksum?: string;
  readonly metadata?: StringMap;
}

export interface StoreArtifactRequest {
  readonly name: string;
  readonly contentType: string;
  readonly content: BinaryContent;
  readonly metadata?: StringMap;
}

/**
 * Boundary for durable test evidence such as traces, screenshots, videos, and logs.
 * Implementations own upload details and must not expose provider-specific object types.
 */
export interface ArtifactStorageAdapter {
  store(request: StoreArtifactRequest): Promise<ArtifactDescriptor>;
  retrieve(id: string): Promise<BinaryContent>;
  delete(id: string): Promise<void>;
}

/** Non-secret identity information safe for logs and telemetry. */
export interface AgentIdentity {
  readonly subject: string;
  readonly displayName?: string;
  readonly metadata?: StringMap;
}

/**
 * Boundary for proving an agent's identity.
 * Implementations own credential loading, refresh, and revocation checks. Secret material
 * must stay inside the adapter; callers receive only request auth and safe identity data.
 */
export interface AuthAdapter {
  getAuthContext(): Promise<AuthContext>;
  getIdentity(): Promise<AgentIdentity>;
  invalidate(): Promise<void>;
}

export {
  RunnerTokenAuth,
  RunnerTokenAuthError,
  type RunnerTokenAuthOptions,
} from './runnerTokenAuth.js';

export interface RepositoryReference {
  readonly source: string;
  readonly revision?: string;
  readonly credentialsRef?: string;
}

export interface RepositoryWorkspace {
  readonly rootPath: string;
  readonly revision: string;
}

export interface RepositoryEntry {
  readonly path: string;
  readonly kind: 'file' | 'directory';
  readonly size?: number;
}

/**
 * Boundary for accessing source code from a local path or remote repository.
 * Implementations must enforce workspace containment and keep repository credentials from
 * returned values. Paths are always relative to the returned workspace unless documented.
 */
export interface RepoAdapter {
  prepare(reference: RepositoryReference): Promise<RepositoryWorkspace>;
  list(workspace: RepositoryWorkspace, path?: string): Promise<readonly RepositoryEntry[]>;
  read(workspace: RepositoryWorkspace, path: string): Promise<BinaryContent>;
  release(workspace: RepositoryWorkspace): Promise<void>;
}

export {
  GitCloneRepo,
  LocalPathRepo,
  RepoAdapterError,
  type GitCloneRepoOptions,
  type LocalPathRepoOptions,
} from './repoAdapters.js';
