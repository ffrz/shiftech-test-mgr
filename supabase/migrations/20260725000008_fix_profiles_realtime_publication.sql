-- Fix: the new `profiles` table (created in 20260725000005's users/profiles split)
-- was never added to the supabase_realtime publication. The OLD `profiles` table was
-- in the publication (via 20260701000015_profiles_realtime.sql), and Postgres carried
-- that membership forward to `users` when it was renamed -- but the brand-new `profiles`
-- table created afterward needed its own explicit add, which the split migration missed.
--
-- Impact without this fix: frontend/src/hooks/useRealtimeSync.ts subscribes to
-- postgres_changes on table 'profiles' (username/display_name/avatar/bio changes) --
-- those events never fire, so other open clients don't see profile updates until their
-- own next fetch. Not a data-integrity issue, just a realtime-freshness gap (caught by
-- the Phase 1 migration verification pass).
--
-- Guarded the same way as 20260701000016_realtime_sync.sql, so re-running this is safe.

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'profiles'
  ) then
    execute 'alter publication supabase_realtime add table profiles';
  end if;
end $$;
