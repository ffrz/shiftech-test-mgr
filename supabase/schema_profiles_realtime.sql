-- Enables Supabase Realtime on `profiles` so a logged-in user's client picks up
-- role changes (e.g. admin approval) live, instead of requiring logout/login.
-- Run AFTER schema_auth.sql, in Supabase SQL Editor.

alter publication supabase_realtime add table profiles;
