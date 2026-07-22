import { useQuery, useQueryClient } from '@tanstack/react-query';
import { moduleService } from '../services/moduleService';
import { queryKeys } from './queryKeys';

export function useModules(projectId: string | null) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.modules(projectId ?? ''),
    queryFn: () => moduleService.listByProject(projectId!),
    enabled: !!projectId,
  });

  return {
    modules: data ?? [],
    loading: isLoading,
    reload: () => (projectId ? queryClient.invalidateQueries({ queryKey: queryKeys.modules(projectId) }) : Promise.resolve()),
  };
}
