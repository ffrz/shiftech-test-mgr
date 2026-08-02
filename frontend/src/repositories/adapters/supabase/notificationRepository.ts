import { supabase } from '../../../config/supabaseClient';
import { mapNotificationRow } from '../../../helpers/mappers';
import type { Notification } from '../../../types/domain';
import type { NotificationRepository } from '../../interfaces/notificationRepository';

export const notificationRepositoryAdapter: NotificationRepository = {
  async findAllByUser(userId: string): Promise<Notification[]> {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapNotificationRow);
  },

  async findUnreadCount(userId: string): Promise<number> {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);
    if (error) throw error;
    return count ?? 0;
  },

  async markRead(id: string): Promise<void> {
    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    if (error) throw error;
  },

  async markAllRead(userId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);
    if (error) throw error;
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('notifications').delete().eq('id', id);
    if (error) throw error;
  },

  async removeAll(userId: string): Promise<void> {
    const { error } = await supabase.from('notifications').delete().eq('user_id', userId);
    if (error) throw error;
  },

  async removeByReference(referenceType: string, referenceId: string): Promise<void> {
    const { error } = await supabase.rpc('delete_notifications_by_reference', {
      p_reference_type: referenceType,
      p_reference_id: referenceId,
    });
    if (error) throw error;
  },
};
