import { activityRepositoryAdapter as supabase } from './supabase/activityRepository';
import { createMockActivityRepository } from './mock/activityRepository';
import { createDataSourceResolver } from './createDataSourceResolver';
import type { ActivityRepository } from '../interfaces/activityRepository';

export const activityRepositoryAdapter: ActivityRepository = createDataSourceResolver<ActivityRepository>({
  supabase,
  mock: createMockActivityRepository(),
});
