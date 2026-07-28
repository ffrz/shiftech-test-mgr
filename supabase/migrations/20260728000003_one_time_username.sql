-- One-time username change — add username_changed column + DB-level enforcement
-- Trigger prevents changing username after the first change.

alter table profiles add column if not exists username_changed boolean not null default false;

-- Backfill: mark all existing profiles as already-changed so existing users
-- cannot change their username post-migration (they already had one auto-generated).
update profiles set username_changed = true;

create or replace function check_username_change()
returns trigger as $$
begin
  if NEW.username is distinct from OLD.username then
    if OLD.username_changed then
      raise exception 'Username can only be changed once.';
    end if;
    NEW.username_changed := true;
  end if;
  return NEW;
end;
$$ language plpgsql security definer set search_path = public;

create trigger trg_profiles_username_change before update on profiles
  for each row execute function check_username_change();
