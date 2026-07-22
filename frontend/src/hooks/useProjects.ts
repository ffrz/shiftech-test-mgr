import { useQuery, useQueryClient } from '@tanstack/react-query';
import { projectService } from '../services/projectService';
import type { ProjectQuery } from '../repositories/projectRepository';
import { queryKeys } from './queryKeys';

export function useProjects(query: ProjectQuery) {
  const queryClient = useQueryClient();
  const key = queryKeys.projects(query);
  const { data, isLoading } = useQuery({
    queryKey: key,
    queryFn: () => projectService.list(query),
  });

  return {
    projects: data ?? [],
    loading: isLoading,
    reload: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
  };
}
