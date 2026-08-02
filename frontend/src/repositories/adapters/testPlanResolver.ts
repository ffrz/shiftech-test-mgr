import { testPlanRepositoryAdapter as supabase } from './supabase/testPlanRepository';
import { createMockTestPlanRepository } from './mock/testPlanRepository';
import { createDataSourceResolver } from './createDataSourceResolver';
import type { TestPlanRepository } from '../interfaces/testPlanRepository';

export const testPlanRepositoryAdapter: TestPlanRepository = createDataSourceResolver<TestPlanRepository>({
  supabase,
  mock: createMockTestPlanRepository(),
});
