-- Fix enqueue_automation_job_for_case (20260803020000): test_runs.project_id is a
-- required column as of 20260701000017_custom_test_runs.sql (test_plan_id alone is
-- no longer enough — the set_test_run_code() trigger reads new.project_id directly,
-- not resolved via a join), so the original insert violated its not-null constraint.
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

  insert into test_runs (project_id, test_plan_id, name)
  values (p_project_id, p_test_plan_id, coalesce(nullif(trim(p_run_name), ''), 'Manual automation run'))
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
