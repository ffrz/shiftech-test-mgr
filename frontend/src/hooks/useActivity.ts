import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { activityService } from '../services/activityService';
import { queryKeys } from './queryKeys';
import { useAuthContext } from './useAuth';
import type { ActivityEntityType } from '../types/domain';

export function useActivity(projectId: string, entityType: ActivityEntityType, entityId: string | null) {
  const { user, profile } = useAuthContext();
  const queryClient = useQueryClient();

  const listQuery = useQuery({
    queryKey: queryKeys.activity(entityType, entityId ?? ''),
    queryFn: () => activityService.listForEntity(entityType, entityId!),
    enabled: !!entityId,
  });

  function invalidate() {
    if (entityId) return queryClient.invalidateQueries({ queryKey: queryKeys.activity(entityType, entityId) });
    return Promise.resolve();
  }

  const addCommentMutation = useMutation({
    mutationFn: (body: string) =>
      activityService.addComment({
        projectId,
        entityType,
        entityId: entityId!,
        actorId: user!.id,
        actorName: profile?.displayName ?? profile?.username ?? 'Someone',
        body,
      }),
    onSuccess: invalidate,
  });

  const editCommentMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: string }) => activityService.editComment(id, body),
    onSuccess: invalidate,
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (id: string) => activityService.softDeleteComment(id),
    onSuccess: invalidate,
  });

  return {
    entries: listQuery.data ?? [],
    loading: listQuery.isLoading,
    addComment: addCommentMutation.mutateAsync,
    editComment: editCommentMutation.mutateAsync,
    deleteComment: deleteCommentMutation.mutateAsync,
  };
}
