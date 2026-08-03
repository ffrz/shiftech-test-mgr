-- One-shot manual enqueue helper, for trying the runner end-to-end before any
-- real "Enqueue for Test Plan" UI/RPC exists (that's the Go MCP backend's job,
-- see backend/service/automation_service.go Enqueue — not duplicated here).
--
-- Takes a single Test Case that already belongs to a Test Plan you pick, creates
-- a Test Run, seeds one test_results row, upserts the automation_scripts mapping
-- for that case, and queues one automation_jobs row targeting it. Manager-only
-- (authenticated + can_edit_project_content), meant to be called once from the
-- browser console, not wired into any UI.
create or replace function enqueue_automation_job_for_case(
  p_project_id uuid,
  p_test_plan_id uuid,
  p_test_case_id uuid,
  p_script_ref text,
  p_run_name text default 'Manual automation run'
) returns jsonb as $$
declare
  v_run test_runs;
  v_job automation_jobs;
begin
  if not can_edit_project_content(p_project_id) then raise exception 'FORBIDDEN'; end if;
  if (select project_id from test_plans where id = p_test_plan_id) <> p_project_id then
    raise exception 'PLAN_PROJECT_MISMATCH';
  end if;
  if (select project_id from test_cases where id = p_test_case_id) <> p_project_id then
    raise exception 'CASE_PROJECT_MISMATCH';
  end if;
  if length(trim(coalesce(p_script_ref, ''))) not between 1 and 500 then
    raise exception 'INVALID_SCRIPT_REF';
  end if;

  insert into test_runs (test_plan_id, name)
  values (p_test_plan_id, coalesce(nullif(trim(p_run_name), ''), 'Manual automation run'))
  returning * into v_run;

  insert into test_results (test_run_id, test_case_id)
  values (v_run.id, p_test_case_id);

  insert into automation_scripts (project_id, test_case_id, script_ref, created_by)
  values (p_project_id, p_test_case_id, trim(p_script_ref), auth.uid())
  on conflict (test_case_id) do update set script_ref = excluded.script_ref;

  insert into automation_jobs (project_id, test_run_id, test_case_id, script_ref, max_attempts, created_by)
  values (p_project_id, v_run.id, p_test_case_id, trim(p_script_ref), 1, auth.uid())
  returning * into v_job;

  return jsonb_build_object('test_run_id', v_run.id, 'job_id', v_job.id);
end; $$ language plpgsql security definer set search_path = public, extensions;

revoke all on function enqueue_automation_job_for_case(uuid, uuid, uuid, text, text) from public, anon;
grant execute on function enqueue_automation_job_for_case(uuid, uuid, uuid, text, text) to authenticated;
