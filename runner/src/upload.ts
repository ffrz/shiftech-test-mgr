import { readFileSync } from 'node:fs';
import { extname } from 'node:path';
import type { ArtifactStorageAdapter } from '@testmanager/agent-core';
import type { RunnerConfig } from './config.js';
import type { ReportArtifact } from './api.js';
import type { CollectedArtifact } from './artifacts.js';

const MIME: Record<string, string> = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webm': 'video/webm', '.mp4': 'video/mp4', '.zip': 'application/zip',
  '.txt': 'text/plain', '.log': 'text/plain', '.har': 'application/json',
  '.html': 'text/html', '.htm': 'text/html',
};

// Read local artifacts and translate provider-neutral descriptors for reporting.
// Signing and upload protocol details belong to the injected storage adapter.
export async function uploadArtifacts(
  config: RunnerConfig,
  storage: ArtifactStorageAdapter,
  jobId: string,
  collected: CollectedArtifact[],
): Promise<ReportArtifact[]> {
  if (collected.length === 0) return [];
  if (!config.artifactUpload) throw new Error('Upload artifact ke Supabase Storage dinonaktifkan');
  return Promise.all(collected.map(async (artifact): Promise<ReportArtifact> => {
    const descriptor = await storage.store({
      name: artifact.name,
      contentType: MIME[extname(artifact.name).toLowerCase()] ?? 'application/octet-stream',
      content: readFileSync(artifact.localPath),
      metadata: { jobId, artifactType: artifact.type },
    });
    const path = descriptor.metadata?.path ?? descriptor.id;
    return {
      type: artifact.type,
      name: descriptor.name,
      url: path,
      path,
      bucket: descriptor.metadata?.bucket,
    };
  }));
}
