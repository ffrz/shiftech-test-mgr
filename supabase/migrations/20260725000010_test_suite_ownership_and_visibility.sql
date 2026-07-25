-- Platform Evolution V2, Phase 5 (V2-P5-T01..T07) — Test Suite Template ownership +
-- visibility. Drops the admin-only-write assumption: any user can create their own
-- Test Suite Template, keep it private, or publish it (unlisted/public) for others to
-- clone. See docs/ARCHITECTURE_V2.md (Test Suite Templates) and docs/ROADMAP_V2.md
-- Phase 5 — deliberately small scope: ownership + visibility only, no forking/lineage,
-- no versioning. Clone-into-project mechanic (testSuiteService.cloneItemsToProject)
-- is unchanged.

-- === V2-P5-T01: owner_id ===
--
-- No existing admin account is privileged here — every pre-existing test_suites row
-- becomes owned by the OLDEST admin account (earliest created_at), simply so the
-- column can be NOT NULL. Ownership can be transferred by an admin editing the row
-- directly if a different owner is more appropriate; there's no product requirement
-- driving a "correct" original owner for legacy rows.

alter table test_suites add column if not exists owner_id uuid references users(id);

update test_suites
set owner_id = (select id from users where role = 'admin' order by created_at limit 1)
where owner_id is null;

alter table test_suites alter column owner_id set not null;
alter table test_suites alter column owner_id set default auth.uid();

create index if not exists idx_test_suites_owner on test_suites (owner_id);

-- === V2-P5-T02: visibility ===

alter table test_suites add column if not exists visibility text not null default 'private'
  check (visibility in ('private', 'unlisted', 'public'));

create index if not exists idx_test_suites_visibility on test_suites (visibility) where visibility = 'public';

-- === V2-P5-T03: RLS — owner-or-admin write, visibility-aware read ===

drop policy if exists "approved users - test_suites select" on test_suites;
drop policy if exists "admins - test_suites insert" on test_suites;
drop policy if exists "admins - test_suites update" on test_suites;
drop policy if exists "admins - test_suites delete" on test_suites;

create policy "owner or visible - test_suites select" on test_suites for select
  using (visibility in ('public', 'unlisted') or owner_id = auth.uid() or is_admin());
create policy "owner - test_suites insert" on test_suites for insert
  with check (owner_id = auth.uid() or is_admin());
create policy "owner - test_suites update" on test_suites for update
  using (owner_id = auth.uid() or is_admin()) with check (owner_id = auth.uid() or is_admin());
create policy "owner - test_suites delete" on test_suites for delete
  using (owner_id = auth.uid() or is_admin());

-- === test_suite_items / test_suite_item_steps: follow the parent suite's access ===
--
-- These tables have no owner_id of their own -- access is derived from the parent
-- test_suites row via suite_id, same pattern as e.g. test_plan_cases deriving access
-- from test_plans.project_id elsewhere in this schema.

drop policy if exists "approved users - test_suite_items select" on test_suite_items;
drop policy if exists "admins - test_suite_items insert" on test_suite_items;
drop policy if exists "admins - test_suite_items update" on test_suite_items;
drop policy if exists "admins - test_suite_items delete" on test_suite_items;

create policy "owner or visible - test_suite_items select" on test_suite_items for select
  using (exists (
    select 1 from test_suites s
    where s.id = suite_id and (s.visibility in ('public', 'unlisted') or s.owner_id = auth.uid() or is_admin())
  ));
create policy "owner - test_suite_items insert" on test_suite_items for insert
  with check (exists (select 1 from test_suites s where s.id = suite_id and (s.owner_id = auth.uid() or is_admin())));
create policy "owner - test_suite_items update" on test_suite_items for update
  using (exists (select 1 from test_suites s where s.id = suite_id and (s.owner_id = auth.uid() or is_admin())))
  with check (exists (select 1 from test_suites s where s.id = suite_id and (s.owner_id = auth.uid() or is_admin())));
create policy "owner - test_suite_items delete" on test_suite_items for delete
  using (exists (select 1 from test_suites s where s.id = suite_id and (s.owner_id = auth.uid() or is_admin())));

drop policy if exists "approved users - test_suite_item_steps select" on test_suite_item_steps;
drop policy if exists "admins - test_suite_item_steps insert" on test_suite_item_steps;
drop policy if exists "admins - test_suite_item_steps update" on test_suite_item_steps;
drop policy if exists "admins - test_suite_item_steps delete" on test_suite_item_steps;

create policy "owner or visible - test_suite_item_steps select" on test_suite_item_steps for select
  using (exists (
    select 1 from test_suite_items i join test_suites s on s.id = i.suite_id
    where i.id = suite_item_id and (s.visibility in ('public', 'unlisted') or s.owner_id = auth.uid() or is_admin())
  ));
create policy "owner - test_suite_item_steps insert" on test_suite_item_steps for insert
  with check (exists (
    select 1 from test_suite_items i join test_suites s on s.id = i.suite_id
    where i.id = suite_item_id and (s.owner_id = auth.uid() or is_admin())
  ));
create policy "owner - test_suite_item_steps update" on test_suite_item_steps for update
  using (exists (
    select 1 from test_suite_items i join test_suites s on s.id = i.suite_id
    where i.id = suite_item_id and (s.owner_id = auth.uid() or is_admin())
  ))
  with check (exists (
    select 1 from test_suite_items i join test_suites s on s.id = i.suite_id
    where i.id = suite_item_id and (s.owner_id = auth.uid() or is_admin())
  ));
create policy "owner - test_suite_item_steps delete" on test_suite_item_steps for delete
  using (exists (
    select 1 from test_suite_items i join test_suites s on s.id = i.suite_id
    where i.id = suite_item_id and (s.owner_id = auth.uid() or is_admin())
  ));
