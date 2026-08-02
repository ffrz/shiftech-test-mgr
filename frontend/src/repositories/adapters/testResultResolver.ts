import { testResultRepositoryAdapter as supabase } from './supabase/testResultRepository';
import { createMockTestResultRepository } from './mock/testResultRepository';
import { createDataSourceResolver } from './createDataSourceResolver';
import type { TestResultRepository } from '../interfaces/testResultRepository';

export const testResultRepositoryAdapter: TestResultRepository = createDataSourceResolver<TestResultRepository>({
  supabase,
  mock: createMockTestResultRepository(),
});
