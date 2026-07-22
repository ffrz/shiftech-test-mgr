-- Test Plan / Test Case management schema
-- Run this in the Supabase SQL editor (or via `supabase db push` if using CLI migrations).

create extension if not exists "pgcrypto";

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists test_plans (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null,
  description text,
  status text not null default 'draft' check (status in ('draft', 'active', 'completed', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists test_cases (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  title text not null,
  preconditions text,
  steps text not null,
  expected_result text not null,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'critical')),
  status text not null default 'draft' check (status in ('draft', 'ready', 'deprecated')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Junction table: which test cases are included in a test plan, plus last run result.
create table if not exists test_plan_cases (
  id uuid primary key default gen_random_uuid(),
  test_plan_id uuid not null references test_plans(id) on delete cascade,
  test_case_id uuid not null references test_cases(id) on delete cascade,
  "order" integer not null default 0,
  last_result text not null default 'not_run' check (last_result in ('pass', 'fail', 'blocked', 'skipped', 'not_run')),
  notes text,
  unique (test_plan_id, test_case_id)
);

-- updated_at trigger
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_projects_updated_at before update on projects
  for each row execute function set_updated_at();
create trigger trg_test_plans_updated_at before update on test_plans
  for each row execute function set_updated_at();
create trigger trg_test_cases_updated_at before update on test_cases
  for each row execute function set_updated_at();

-- This is an internal validation tool: RLS is left permissive (auth handled at app level if needed).
alter table projects enable row level security;
alter table test_plans enable row level security;
alter table test_cases enable row level security;
alter table test_plan_cases enable row level security;

create policy "allow all - projects" on projects for all using (true) with check (true);
create policy "allow all - test_plans" on test_plans for all using (true) with check (true);
create policy "allow all - test_cases" on test_cases for all using (true) with check (true);
create policy "allow all - test_plan_cases" on test_plan_cases for all using (true) with check (true);
