import { testRunRepositoryAdapter as supabase } from './supabase/testRunRepository';
import { createMockTestRunRepository } from './mock/testRunRepository';
import { createDataSourceResolver } from './createDataSourceResolver';
import type { TestRunRepository } from '../interfaces/testRunRepository';

export const testRunRepositoryAdapter: TestRunRepository = createDataSourceResolver<TestRunRepository>({
  supabase,
  mock: createMockTestRunRepository(),
});
