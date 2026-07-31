import { useQuery } from '@tanstack/react-query';
import { profileRepository } from '../repositories/profileRepository';
import { queryKeys } from './queryKeys';
import { useAuthContext } from './useAuth';

// Resolves a project's owner profile, but only when it's not the current user's own
// project — used to show "Owned by ..." on a project someone else shared with you.
export function useProjectOwnerProfile(ownerId: string | null | undefined) {
  const { user } = useAuthContext();
  const isOwnProject = !ownerId || !user?.id || ownerId === user.id;

  const { data: ownerProfile } = useQuery({
    queryKey: queryKeys.profile(ownerId ?? ''),
    queryFn: () => profileRepository.findById(ownerId!),
    enabled: !!ownerId && !isOwnProject,
  });

  return isOwnProject ? null : (ownerProfile ?? null);
}
