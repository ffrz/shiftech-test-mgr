import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '../services/dashboardService';
import { queryKeys } from './queryKeys';

export function useDashboard() {
  const { data: counts, isLoading: countsLoading } = useQuery({
    queryKey: queryKeys.dashboardCounts(),
    queryFn: () => dashboardService.getCounts(),
  });

  const { data: recentProjects, isLoading: recentProjectsLoading } = useQuery({
    queryKey: queryKeys.dashboardRecentProjects(),
    queryFn: () => dashboardService.getRecentProjects(),
  });

  const { data: continueWorking, isLoading: continueWorkingLoading } = useQuery({
    queryKey: queryKeys.dashboardContinueWorking(),
    queryFn: () => dashboardService.getContinueWorking(),
  });

  return {
    counts: counts ?? { projectCount: 0, testPlanCount: 0, testCaseCount: 0 },
    recentProjects: recentProjects ?? [],
    continueWorking: continueWorking ?? [],
    loading: countsLoading || recentProjectsLoading || continueWorkingLoading,
  };
}
