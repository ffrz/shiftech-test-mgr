-- Snapshots the test case template's notes onto test_results, completing the snapshot
-- coverage of the test case content (code/title/objective/preconditions/steps/expected
-- result/priority already snapshotted in 20260701000007_test_result_snapshot.sql). A run's
-- display keeps using the snapshot, so later edits to test_cases.notes don't retroactively
-- change what a completed run recorded.

alter table test_results add column if not exists test_case_notes text;

-- Backfill existing rows from the current (live) test case — one-time best-effort copy for
-- rows seeded before this column existed.
update test_results tr
set test_case_notes = tc.notes
from test_cases tc
where tc.id = tr.test_case_id
  and tr.test_case_notes is null;
