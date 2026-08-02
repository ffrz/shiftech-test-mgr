import { testCaseRepositoryAdapter as supabase } from './supabase/testCaseRepository';
import { createMockTestCaseRepository } from './mock/testCaseRepository';
import { createDataSourceResolver } from './createDataSourceResolver';
import type { TestCaseRepository } from '../interfaces/testCaseRepository';

export const testCaseRepositoryAdapter: TestCaseRepository = createDataSourceResolver<TestCaseRepository>({
  supabase,
  mock: createMockTestCaseRepository(),
});
