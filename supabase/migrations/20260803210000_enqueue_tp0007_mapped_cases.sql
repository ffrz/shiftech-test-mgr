-- Enqueue automation jobs for every test case in TP-0007 that already has an
-- automation_scripts mapping (currently just TC-0080 -> e2e/tests/auth.spec.ts).
-- One Test Run for the whole batch, one automation_job per mapped case.
do $$
declare
  v_project_id uuid;
  v_plan_id uuid;
  v_run_id uuid;
  v_creator uuid;
  v_job_count int := 0;
begin
  select id into v_project_id from projects where name ilike 'Testify' order by created_at limit 1;
  select id into v_plan_id from test_plans where code = 'TP-0007' and project_id = v_project_id;

  if v_plan_id is null then
    raise exception 'TP-0007 not found';
  end if;

  select owner_id into v_creator from projects where id = v_project_id;

  insert into test_runs (project_id, test_plan_id, name)
  values (v_project_id, v_plan_id, 'Runner batch run (all mapped cases)')
  returning id into v_run_id;

  insert into test_results (
    test_run_id, test_case_id, test_case_code, test_case_title, test_case_objective,
    test_case_preconditions, test_case_steps, test_case_expected_result, test_case_priority
  )
  select v_run_id, tc.id, tc.code, tc.title, tc.objective, tc.preconditions, tc.steps, tc.expected_result, tc.priority
  from test_plan_cases tpc
  join test_cases tc on tc.id = tpc.test_case_id
  join automation_scripts s on s.test_case_id = tc.id
  where tpc.test_plan_id = v_plan_id;

  insert into automation_jobs (project_id, test_run_id, test_case_id, script_ref, max_attempts, created_by)
  select v_project_id, v_run_id, s.test_case_id, s.script_ref, 1, v_creator
  from test_plan_cases tpc
  join automation_scripts s on s.test_case_id = tpc.test_case_id
  where tpc.test_plan_id = v_plan_id;
  get diagnostics v_job_count = row_count;

  raise notice 'Enqueued % job(s) in test_run %', v_job_count, v_run_id;
end $$;
