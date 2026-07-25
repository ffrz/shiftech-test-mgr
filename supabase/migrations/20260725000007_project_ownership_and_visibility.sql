-- Platform Evolution V2, Phase 3 (V2-P3-T01..T09) — project ownership + visibility.
-- See docs/ARCHITECTURE_V2.md §4 (organization-readiness) and §6 (schema).
--
-- `projects.created_by` already exists (added in 20260725000002 to fix an INSERT
-- RETURNING RLS race) and is functionally identical to what the architecture doc calls
-- `owner_id` — same column, renamed here for clarity and to match the domain model.
-- `owner_type` is added as a polymorphic-owner placeholder so Organizations can be
-- added later (see ARCHITECTURE_V2.md §4) without a breaking migration — only
-- 'user' is valid today.

-- === V2-P3-T01: owner_type + rename created_by -> owner_id ===
--
-- owner_id's FK (originally `references profiles(id)`) was silently repointed to
-- `users(id)` by Phase 1's `alter table profiles rename to users` — Postgres FK
-- constraints follow the referenced table's OID, not its name (see
-- 20260725000005's comment on this same mechanism for test_results/issues/
-- project_members). This is correct: owner_id identifies an auth-bound account:
-- to display the owner's name/avatar, join through `profiles` using the same id,
-- same pattern as tester/assignee elsewhere in the app.

alter table projects rename column created_by to owner_id;
alter table projects alter column owner_id drop default;
alter table projects alter column owner_id set default auth.uid();

alter table projects add column if not exists owner_type text not null default 'user'
  check (owner_type in ('user'));

-- === V2-P3-T02/T03: backfill + not null ===
-- owner_id was already backfilled when it was created_by (20260725000002, from the
-- earliest 'manager' project_members row per project). Re-run defensively for any
-- project created between that migration and this one via a path that didn't set it.

update projects p
set owner_id = pm.user_id
from project_members pm
where pm.project_id = p.id and pm.role = 'manager' and p.owner_id is null;

alter table projects alter column owner_id set not null;

-- === V2-P3-T04: visibility ===

alter table projects add column if not exists visibility text not null default 'private'
  check (visibility in ('private', 'unlisted', 'public'));

create index if not exists idx_projects_owner on projects (owner_id);
create index if not exists idx_projects_visibility on projects (visibility) where visibility = 'public';

-- === V2-P3-T05: select RLS — public/unlisted readable without membership ===

drop policy if exists "project access - projects select" on projects;
create policy "project access - projects select" on projects for select
  using (
    visibility in ('public', 'unlisted')
    or owner_id = auth.uid()
    or has_project_access(id)
  );

-- update/delete policies (is_project_manager-gated) are unaffected by visibility —
-- visibility only ever widens READ access, never write access. No change needed to
-- "project managers - projects update"/"project managers - projects delete" from
-- 20260725000003.
