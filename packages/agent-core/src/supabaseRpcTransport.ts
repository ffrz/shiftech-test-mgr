import type { TransportAdapter, TransportRequest, TransportResponse } from './index.js';

export interface SupabaseRpcTransportOptions {
  readonly supabaseUrl: string;
  readonly supabaseAnonKey: string;
  readonly fetch?: typeof globalThis.fetch;
}

export class SupabaseRpcError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Transport for the Supabase PostgREST RPC endpoint used by local agents. */
export class SupabaseRpcTransport implements TransportAdapter {
  private readonly supabaseUrl: string;
  private readonly supabaseAnonKey: string;
  private readonly fetch: typeof globalThis.fetch;

  constructor(options: SupabaseRpcTransportOptions) {
    this.supabaseUrl = options.supabaseUrl.replace(/\/$/, '');
    this.supabaseAnonKey = options.supabaseAnonKey;
    this.fetch = options.fetch ?? globalThis.fetch;
  }

  async request<TData = unknown, TBody = unknown>(
    request: TransportRequest<TBody>,
  ): Promise<TransportResponse<TData>> {
    const path = request.kind === 'function'
      ? `/functions/v1/${request.operation}`
      : `/rest/v1/rpc/${request.operation}`;
    const response = await this.fetch(
      `${this.supabaseUrl}${path}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: this.supabaseAnonKey,
          Authorization: `Bearer ${this.supabaseAnonKey}`,
          ...request.auth?.headers,
        },
        body: JSON.stringify(
          request.auth?.body
            ? { ...(request.body as object | undefined), ...request.auth.body }
            : request.body,
        ),
      },
    );

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new SupabaseRpcError(
        `RPC ${request.operation} failed (${response.status}): ${text.slice(0, 300)}`,
        response.status,
      );
    }

    const text = await response.text();
    return { data: (text ? JSON.parse(text) : undefined) as TData };
  }
}
