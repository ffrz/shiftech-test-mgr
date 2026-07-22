import { useQuery, useQueryClient } from '@tanstack/react-query';
import { profileService } from '../services/profileService';
import { queryKeys } from './queryKeys';

export function useProfiles() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.profiles(),
    queryFn: () => profileService.listAll(),
  });

  return {
    profiles: data ?? [],
    loading: isLoading,
    reload: () => queryClient.invalidateQueries({ queryKey: queryKeys.profiles() }),
  };
}
