import { dashboardRepositoryAdapter as supabase } from './supabase/dashboardRepository';
import { createMockDashboardRepository } from './mock/dashboardRepository';
import { createDataSourceResolver } from './createDataSourceResolver';
import type { DashboardRepository } from '../interfaces/dashboardRepository';

export const dashboardRepositoryAdapter: DashboardRepository = createDataSourceResolver<DashboardRepository>({
  supabase,
  mock: createMockDashboardRepository(),
});
