import { readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, extname } from 'node:path';
import type { ReportArtifact } from './api.js';

export interface CollectedArtifact {
  type: ReportArtifact['type'];
  name: string;
  localPath: string;
}

const REQUIRED_FAILURE_ARTIFACT_TYPES: ReadonlySet<ReportArtifact['type']> = new Set([
  'screenshot', 'video', 'trace', 'log', 'network', 'dom',
]);

export function hasCompleteFailureBundle(artifacts: CollectedArtifact[]): boolean {
  const types = new Set(artifacts.map((artifact) => artifact.type));
  return [...REQUIRED_FAILURE_ARTIFACT_TYPES].every((type) => types.has(type));
}

export function classifyArtifact(file: string): ReportArtifact['type'] | null {
  const name = file.toLowerCase();
  const ext = extname(name);
  if (name.includes('trace') && ext === '.zip') return 'trace';
  if (ext === '.har') return 'network';
  if (name.includes('dom-snapshot') && ['.html', '.htm'].includes(ext)) return 'dom';
  if (['.png', '.jpg', '.jpeg'].includes(ext)) return 'screenshot';
  if (['.webm', '.mp4'].includes(ext)) return 'video';
  if (['.txt', '.log'].includes(ext)) return 'log';
  return null;
}

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

// Collect artifact files produced by a job run. Returns local file references;
// uploading/URL construction is handled separately (see upload.ts).
export function collectArtifacts(jobOutputDir: string): CollectedArtifact[] {
  if (!existsSync(jobOutputDir)) return [];
  const artifacts: CollectedArtifact[] = [];
  for (const file of walk(jobOutputDir)) {
    const type = classifyArtifact(file);
    if (!type) continue;
    const name = relative(jobOutputDir, file).split(/[\\/]/).join('/');
    artifacts.push({ type, name, localPath: file });
  }
  return artifacts;
}
