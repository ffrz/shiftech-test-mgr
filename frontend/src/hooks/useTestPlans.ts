import { useQuery, useQueryClient } from '@tanstack/react-query';
import { testPlanService } from '../services/testPlanService';
import { queryKeys } from './queryKeys';

// Hook (composable) layer: bridges React state/lifecycle with the service layer.
// Components consume hooks; hooks call services; services call repositories.

export function useTestPlans(projectId: string | null) {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.testPlans(projectId ?? ''),
    queryFn: () => testPlanService.listByProject(projectId!),
    enabled: !!projectId,
  });

  return {
    testPlans: data ?? [],
    loading: isLoading,
    error: error ? (error instanceof Error ? error.message : 'Gagal memuat test plan') : null,
    reload: () =>
      projectId ? queryClient.invalidateQueries({ queryKey: queryKeys.testPlans(projectId) }) : Promise.resolve(),
  };
}
