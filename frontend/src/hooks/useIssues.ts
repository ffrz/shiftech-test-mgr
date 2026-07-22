import { useQuery, useQueryClient } from '@tanstack/react-query';
import { issueService } from '../services/issueService';
import { queryKeys } from './queryKeys';

export function useIssuesByProject(projectId: string | null) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.issuesByProject(projectId ?? ''),
    queryFn: () => issueService.listByProject(projectId!),
    enabled: !!projectId,
  });

  return {
    issues: data ?? [],
    loading: isLoading,
    reload: () =>
      projectId ? queryClient.invalidateQueries({ queryKey: queryKeys.issuesByProject(projectId) }) : Promise.resolve(),
  };
}

export function useIssuesByTestRun(testRunId: string | null) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.issuesByTestRun(testRunId ?? ''),
    queryFn: () => issueService.listByTestRun(testRunId!),
    enabled: !!testRunId,
  });

  return {
    issues: data ?? [],
    loading: isLoading,
    reload: () =>
      testRunId ? queryClient.invalidateQueries({ queryKey: queryKeys.issuesByTestRun(testRunId) }) : Promise.resolve(),
  };
}
