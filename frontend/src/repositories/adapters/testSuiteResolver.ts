import { testSuiteRepositoryAdapter as supabase } from './supabase/testSuiteRepository';
import { createMockTestSuiteRepository } from './mock/testSuiteRepository';
import { createDataSourceResolver } from './createDataSourceResolver';
import type { TestSuiteRepository } from '../interfaces/testSuiteRepository';

export const testSuiteRepositoryAdapter: TestSuiteRepository = createDataSourceResolver<TestSuiteRepository>({
  supabase,
  mock: createMockTestSuiteRepository(),
});
