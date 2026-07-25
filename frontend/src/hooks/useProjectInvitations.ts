import { useQuery, useQueryClient } from '@tanstack/react-query';
import { projectMemberService } from '../services/projectMemberService';
import { useAuthContext } from './useAuth';
import { queryKeys } from './queryKeys';

// Current user's own pending project invitations (status='invited') — see
// docs/ROADMAP_V2.md Phase 4. Kept as a simple list, not a notification system.
export function useProjectInvitations() {
  const { user } = useAuthContext();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.ownPendingInvitations(user?.id ?? ''),
    queryFn: () => projectMemberService.listOwnPendingInvitations(user!.id),
    enabled: !!user,
  });

  function invalidate() {
    if (user) queryClient.invalidateQueries({ queryKey: queryKeys.ownPendingInvitations(user.id) });
  }

  async function accept(id: string) {
    await projectMemberService.accept(id);
    invalidate();
  }

  async function decline(id: string) {
    await projectMemberService.decline(id);
    invalidate();
  }

  return {
    invitations: data ?? [],
    loading: isLoading,
    accept,
    decline,
  };
}
