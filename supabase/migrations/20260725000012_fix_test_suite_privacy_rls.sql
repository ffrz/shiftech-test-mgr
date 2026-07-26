-- Fix RLS on test_suites / test_suite_items / test_suite_item_steps to properly
-- enforce privacy: private suites are visible only to their owner, unlisted/public
-- are visible to everyone. Removes the is_admin() bypass on SELECT so even admins
-- respect template privacy (admins can still manage via INSERT/UPDATE/DELETE).
--
-- PRECONDITION: the owner_id + visibility columns already exist on test_suites
-- (added by 20260725000010_test_suite_ownership_and_visibility.sql). If that
-- migration hasn't been run yet, run it first.

-- Ensure RLS is enabled (safe to re-run)
alter table test_suites enable row level security;
alter table test_suite_items enable row level security;
alter table test_suite_item_steps enable row level security;

-- === test_suites ===

drop policy if exists "owner or visible - test_suites select" on test_suites;

create policy "owner or visible - test_suites select" on test_suites for select
  using (visibility in ('public', 'unlisted') or owner_id = auth.uid());

-- Keep admin bypass on write so admins can clean up / migrate legacy rows.
create policy "owner or admin - test_suites insert" on test_suites for insert
  with check (owner_id = auth.uid() or is_admin());
create policy "owner or admin - test_suites update" on test_suites for update
  using (owner_id = auth.uid() or is_admin()) with check (owner_id = auth.uid() or is_admin());
create policy "owner or admin - test_suites delete" on test_suites for delete
  using (owner_id = auth.uid() or is_admin());

-- Drop old-named policies (from previous migrations) that may still linger
drop policy if exists "approved users - test_suites select" on test_suites;
drop policy if exists "admins - test_suites insert" on test_suites;
drop policy if exists "admins - test_suites update" on test_suites;
drop policy if exists "admins - test_suites delete" on test_suites;
drop policy if exists "owner - test_suites insert" on test_suites;
drop policy if exists "owner - test_suites update" on test_suites;
drop policy if exists "owner - test_suites delete" on test_suites;

-- === test_suite_items ===

drop policy if exists "owner or visible - test_suite_items select" on test_suite_items;

create policy "owner or visible - test_suite_items select" on test_suite_items for select
  using (exists (
    select 1 from test_suites s
    where s.id = suite_id and (s.visibility in ('public', 'unlisted') or s.owner_id = auth.uid())
  ));

create policy "owner or admin - test_suite_items insert" on test_suite_items for insert
  with check (exists (select 1 from test_suites s where s.id = suite_id and (s.owner_id = auth.uid() or is_admin())));
create policy "owner or admin - test_suite_items update" on test_suite_items for update
  using (exists (select 1 from test_suites s where s.id = suite_id and (s.owner_id = auth.uid() or is_admin())))
  with check (exists (select 1 from test_suites s where s.id = suite_id and (s.owner_id = auth.uid() or is_admin())));
create policy "owner or admin - test_suite_items delete" on test_suite_items for delete
  using (exists (select 1 from test_suites s where s.id = suite_id and (s.owner_id = auth.uid() or is_admin())));

drop policy if exists "approved users - test_suite_items select" on test_suite_items;
drop policy if exists "admins - test_suite_items insert" on test_suite_items;
drop policy if exists "admins - test_suite_items update" on test_suite_items;
drop policy if exists "admins - test_suite_items delete" on test_suite_items;
drop policy if exists "owner - test_suite_items insert" on test_suite_items;
drop policy if exists "owner - test_suite_items update" on test_suite_items;
drop policy if exists "owner - test_suite_items delete" on test_suite_items;

-- === test_suite_item_steps ===

drop policy if exists "owner or visible - test_suite_item_steps select" on test_suite_item_steps;

create policy "owner or visible - test_suite_item_steps select" on test_suite_item_steps for select
  using (exists (
    select 1 from test_suite_items i join test_suites s on s.id = i.suite_id
    where i.id = suite_item_id and (s.visibility in ('public', 'unlisted') or s.owner_id = auth.uid())
  ));

create policy "owner or admin - test_suite_item_steps insert" on test_suite_item_steps for insert
  with check (exists (
    select 1 from test_suite_items i join test_suites s on s.id = i.suite_id
    where i.id = suite_item_id and (s.owner_id = auth.uid() or is_admin())
  ));
create policy "owner or admin - test_suite_item_steps update" on test_suite_item_steps for update
  using (exists (
    select 1 from test_suite_items i join test_suites s on s.id = i.suite_id
    where i.id = suite_item_id and (s.owner_id = auth.uid() or is_admin())
  ))
  with check (exists (
    select 1 from test_suite_items i join test_suites s on s.id = i.suite_id
    where i.id = suite_item_id and (s.owner_id = auth.uid() or is_admin())
  ));
create policy "owner or admin - test_suite_item_steps delete" on test_suite_item_steps for delete
  using (exists (
    select 1 from test_suite_items i join test_suites s on s.id = i.suite_id
    where i.id = suite_item_id and (s.owner_id = auth.uid() or is_admin())
  ));

drop policy if exists "approved users - test_suite_item_steps select" on test_suite_item_steps;
drop policy if exists "admins - test_suite_item_steps insert" on test_suite_item_steps;
drop policy if exists "admins - test_suite_item_steps update" on test_suite_item_steps;
drop policy if exists "admins - test_suite_item_steps delete" on test_suite_item_steps;
drop policy if exists "owner - test_suite_item_steps insert" on test_suite_item_steps;
drop policy if exists "owner - test_suite_item_steps update" on test_suite_item_steps;
drop policy if exists "owner - test_suite_item_steps delete" on test_suite_item_steps;
