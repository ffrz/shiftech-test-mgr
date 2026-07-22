-- Enables Supabase Realtime replication on the tables the frontend's central realtime
-- subscriber (frontend/src/hooks/useRealtimeSync.ts) listens to, so postgres_changes events
-- actually reach subscribed clients — without this, `.channel(...).on('postgres_changes', ...)`
-- silently receives nothing no matter how correct the client code is.
-- Run AFTER schema_profiles_realtime.sql (which already enabled this for `profiles`).
--
-- Guarded per-table so re-running this script (or running it after some tables were
-- already added manually via the Dashboard) doesn't error on "relation is already member
-- of publication".

do $$
declare
  t text;
begin
  foreach t in array array['test_results', 'test_runs', 'issues', 'test_plan_cases', 'test_cases', 'modules', 'tags', 'projects']
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table %I', t);
    end if;
  end loop;
end $$;
