-- Snapshots test_plan_cases.order onto test_results at the moment a run starts, so a run's
-- item order always matches the plan's order at that time (drag-reorder in the plan later
-- doesn't retroactively reshuffle an already-started run) — same rationale as the other
-- test_case_* snapshot columns in schema_test_result_snapshot.sql. Run AFTER
-- schema_test_result_snapshot.sql.

alter table test_results add column if not exists "order" integer not null default 0;

-- Backfill existing rows from the current test_plan_cases.order for their test case, since
-- there's no earlier snapshot to recover.
update test_results tr
set "order" = tpc."order"
from test_runs run
join test_plans tp on tp.id = run.test_plan_id
join test_plan_cases tpc on tpc.test_plan_id = tp.id
where run.id = tr.test_run_id and tpc.test_case_id = tr.test_case_id;

create index if not exists idx_test_results_run_order on test_results (test_run_id, "order");
