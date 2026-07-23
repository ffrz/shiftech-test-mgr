-- Auto-approve new signups (testing convenience): new users start as 'user' instead
-- of 'pending', skipping the manual admin-approval step. Project isolation is unaffected
-- since project_members / has_project_access() already scope all data per-project,
-- not per-role. To revert, change 'user' back to 'pending' below.

create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url, role)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    'user'
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public;
