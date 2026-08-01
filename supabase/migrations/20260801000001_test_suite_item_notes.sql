-- Test suite items (reusable test case templates) get their own free-text notes field,
-- mirroring test_cases.notes / test_runs.notes — notes live here because suites are not
-- project-scoped, so there's no project to attach them to.
alter table test_suite_items add column if not exists notes text;
