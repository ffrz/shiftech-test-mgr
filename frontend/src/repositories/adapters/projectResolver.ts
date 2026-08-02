import { projectRepositoryAdapter as rest } from './rest/projectRepository';
import { projectRepositoryAdapter as supabase } from './supabase/projectRepository';
import { createMockProjectRepository } from './mock/projectRepository';
import { createDataSourceResolver } from './createDataSourceResolver';
import type { ProjectRepository } from '../interfaces/projectRepository';

// Project's own data source selection — VITE_DATA_SOURCE=rest routes reads
// through backend/rest-api/ instead of Supabase. Each domain gets its own
// small file like this instead of one shared file switching on every
// domain's repository (see createDataSourceResolver.ts for why).
//
// 'mock' here is a single shared empty-seed instance, meant for
// VITE_DATA_SOURCE=mock dev/demo use (no backend at all). Tests that need
// an isolated, seeded in-memory store should call
// createMockProjectRepository(seed) directly instead of going through this
// resolver — a shared instance would leak state between tests.
export const projectRepositoryAdapter: ProjectRepository = createDataSourceResolver<ProjectRepository>({
  supabase,
  rest,
  mock: createMockProjectRepository(),
});
