-- Adds a free-text notes field to test_runs, e.g. for context recorded when
-- completing a run (blockers, environment notes, follow-ups). Run AFTER schema_test_management_v2.sql.

alter table test_runs add column if not exists notes text;
