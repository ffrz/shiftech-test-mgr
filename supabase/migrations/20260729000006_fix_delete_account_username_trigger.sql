-- delete_account() RPC failed with "Username can only be changed once." because the
-- check_username_change trigger (20260728000003) blocked the profiles.username update
-- when username_changed was already true.
--
-- Fix: allow the trigger to be bypassed via a session variable
-- (app.skip_username_check) that delete_account / reactivate_account set before
-- modifying the profile.

create or replace function check_username_change()
returns trigger as $$
begin
  if NEW.username is distinct from OLD.username then
    if current_setting('app.skip_username_check', true) = 'true' then
      return NEW;
    end if;
    if OLD.username_changed then
      raise exception 'Username can only be changed once.';
    end if;
    NEW.username_changed := true;
  end if;
  return NEW;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function delete_account()
returns void as $$
declare
  v_user_id uuid := auth.uid();
  v_ts text;
begin
  v_ts := floor(extract(epoch from now()) * 1000)::text;

  delete from projects where owner_id = v_user_id;
  delete from test_suites where owner_id = v_user_id;
  delete from notifications where user_id = v_user_id;

  update test_results set tester_id = null where tester_id = v_user_id;
  update issues set assigned_to = null where assigned_to = v_user_id;
  delete from project_members where user_id = v_user_id;

  perform set_config('app.skip_username_check', 'true', true);
  update profiles set
    username = 'deleted_' || v_ts,
    display_name = null,
    avatar_url = null,
    bio = null,
    username_changed = false
  where id = v_user_id;

  update users set
    email = 'deleted_' || v_ts || '@deleted.local',
    full_name = null,
    avatar_url = null,
    deleted_at = now()
  where id = v_user_id;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function reactivate_account(
  p_email text,
  p_full_name text default null,
  p_avatar_url text default null
)
returns void as $$
declare
  v_user_id uuid := auth.uid();
  v_base_username text;
  v_username text;
  v_suffix int := 0;
begin
  v_base_username := regexp_replace(lower(split_part(coalesce(p_email, 'user@deleted.local'), '@', 1)), '[^a-z0-9_]', '_', 'g');
  v_username := v_base_username;

  while exists (select 1 from profiles where username = v_username and id != v_user_id) loop
    v_suffix := v_suffix + 1;
    v_username := v_base_username || '_' || v_suffix;
  end loop;

  perform set_config('app.skip_username_check', 'true', true);
  update users set
    email = p_email,
    full_name = p_full_name,
    avatar_url = p_avatar_url,
    deleted_at = null,
    role = 'user'
  where id = v_user_id;

  update profiles set
    username = v_username,
    display_name = p_full_name,
    avatar_url = p_avatar_url,
    username_changed = false
  where id = v_user_id;
end;
$$ language plpgsql security definer set search_path = public;
