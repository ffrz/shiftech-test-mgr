import { testPlanRepositoryAdapter } from './adapters/testPlanResolver';
import type { TestPlanRepository } from './interfaces/testPlanRepository';

export const testPlanRepository: TestPlanRepository = testPlanRepositoryAdapter;
