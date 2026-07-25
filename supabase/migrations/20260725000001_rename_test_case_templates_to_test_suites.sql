-- Rename "Test Case Template" concept to "Test Suite" (UI-driven rename, see AppMenu).
-- Tables/columns/policies renamed to match; data is preserved via ALTER TABLE RENAME.

alter table test_case_templates rename to test_suites;
alter table test_case_template_items rename to test_suite_items;
alter table test_case_template_item_steps rename to test_suite_item_steps;

alter table test_suite_items rename column template_id to suite_id;
alter table test_suite_item_steps rename column template_item_id to suite_item_id;

alter index if exists idx_test_case_template_items_template rename to idx_test_suite_items_suite;

alter trigger trg_test_case_templates_updated_at on test_suites rename to trg_test_suites_updated_at;
alter trigger trg_test_case_template_items_updated_at on test_suite_items rename to trg_test_suite_items_updated_at;

-- Policies don't have a RENAME TABLE-following behavior for their defining name, but they do
-- stay attached to the renamed table; we recreate them under matching names for clarity.
drop policy if exists "approved users - test_case_templates select" on test_suites;
drop policy if exists "admins - test_case_templates insert" on test_suites;
drop policy if exists "admins - test_case_templates update" on test_suites;
drop policy if exists "admins - test_case_templates delete" on test_suites;

create policy "approved users - test_suites select" on test_suites for select
  using (is_approved());
create policy "admins - test_suites insert" on test_suites for insert
  with check (is_admin());
create policy "admins - test_suites update" on test_suites for update
  using (is_admin()) with check (is_admin());
create policy "admins - test_suites delete" on test_suites for delete
  using (is_admin());

drop policy if exists "approved users - test_case_template_items select" on test_suite_items;
drop policy if exists "admins - test_case_template_items insert" on test_suite_items;
drop policy if exists "admins - test_case_template_items update" on test_suite_items;
drop policy if exists "admins - test_case_template_items delete" on test_suite_items;

create policy "approved users - test_suite_items select" on test_suite_items for select
  using (is_approved());
create policy "admins - test_suite_items insert" on test_suite_items for insert
  with check (is_admin());
create policy "admins - test_suite_items update" on test_suite_items for update
  using (is_admin()) with check (is_admin());
create policy "admins - test_suite_items delete" on test_suite_items for delete
  using (is_admin());

drop policy if exists "approved users - test_case_template_item_steps select" on test_suite_item_steps;
drop policy if exists "admins - test_case_template_item_steps insert" on test_suite_item_steps;
drop policy if exists "admins - test_case_template_item_steps update" on test_suite_item_steps;
drop policy if exists "admins - test_case_template_item_steps delete" on test_suite_item_steps;

create policy "approved users - test_suite_item_steps select" on test_suite_item_steps for select
  using (is_approved());
create policy "admins - test_suite_item_steps insert" on test_suite_item_steps for insert
  with check (is_admin());
create policy "admins - test_suite_item_steps update" on test_suite_item_steps for update
  using (is_admin()) with check (is_admin());
create policy "admins - test_suite_item_steps delete" on test_suite_item_steps for delete
  using (is_admin());
