-- Entity codes (auto-generated, user-editable) — run AFTER schema_test_management_v2.sql.
-- Adds a human-readable `code` column to modules, test_cases, test_plans, test_runs:
-- prefix + zero-padded sequence number, unique per project (per test_plan for test_runs).
-- Auto-filled on insert if the client doesn't supply one; always editable afterwards.

-- === Per-project sequence counter, one row per (project_id, prefix) ===

create table if not exists entity_code_sequences (
  project_id uuid not null references projects(id) on delete cascade,
  prefix text not null,
  last_value integer not null default 0,
  primary key (project_id, prefix)
);

-- Returns the next code for a given project + prefix, e.g. next_entity_code(project_id, 'TC') -> 'TC-0001'.
-- Race-safe: the upsert + returning happens atomically per row lock.
create or replace function next_entity_code(p_project_id uuid, p_prefix text)
returns text as $$
declare
  v_next integer;
begin
  insert into entity_code_sequences (project_id, prefix, last_value)
  values (p_project_id, p_prefix, 1)
  on conflict (project_id, prefix)
  do update set last_value = entity_code_sequences.last_value + 1
  returning last_value into v_next;

  return p_prefix || '-' || lpad(v_next::text, 4, '0');
end;
$$ language plpgsql;

-- === modules.code ===

alter table modules add column if not exists code text;

create or replace function set_module_code()
returns trigger as $$
begin
  if new.code is null or new.code = '' then
    new.code := next_entity_code(new.project_id, 'MOD');
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_modules_set_code before insert on modules
  for each row execute function set_module_code();

update modules set code = next_entity_code(project_id, 'MOD') where code is null;
alter table modules alter column code set not null;
create unique index if not exists idx_modules_project_code on modules (project_id, code);

-- === test_cases.code ===

alter table test_cases add column if not exists code text;

create or replace function set_test_case_code()
returns trigger as $$
begin
  if new.code is null or new.code = '' then
    new.code := next_entity_code(new.project_id, 'TC');
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_test_cases_set_code before insert on test_cases
  for each row execute function set_test_case_code();

update test_cases set code = next_entity_code(project_id, 'TC') where code is null;
alter table test_cases alter column code set not null;
create unique index if not exists idx_test_cases_project_code on test_cases (project_id, code);

-- === test_plans.code ===

alter table test_plans add column if not exists code text;

create or replace function set_test_plan_code()
returns trigger as $$
begin
  if new.code is null or new.code = '' then
    new.code := next_entity_code(new.project_id, 'TP');
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_test_plans_set_code before insert on test_plans
  for each row execute function set_test_plan_code();

update test_plans set code = next_entity_code(project_id, 'TP') where code is null;
alter table test_plans alter column code set not null;
create unique index if not exists idx_test_plans_project_code on test_plans (project_id, code);

-- === test_runs.code ===
-- Test runs don't have a project_id column directly (only test_plan_id) — resolve
-- project_id through the plan so the sequence is still scoped per project, keeping
-- run codes consistent with everything else (TR-0001 within the same project).

alter table test_runs add column if not exists code text;

create or replace function set_test_run_code()
returns trigger as $$
declare
  v_project_id uuid;
begin
  if new.code is null or new.code = '' then
    select project_id into v_project_id from test_plans where id = new.test_plan_id;
    new.code := next_entity_code(v_project_id, 'TR');
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_test_runs_set_code before insert on test_runs
  for each row execute function set_test_run_code();

update test_runs tr set code = next_entity_code(tp.project_id, 'TR')
  from test_plans tp where tp.id = tr.test_plan_id and tr.code is null;
alter table test_runs alter column code set not null;
create unique index if not exists idx_test_runs_plan_code on test_runs (test_plan_id, code);

-- === RLS: entity_code_sequences is internal bookkeeping, same "approved users" policy ===

alter table entity_code_sequences enable row level security;
create policy "approved users - entity_code_sequences" on entity_code_sequences for all
  using (is_approved()) with check (is_approved());
