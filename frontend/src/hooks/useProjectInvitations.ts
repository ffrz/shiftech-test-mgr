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
    if (!user) return;
    queryClient.invalidateQueries({ queryKey: queryKeys.ownPendingInvitations(user.id) });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['projects'] });
  }

  async function accept(id: string, projectId?: string) {
    try {
      await projectMemberService.accept(id);
      invalidate();
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.projectMembers(projectId) });
      }
      return true;
    } catch (err) {
      console.error('Failed to accept invitation', err);
      return false;
    }
  }

  async function decline(id: string, projectId?: string) {
    try {
      await projectMemberService.decline(id);
      invalidate();
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.projectMembers(projectId) });
      }
      return true;
    } catch (err) {
      console.error('Failed to decline invitation', err);
      return false;
    }
  }

  return {
    invitations: data ?? [],
    loading: isLoading,
    accept,
    decline,
  };
}
