-- Adds an auto-generated, per-project `code` to issues (ISS-0001), following the same
-- pattern as modules/test_cases/test_plans/test_runs in schema_entity_codes.sql.
-- Run AFTER schema_entity_codes.sql.
--
-- issues has no project_id of its own — resolve it through
-- test_result -> test_run -> test_plan -> project, same hop pattern already used
-- for test_runs (which resolves through test_plan -> project).

alter table issues add column if not exists code text;

create or replace function set_issue_code()
returns trigger as $$
declare
  v_project_id uuid;
begin
  if new.code is null or new.code = '' then
    select tp.project_id into v_project_id
    from test_results tr
    join test_runs run on run.id = tr.test_run_id
    join test_plans tp on tp.id = run.test_plan_id
    where tr.id = new.test_result_id;

    new.code := next_entity_code(v_project_id, 'ISS');
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_issues_set_code before insert on issues
  for each row execute function set_issue_code();

update issues i set code = next_entity_code(tp.project_id, 'ISS')
  from test_results tr
  join test_runs run on run.id = tr.test_run_id
  join test_plans tp on tp.id = run.test_plan_id
  where tr.id = i.test_result_id and i.code is null;

alter table issues alter column code set not null;
create unique index if not exists idx_issues_test_result_code on issues (test_result_id, code);
