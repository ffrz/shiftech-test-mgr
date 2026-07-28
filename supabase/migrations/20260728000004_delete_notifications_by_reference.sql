-- Lets project member removal clean up the invitee's pending-invite notification (and any
-- realtime-visible invitation card on their Home) even though the actor removing them isn't
-- the notification's owner. Same security-definer pattern as create_notification() in
-- schema_notifications.sql -- the invite/remove flow runs under the actor's auth, not the
-- target user's.

create or replace function delete_notifications_by_reference(p_reference_type text, p_reference_id text)
returns void as $$
begin
  delete from public.notifications
  where reference_type = p_reference_type and reference_id = p_reference_id;
end;
$$ language plpgsql security definer set search_path = public;
