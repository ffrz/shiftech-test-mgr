import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '../services/dashboardService';
import { queryKeys } from './queryKeys';
import { useAuthContext } from './useAuth';

export function useDashboard() {
  const { user } = useAuthContext();

  const { data: counts, isLoading: countsLoading } = useQuery({
    queryKey: queryKeys.dashboardCounts(user?.id ?? ''),
    queryFn: () => dashboardService.getCounts(user!.id),
    enabled: !!user,
  });

  const { data: recentProjects, isLoading: recentProjectsLoading } = useQuery({
    queryKey: queryKeys.dashboardRecentProjects(),
    queryFn: () => dashboardService.getRecentProjects(),
  });

  const { data: continueWorking, isLoading: continueWorkingLoading } = useQuery({
    queryKey: queryKeys.dashboardContinueWorking(),
    queryFn: () => dashboardService.getContinueWorking(),
  });

  const { data: myWorkIssues, isLoading: myWorkLoading } = useQuery({
    queryKey: queryKeys.dashboardMyWork(user?.id ?? ''),
    queryFn: () => dashboardService.getMyWorkIssues(user!.id),
    enabled: !!user,
  });

  const { data: recentActivity, isLoading: activityLoading } = useQuery({
    queryKey: queryKeys.dashboardActivity(),
    queryFn: () => dashboardService.getRecentActivity(),
  });

  return {
    counts: counts ?? {
      projectCount: 0,
      testPlanCount: 0,
      testCaseCount: 0,
      issueCount: 0,
      openIssueCount: 0,
      testSuiteOwnedCount: 0,
      runningTestRunCount: 0,
    },
    recentProjects: recentProjects ?? [],
    continueWorking: continueWorking ?? [],
    myWorkIssues: myWorkIssues ?? [],
    recentActivity: recentActivity ?? [],
    loading: countsLoading || recentProjectsLoading || continueWorkingLoading,
    myWorkLoading,
    activityLoading,
  };
}
