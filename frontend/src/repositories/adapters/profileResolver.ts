import { profileRepositoryAdapter as supabase } from './supabase/profileRepository';
import { createMockProfileRepository } from './mock/profileRepository';
import { createDataSourceResolver } from './createDataSourceResolver';
import type { ProfileRepository } from '../interfaces/profileRepository';

export const profileRepositoryAdapter: ProfileRepository = createDataSourceResolver<ProfileRepository>({
  supabase,
  mock: createMockProfileRepository(),
});
