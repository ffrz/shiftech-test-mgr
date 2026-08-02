import { projectMemberRepositoryAdapter as supabase } from './supabase/projectMemberRepository';
import { createMockProjectMemberRepository } from './mock/projectMemberRepository';
import { createDataSourceResolver } from './createDataSourceResolver';
import type { ProjectMemberRepository } from '../interfaces/projectMemberRepository';

export const projectMemberRepositoryAdapter: ProjectMemberRepository = createDataSourceResolver<ProjectMemberRepository>({
  supabase,
  mock: createMockProjectMemberRepository(),
});
