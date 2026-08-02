import { userRepositoryAdapter as supabase } from './supabase/userRepository';
import { createMockUserRepository } from './mock/userRepository';
import { createDataSourceResolver } from './createDataSourceResolver';
import type { UserRepository } from '../interfaces/userRepository';

export const userRepositoryAdapter: UserRepository = createDataSourceResolver<UserRepository>({
  supabase,
  mock: createMockUserRepository(),
});
