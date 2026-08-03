import { automationRunnerRepositoryAdapter as supabase } from './supabase/automationRunnerRepository';
import { createMockAutomationRunnerRepository } from './mock/automationRunnerRepository';
import { createDataSourceResolver } from './createDataSourceResolver';
import type { AutomationRunnerRepository } from '../interfaces/automationRunnerRepository';

export const automationRunnerRepositoryAdapter: AutomationRunnerRepository = createDataSourceResolver<AutomationRunnerRepository>({
  supabase,
  mock: createMockAutomationRunnerRepository(),
});
