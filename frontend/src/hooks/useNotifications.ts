import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationRepository } from '../repositories/notificationRepository';
import { queryKeys } from './queryKeys';
import { useAuthContext } from './useAuth';

export function useNotifications() {
  const { user } = useAuthContext();
  const queryClient = useQueryClient();
  const userId = user?.id;

  const listQuery = useQuery({
    queryKey: queryKeys.notifications(),
    queryFn: () => notificationRepository.findAllByUser(userId!),
    enabled: !!userId,
  });

  const unreadCountQuery = useQuery({
    queryKey: queryKeys.notificationsUnreadCount(),
    queryFn: () => notificationRepository.findUnreadCount(userId!),
    enabled: !!userId,
    refetchInterval: 30_000,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationRepository.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications() });
      queryClient.invalidateQueries({ queryKey: queryKeys.notificationsUnreadCount() });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationRepository.markAllRead(userId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications() });
      queryClient.invalidateQueries({ queryKey: queryKeys.notificationsUnreadCount() });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => notificationRepository.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications() });
      queryClient.invalidateQueries({ queryKey: queryKeys.notificationsUnreadCount() });
    },
  });

  const clearAllMutation = useMutation({
    mutationFn: () => notificationRepository.removeAll(userId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications() });
      queryClient.invalidateQueries({ queryKey: queryKeys.notificationsUnreadCount() });
    },
  });

  return {
    notifications: listQuery.data ?? [],
    unreadCount: unreadCountQuery.data ?? 0,
    loading: listQuery.isLoading,
    markRead: markReadMutation.mutate,
    markAllRead: markAllReadMutation.mutate,
    remove: removeMutation.mutate,
    clearAll: clearAllMutation.mutate,
  };
}
