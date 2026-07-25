import { useQuery, useQueryClient } from '@tanstack/react-query';
import { userService } from '../services/userService';
import { queryKeys } from './queryKeys';

export function useUsers() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.users(),
    queryFn: () => userService.listAll(),
  });

  return {
    users: data ?? [],
    loading: isLoading,
    reload: () => queryClient.invalidateQueries({ queryKey: queryKeys.users() }),
  };
}
