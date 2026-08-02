export type DataSourceName = 'supabase' | 'rest' | 'mock' | 'memory';

const ENV_DATA_SOURCE = (import.meta.env.VITE_DATA_SOURCE as DataSourceName | undefined) ?? 'supabase';

/**
 * Generic resolver factory — one call per domain (Project, Issue, TestRun,
 * ...), instead of every domain's switch logic piling up in a single
 * shared file. Each domain gets its own small resolver file (e.g.
 * projectResolver.ts) that calls this with just its own adapter map:
 *
 *   const projectDataSource = createDataSourceResolver<ProjectRepository>({
 *     supabase: supabaseProjectRepository,
 *     rest: restProjectRepository,
 *   });
 *
 * Falls back to 'supabase' if VITE_DATA_SOURCE names a source this domain
 * hasn't wired an adapter for yet (e.g. only Project has a 'rest' adapter
 * today) — avoids a domain silently breaking because a *different*
 * domain's adapter isn't implemented.
 */
export function createDataSourceResolver<T>(adapters: Partial<Record<DataSourceName, T>>): T {
  const selected = adapters[ENV_DATA_SOURCE] ?? adapters.supabase;
  if (!selected) {
    throw new Error(
      `createDataSourceResolver: no 'supabase' adapter registered — every domain must at least provide the Supabase implementation as fallback.`,
    );
  }
  return selected;
}
