import { moduleRepositoryAdapter as supabase } from './supabase/moduleRepository';
import { createMockModuleRepository } from './mock/moduleRepository';
import { createDataSourceResolver } from './createDataSourceResolver';
import type { ModuleRepository } from '../interfaces/moduleRepository';

export const moduleRepositoryAdapter: ModuleRepository = createDataSourceResolver<ModuleRepository>({
  supabase,
  mock: createMockModuleRepository(),
});
