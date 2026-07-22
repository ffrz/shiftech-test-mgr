-- Issue & Feature Tracking v2 — reshape `issues` from "child of exactly one test_result"
-- (test_result_id not null) into a project-level entity, with an N:M link to test_results
-- instead of a mandatory 1:1 FK. Run AFTER schema_project_roles.sql.
--
-- Why: a single Issue should be linkable to zero, one, or many Test Results (e.g. the same
-- regression reappearing in a later run), and Test Results should be linkable to many Issues
-- (already true before this migration). Issue also becomes usable standalone (a feature
-- request, a general finding) without needing a FAIL result to hang off of.

-- === 1. Add new columns to `issues` ===

alter table issues add column if not exists project_id uuid references projects(id) on delete cascade;
alter table issues add column if not exists module_id uuid references modules(id) on delete set null;
alter table issues add column if not exists type text not null default 'bug' check (type in ('bug', 'feature', 'improvement', 'task'));
alter table issues add column if not exists github_links jsonb not null default '[]'::jsonb;

-- === 2. Backfill project_id for existing rows from test_result -> test_run -> test_plan ===
-- Guarded the same way as the junction backfill below — a no-op if test_result_id has
-- already been dropped by a prior partial run of this script.

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'issues' and column_name = 'test_result_id'
  ) then
    update issues i set project_id = tp.project_id
    from test_results res
    join test_runs run on run.id = res.test_run_id
    join test_plans tp on tp.id = run.test_plan_id
    where res.id = i.test_result_id and i.project_id is null;
  end if;
end $$;

alter table issues alter column project_id set not null;

-- === 3. Junction: issue <-> test_result (N:M) ===

create table if not exists issue_test_results (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid not null references issues(id) on delete cascade,
  test_result_id uuid not null references test_results(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (issue_id, test_result_id)
);

create index if not exists idx_issue_test_results_issue on issue_test_results (issue_id);
create index if not exists idx_issue_test_results_test_result on issue_test_results (test_result_id);

-- Migrate the old 1:1 relationship into the junction before dropping the column. Guarded
-- with a column existence check so re-running this script after test_result_id has
-- already been dropped (e.g. a prior partial run) doesn't error out.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'issues' and column_name = 'test_result_id'
  ) then
    insert into issue_test_results (issue_id, test_result_id)
    select id, test_result_id from issues where test_result_id is not null
    on conflict (issue_id, test_result_id) do nothing;
  end if;
end $$;

-- === 4. Junction: issue <-> tag (N:M, reuses the same `tags` table as test cases) ===

create table if not exists issue_tags (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid not null references issues(id) on delete cascade,
  tag_id uuid not null references tags(id) on delete cascade,
  unique (issue_id, tag_id)
);

create index if not exists idx_issue_tags_issue on issue_tags (issue_id);
create index if not exists idx_issue_tags_tag on issue_tags (tag_id);

-- === 5. Drop every existing RLS policy on `issues` first — schema_project_lifecycle.sql
-- (before RBAC) and schema_project_roles.sql (per-project RBAC) both left policies behind
-- that reference test_result_id, and Postgres refuses to drop a column while any policy
-- still depends on it. Dropping all candidate policy names here is safe/idempotent
-- regardless of which migration path this database has actually been through.

drop policy if exists "approved users - issues" on issues;
drop policy if exists "project access - issues" on issues;
drop policy if exists "project access - issues select" on issues;
drop policy if exists "issue managers - issues insert" on issues;
drop policy if exists "issue managers - issues update" on issues;
drop policy if exists "project content deleters - issues delete" on issues;

-- === 6. Drop the old mandatory FK now that data is migrated and no policy depends on it ===

drop index if exists idx_issues_test_result;
drop index if exists idx_issues_test_result_code;
alter table issues drop column if exists test_result_id;

create index if not exists idx_issues_project on issues (project_id);
create index if not exists idx_issues_module on issues (module_id);
create index if not exists idx_issues_type on issues (type);

-- === 7. Issue code trigger: project_id is now direct on `issues`, no more join hop needed ===

create or replace function set_issue_code()
returns trigger as $$
begin
  if new.code is null or new.code = '' then
    new.code := next_entity_code(new.project_id, 'ISS');
  end if;
  return new;
end;
$$ language plpgsql;

create unique index if not exists idx_issues_project_code on issues (project_id, code);

-- === 8. Recreate RLS — mirror the project-scoped access pattern from schema_project_roles.sql ===

alter table issue_test_results enable row level security;
alter table issue_tags enable row level security;

create policy "project access - issues select" on issues for select
  using (has_project_access(project_id));
create policy "issue managers - issues insert" on issues for insert
  with check (can_manage_issues(project_id));
create policy "issue managers - issues update" on issues for update
  using (can_manage_issues(project_id)) with check (can_manage_issues(project_id));
create policy "project content deleters - issues delete" on issues for delete
  using (can_delete_project_content(project_id));

create policy "project access - issue_test_results select" on issue_test_results for select
  using (has_project_access((select project_id from issues where id = issue_id)));
create policy "issue managers - issue_test_results insert" on issue_test_results for insert
  with check (can_manage_issues((select project_id from issues where id = issue_id)));
create policy "issue managers - issue_test_results delete" on issue_test_results for delete
  using (can_manage_issues((select project_id from issues where id = issue_id)));

create policy "project access - issue_tags select" on issue_tags for select
  using (has_project_access((select project_id from issues where id = issue_id)));
create policy "issue managers - issue_tags insert" on issue_tags for insert
  with check (can_manage_issues((select project_id from issues where id = issue_id)));
create policy "issue managers - issue_tags delete" on issue_tags for delete
  using (can_manage_issues((select project_id from issues where id = issue_id)));
