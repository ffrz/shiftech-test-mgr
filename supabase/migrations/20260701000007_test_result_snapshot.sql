-- Snapshots the test case content onto test_results at the moment a run starts, so a
-- completed run's history stays accurate even if the source test case is edited or
-- archived afterwards. test_results.test_case_id is kept (FK to the live test case) only
-- to support the manual "sync" action and to still be able to link back to the template.
-- Run AFTER schema_test_management_v2.sql.

alter table test_results add column if not exists test_case_code text;
alter table test_results add column if not exists test_case_title text;
alter table test_results add column if not exists test_case_objective text;
alter table test_results add column if not exists test_case_preconditions text;
alter table test_results add column if not exists test_case_steps text;
alter table test_results add column if not exists test_case_expected_result text;
alter table test_results add column if not exists test_case_priority text;

-- Backfill existing rows from the current (live) test case, since there is no earlier
-- snapshot to recover — this is a one-time best-effort copy for pre-existing data.
update test_results tr
set
  test_case_code = tc.code,
  test_case_title = tc.title,
  test_case_objective = tc.objective,
  test_case_preconditions = tc.preconditions,
  test_case_steps = tc.steps,
  test_case_expected_result = tc.expected_result,
  test_case_priority = tc.priority
from test_cases tc
where tc.id = tr.test_case_id
  and tr.test_case_title is null;

alter table test_results alter column test_case_title set not null;
alter table test_results alter column test_case_steps set not null;
alter table test_results alter column test_case_expected_result set not null;
alter table test_results alter column test_case_priority set not null;
