import { supabase } from '../config/supabaseClient';
import { notificationRepository } from '../repositories/notificationRepository';

// Notifications are mostly read-only for the current user (read/mark/delete/markAll).
// Creation goes through a security definer Postgres function so the invite flow
// (running under the inviter's auth) can insert rows for the invitee.

export const notificationService = {
  async create(
    userId: string,
    type: string,
    title: string,
    body?: string | null,
    referenceType?: string | null,
    referenceId?: string | null,
  ): Promise<void> {
    const { error } = await supabase.rpc('create_notification', {
      p_user_id: userId,
      p_type: type,
      p_title: title,
      p_body: body ?? null,
      p_reference_type: referenceType ?? null,
      p_reference_id: referenceId ?? null,
    });
    if (error) throw error;
  },

  removeByReference(referenceType: string, referenceId: string): Promise<void> {
    return notificationRepository.removeByReference(referenceType, referenceId);
  },
};
