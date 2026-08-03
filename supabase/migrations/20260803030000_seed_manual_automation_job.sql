-- One-time data seed (not a schema change): enqueue a single automation job
-- for project "Testify", test plan TP-0007, against its first test case,
-- pointed at e2e/tests/auth.spec.ts, so the freshly-ported runner CLI has
-- something to poll and execute end to end.
do $$
declare
  v_project_id uuid;
  v_plan_id uuid;
  v_case_id uuid;
  v_run_id uuid;
  v_creator uuid;
begin
  select id into v_project_id from projects where name ilike 'Testify' order by created_at limit 1;
  select id into v_plan_id from test_plans where code = 'TP-0007' and project_id = v_project_id;

  select tc.test_case_id into v_case_id
  from test_plan_cases tc
  where tc.test_plan_id = v_plan_id
  order by tc."order"
  limit 1;

  if v_case_id is null then
    raise exception 'no test case found in plan %', v_plan_id;
  end if;

  if exists (
    select 1 from test_runs where test_plan_id = v_plan_id and name = 'Manual runner smoke test'
  ) then
    raise notice 'Manual automation job already seeded for TP-0007 — skipping';
    return;
  end if;

  select owner_id into v_creator from projects where id = v_project_id;
  if v_creator is null then
    raise exception 'project % has no owner_id', v_project_id;
  end if;

  raise notice 'about to insert test_runs for plan %', v_plan_id;

  insert into test_runs (project_id, test_plan_id, name)
  values (v_project_id, v_plan_id, 'Manual runner smoke test')
  returning id into v_run_id;

  raise notice 'created test_run %', v_run_id;

  insert into test_results (
    test_run_id, test_case_id, test_case_code, test_case_title, test_case_objective,
    test_case_preconditions, test_case_steps, test_case_expected_result, test_case_priority
  )
  select v_run_id, tc.id, tc.code, tc.title, tc.objective, tc.preconditions, tc.steps, tc.expected_result, tc.priority
  from test_cases tc where tc.id = v_case_id;

  insert into automation_scripts (project_id, test_case_id, script_ref, created_by)
  values (v_project_id, v_case_id, 'e2e/tests/auth.spec.ts', v_creator)
  on conflict (test_case_id) do update set script_ref = excluded.script_ref;

  insert into automation_jobs (project_id, test_run_id, test_case_id, script_ref, max_attempts, created_by)
  values (v_project_id, v_run_id, v_case_id, 'e2e/tests/auth.spec.ts', 1, v_creator);

  raise notice 'Seeded automation job for test case % in run %', v_case_id, v_run_id;
end $$;
