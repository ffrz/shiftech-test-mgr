-- Custom/Unplanned Test Run — run AFTER schema_test_case_steps.sql.
--
-- Allows a Test Run to exist without a Test Plan (test_plan_id becomes nullable),
-- so a user can pick Test Cases directly instead of always starting from a plan's
-- scope. Adds test_runs.project_id directly (mirroring what issues.project_id did
-- in issue_tracking_v2.sql) so the trigger/RLS chain no longer has to join through
-- test_plans to resolve which project a run belongs to.

-- === project_id: add, backfill, make required ===

alter table test_runs add column if not exists project_id uuid references projects(id) on delete cascade;

update test_runs tr set project_id = tp.project_id
  from test_plans tp where tp.id = tr.test_plan_id and tr.project_id is null;

alter table test_runs alter column project_id set not null;

-- === test_plan_id becomes optional ===

alter table test_runs alter column test_plan_id drop not null;

-- Keep project_id consistent with test_plan_id's own project whenever a plan is set.
-- (A plain CHECK constraint can't contain a subquery, so this is enforced via trigger instead.)
create or replace function check_test_run_project_matches_plan()
returns trigger as $$
begin
  if new.test_plan_id is not null then
    if new.project_id != (select project_id from test_plans where id = new.test_plan_id) then
      raise exception 'test_runs.project_id must match test_plans.project_id for the linked test_plan_id';
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_test_run_project_matches_plan on test_runs;
create trigger trg_test_run_project_matches_plan
  before insert or update on test_runs
  for each row execute function check_test_run_project_matches_plan();

-- === Indexes: code uniqueness moves from (test_plan_id, code) to (project_id, code) ===

drop index if exists idx_test_runs_plan_code;
create unique index if not exists idx_test_runs_project_code on test_runs (project_id, code);

drop index if exists idx_test_runs_plan;
create index if not exists idx_test_runs_plan on test_runs (test_plan_id) where test_plan_id is not null;
create index if not exists idx_test_runs_project on test_runs (project_id);

-- === Entity code trigger: use project_id directly, no more join through test_plans ===

create or replace function set_test_run_code()
returns trigger as $$
begin
  if new.code is null or new.code = '' then
    new.code := next_entity_code(new.project_id, 'TR');
  end if;
  return new;
end;
$$ language plpgsql;

-- === RLS: test_runs — resolve project via project_id directly ===

drop policy if exists "project access - test_runs select" on test_runs;
create policy "project access - test_runs select" on test_runs for select
  using (has_project_access(project_id));
drop policy if exists "test runners - test_runs insert" on test_runs;
create policy "test runners - test_runs insert" on test_runs for insert
  with check (can_run_tests(project_id));
drop policy if exists "test runners - test_runs update" on test_runs;
create policy "test runners - test_runs update" on test_runs for update
  using (can_run_tests(project_id)) with check (can_run_tests(project_id));
drop policy if exists "project content deleters - test_runs delete" on test_runs;
create policy "project content deleters - test_runs delete" on test_runs for delete
  using (can_delete_project_content(project_id));

-- === RLS: test_results — resolve project via test_runs.project_id directly ===

drop policy if exists "project access - test_results select" on test_results;
create policy "project access - test_results select" on test_results for select
  using (has_project_access((select project_id from test_runs where id = test_run_id)));
drop policy if exists "test runners - test_results insert" on test_results;
create policy "test runners - test_results insert" on test_results for insert
  with check (can_run_tests((select project_id from test_runs where id = test_run_id)));
drop policy if exists "test runners - test_results update" on test_results;
create policy "test runners - test_results update" on test_results for update
  using (can_run_tests((select project_id from test_runs where id = test_run_id)))
  with check (can_run_tests((select project_id from test_runs where id = test_run_id)));
drop policy if exists "project content deleters - test_results delete" on test_results;
create policy "project content deleters - test_results delete" on test_results for delete
  using (can_delete_project_content((select project_id from test_runs where id = test_run_id)));

-- === RLS: test_result_steps — resolve project via test_runs.project_id directly ===

drop policy if exists "project access - test_result_steps select" on test_result_steps;
create policy "project access - test_result_steps select" on test_result_steps for select
  using (has_project_access((
    select run.project_id from test_results res
    join test_runs run on run.id = res.test_run_id
    where res.id = test_result_id
  )));
drop policy if exists "test runners - test_result_steps insert" on test_result_steps;
create policy "test runners - test_result_steps insert" on test_result_steps for insert
  with check (can_run_tests((
    select run.project_id from test_results res
    join test_runs run on run.id = res.test_run_id
    where res.id = test_result_id
  )));
drop policy if exists "test runners - test_result_steps update" on test_result_steps;
create policy "test runners - test_result_steps update" on test_result_steps for update
  using (can_run_tests((
    select run.project_id from test_results res
    join test_runs run on run.id = res.test_run_id
    where res.id = test_result_id
  )))
  with check (can_run_tests((
    select run.project_id from test_results res
    join test_runs run on run.id = res.test_run_id
    where res.id = test_result_id
  )));
drop policy if exists "project content deleters - test_result_steps delete" on test_result_steps;
create policy "project content deleters - test_result_steps delete" on test_result_steps for delete
  using (can_delete_project_content((
    select run.project_id from test_results res
    join test_runs run on run.id = res.test_run_id
    where res.id = test_result_id
  )));
