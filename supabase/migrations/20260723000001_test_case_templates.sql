-- Test Case Template Library (global, admin-managed) + target_role field on test_cases.
--
-- Templates are NOT project-scoped — they're a shared library any project can clone test
-- cases from during initialization or later. Unlike every other table so far (project-scoped
-- or "any approved user, full access"), this introduces a new RLS shape: all approved users
-- can SELECT (so anyone can browse/clone), but only admins can INSERT/UPDATE/DELETE.
--
-- target_role: a free-text label (not an enum) for RBAC testing — the same logical test case
-- often needs to be re-run once per app role (Admin/Manager/Member, etc.) with different
-- steps/expected results. Duplication across roles is manual (separate test_cases rows);
-- this field is purely for labeling/filtering, not a variant system.

create table if not exists test_case_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_test_case_templates_updated_at before update on test_case_templates
  for each row execute function set_updated_at();

create table if not exists test_case_template_items (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references test_case_templates(id) on delete cascade,
  -- Text, not a FK — modules are project-scoped, resolved (find-or-create) at clone time.
  module_name text,
  title text not null,
  objective text,
  preconditions text,
  steps text not null default '',
  expected_result text not null default '',
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'critical')),
  step_type text not null default 'simple' check (step_type in ('simple', 'detailed')),
  target_role text,
  tag_names text[] not null default '{}',
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_test_case_template_items_template on test_case_template_items (template_id, order_index);

create trigger trg_test_case_template_items_updated_at before update on test_case_template_items
  for each row execute function set_updated_at();

create table if not exists test_case_template_item_steps (
  id uuid primary key default gen_random_uuid(),
  template_item_id uuid not null references test_case_template_items(id) on delete cascade,
  step_number integer not null,
  action text not null,
  expected_result text,
  unique (template_item_id, step_number)
);

-- === target_role on the real test_cases table ===

alter table test_cases add column if not exists target_role text;

-- === RLS: approved users read, admins write ===

alter table test_case_templates enable row level security;
create policy "approved users - test_case_templates select" on test_case_templates for select
  using (is_approved());
create policy "admins - test_case_templates insert" on test_case_templates for insert
  with check (is_admin());
create policy "admins - test_case_templates update" on test_case_templates for update
  using (is_admin()) with check (is_admin());
create policy "admins - test_case_templates delete" on test_case_templates for delete
  using (is_admin());

alter table test_case_template_items enable row level security;
create policy "approved users - test_case_template_items select" on test_case_template_items for select
  using (is_approved());
create policy "admins - test_case_template_items insert" on test_case_template_items for insert
  with check (is_admin());
create policy "admins - test_case_template_items update" on test_case_template_items for update
  using (is_admin()) with check (is_admin());
create policy "admins - test_case_template_items delete" on test_case_template_items for delete
  using (is_admin());

alter table test_case_template_item_steps enable row level security;
create policy "approved users - test_case_template_item_steps select" on test_case_template_item_steps for select
  using (is_approved());
create policy "admins - test_case_template_item_steps insert" on test_case_template_item_steps for insert
  with check (is_admin());
create policy "admins - test_case_template_item_steps update" on test_case_template_item_steps for update
  using (is_admin()) with check (is_admin());
create policy "admins - test_case_template_item_steps delete" on test_case_template_item_steps for delete
  using (is_admin());
