-- TestRole (master, scoped per project) — same pattern as Module.
--
-- Represents a role WITHIN the application under test (e.g. Admin/Manager/Member), not a
-- TestManager user role (see profiles.role / project_members.role) — named TestRole to avoid
-- confusion between the two. A test case is often re-run once per app role with different
-- steps/expected results, so target_role moves from free text to a per-project master list,
-- same as Module.
--
-- test_cases.target_role (free text) is replaced by target_role_id (FK). Existing distinct
-- text values are auto-migrated into test_roles rows scoped to the owning project, and
-- test_cases.target_role_id is backfilled to point at them, so no labeling data is lost.
--
-- test_case_template_items.target_role stays free text — templates are global (not
-- project-scoped) and are resolved into the target project's data at clone time, same
-- treatment as module_name.

create table if not exists test_roles (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, name)
);

create trigger trg_test_roles_updated_at before update on test_roles
  for each row execute function set_updated_at();

alter table test_cases add column if not exists target_role_id uuid references test_roles(id) on delete set null;

-- Backfill: one test_roles row per distinct (project_id, target_role text) pair, then point
-- test_cases.target_role_id at it.
insert into test_roles (project_id, name)
select distinct project_id, target_role
from test_cases
where target_role is not null and trim(target_role) <> ''
on conflict (project_id, name) do nothing;

update test_cases tc
set target_role_id = tr.id
from test_roles tr
where tr.project_id = tc.project_id
  and tr.name = tc.target_role
  and tc.target_role is not null;

alter table test_cases drop column if exists target_role;

create index if not exists idx_test_cases_target_role on test_cases (target_role_id);

-- === RLS: same "approved users, full access" shape as modules/tags ===

alter table test_roles enable row level security;
create policy "approved users - test_roles" on test_roles for all
  using (is_approved()) with check (is_approved());
