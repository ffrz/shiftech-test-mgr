import { testCaseStepRepositoryAdapter as supabase } from './supabase/testCaseStepRepository';
import { createMockTestCaseStepRepository } from './mock/testCaseStepRepository';
import { createDataSourceResolver } from './createDataSourceResolver';
import type { TestCaseStepRepository } from '../interfaces/testCaseStepRepository';

export const testCaseStepRepositoryAdapter: TestCaseStepRepository = createDataSourceResolver<TestCaseStepRepository>({
  supabase,
  mock: createMockTestCaseStepRepository(),
});
