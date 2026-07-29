-- Called from the client-side auth hook when a returning user's account was previously
-- deleted (users.deleted_at is set). Restores the public.users/profiles rows so the
-- user can use the app again with a fresh identity.
--
-- Parameters come from the client-side session (session.user.email / .user_metadata)
-- to avoid querying auth.users directly from a definer function.
--
-- The new username is generated from the email local-part, same algorithm as
-- handle_new_user(), with a numeric suffix on collision.

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
