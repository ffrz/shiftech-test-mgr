import { apiTokenRepositoryAdapter as supabase } from './supabase/apiTokenRepository';
import { createMockApiTokenRepository } from './mock/apiTokenRepository';
import { createDataSourceResolver } from './createDataSourceResolver';
import type { ApiTokenRepository } from '../interfaces/apiTokenRepository';

export const apiTokenRepositoryAdapter: ApiTokenRepository = createDataSourceResolver<ApiTokenRepository>({
  supabase,
  mock: createMockApiTokenRepository(),
});
