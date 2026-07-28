-- Notifications — run AFTER schema_project_members.sql.
--
-- Stores in-app notifications for users (currently used for project invitations).
-- RLS: users can only see their own notifications; inserts are allowed via
-- security definer function so service code can create notifications for any user.
-- Marking read/delete is self-service.

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  reference_type text,
  reference_id text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_user on notifications (user_id);
create index if not exists idx_notifications_user_unread on notifications (user_id, is_read) where is_read = false;

-- === RLS ===

alter table notifications enable row level security;

-- Users can read own notifications
create policy "read own notifications" on notifications for select
  using (user_id = auth.uid());

-- Users can update own notifications (e.g. mark as read)
create policy "update own notifications" on notifications for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Users can delete own notifications
create policy "delete own notifications" on notifications for delete
  using (user_id = auth.uid());

-- Security definer function so the app can insert notifications for any user
-- (the invite flow runs under the inviter's auth, not the invitee's).
create or replace function create_notification(p_user_id uuid, p_type text, p_title text, p_body text default null, p_reference_type text default null, p_reference_id text default null)
returns uuid as $$
declare
  v_id uuid;
begin
  insert into public.notifications (user_id, type, title, body, reference_type, reference_id)
  values (p_user_id, p_type, p_title, p_body, p_reference_type, p_reference_id)
  returning id into v_id;
  return v_id;
end;
$$ language plpgsql security definer set search_path = public;
