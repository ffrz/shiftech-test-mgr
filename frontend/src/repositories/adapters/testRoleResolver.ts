import { testRoleRepositoryAdapter as supabase } from './supabase/testRoleRepository';
import { createMockTestRoleRepository } from './mock/testRoleRepository';
import { createDataSourceResolver } from './createDataSourceResolver';
import type { TestRoleRepository } from '../interfaces/testRoleRepository';

export const testRoleRepositoryAdapter: TestRoleRepository = createDataSourceResolver<TestRoleRepository>({
  supabase,
  mock: createMockTestRoleRepository(),
});
