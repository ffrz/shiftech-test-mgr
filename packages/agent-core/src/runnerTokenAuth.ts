import type { AgentIdentity, AuthAdapter, AuthContext, StringMap } from './index.js';

export interface RunnerTokenAuthOptions {
  readonly token: string;
  readonly subject: string;
  readonly displayName?: string;
  readonly metadata?: StringMap;
  readonly bodyParameter?: string;
}

export class RunnerTokenAuthError extends Error {
  constructor(message = 'Agent authentication is unavailable') {
    super(message);
    this.name = 'RunnerTokenAuthError';
  }
}

/** Shared token proof used by the runner and MCP process. */
export class RunnerTokenAuth implements AuthAdapter {
  private token: string | undefined;
  private readonly identity: AgentIdentity;
  private readonly bodyParameter: string;

  constructor(options: RunnerTokenAuthOptions) {
    const token = options.token.trim();
    const subject = options.subject.trim();
    const bodyParameter = options.bodyParameter?.trim() || 'p_token';
    if (!token || !subject || !bodyParameter) throw new RunnerTokenAuthError();

    this.token = token;
    this.bodyParameter = bodyParameter;
    this.identity = {
      subject,
      ...(options.displayName ? { displayName: options.displayName } : {}),
      ...(options.metadata ? { metadata: options.metadata } : {}),
    };
  }

  async getAuthContext(): Promise<AuthContext> {
    if (!this.token) throw new RunnerTokenAuthError();
    return { headers: {}, body: { [this.bodyParameter]: this.token } };
  }

  async getIdentity(): Promise<AgentIdentity> {
    return this.identity;
  }

  async invalidate(): Promise<void> {
    this.token = undefined;
  }
}
