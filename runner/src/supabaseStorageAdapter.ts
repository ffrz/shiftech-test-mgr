import type {
  ArtifactDescriptor,
  ArtifactStorageAdapter,
  BinaryContent,
  StoreArtifactRequest,
} from '@testmanager/agent-core';
import type { RunnerConfig } from './config.js';
import { log } from './logger.js';

interface SignResponse {
  bucket: string;
  uploads: Array<{ name: string; path: string; uploadUrl: string }>;
}

export interface SupabaseStorageAdapterOptions {
  supabaseUrl: string;
  supabaseAnonKey: string;
  runnerToken: string;
  fetch?: typeof globalThis.fetch;
}

/** Artifact storage implementation backed by signed Supabase Storage uploads. */
export class SupabaseStorageAdapter implements ArtifactStorageAdapter {
  private readonly supabaseUrl: string;
  private readonly supabaseAnonKey: string;
  private readonly runnerToken: string;
  private readonly fetch: typeof globalThis.fetch;

  constructor(options: SupabaseStorageAdapterOptions) {
    this.supabaseUrl = options.supabaseUrl.replace(/\/+$/, '');
    this.supabaseAnonKey = options.supabaseAnonKey;
    this.runnerToken = options.runnerToken;
    this.fetch = options.fetch ?? globalThis.fetch;
  }

  static fromConfig(config: RunnerConfig): SupabaseStorageAdapter {
    return new SupabaseStorageAdapter(config);
  }

  async store(request: StoreArtifactRequest): Promise<ArtifactDescriptor> {
    const jobId = request.metadata?.jobId;
    if (!jobId) throw new Error('jobId wajib disertakan untuk upload artifact');

    try {
      const signingResponse = await this.fetch(
        `${this.supabaseUrl}/functions/v1/automation-artifacts`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: this.supabaseAnonKey,
            Authorization: `Bearer ${this.supabaseAnonKey}`,
          },
          body: JSON.stringify({
            token: this.runnerToken,
            job_id: jobId,
            files: [request.name],
          }),
        },
      );
      if (!signingResponse.ok) {
        throw new Error(
          `Artifact signing failed (${signingResponse.status}): ${(await signingResponse.text()).slice(0, 200)}`,
        );
      }

      const signed = await signingResponse.json() as SignResponse;
      const target = signed.uploads.find((upload) => upload.name === request.name);
      if (signed.uploads.length !== 1 || !target) {
        throw new Error('Edge Function tidak mengembalikan signed URL untuk artifact');
      }

      const uploadResponse = await this.fetch(target.uploadUrl, {
        method: 'PUT',
        headers: { 'content-type': request.contentType, 'x-upsert': 'true' },
        body: request.content,
      });
      if (!uploadResponse.ok) {
        throw new Error(`Artifact upload failed untuk ${request.name} (${uploadResponse.status})`);
      }

      return {
        id: target.path,
        name: request.name,
        contentType: request.contentType,
        size: request.content.byteLength,
        metadata: { bucket: signed.bucket, path: target.path },
      };
    } catch (error) {
      log.warn('Artifact storage operation failed', {
        name: request.name,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async retrieve(_id: string): Promise<BinaryContent> {
    throw new Error('SupabaseStorageAdapter tidak mendukung pengambilan artifact oleh runner');
  }

  async delete(_id: string): Promise<void> {
    throw new Error('SupabaseStorageAdapter tidak mendukung penghapusan artifact oleh runner');
  }
}
