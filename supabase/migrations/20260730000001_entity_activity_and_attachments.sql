-- Phase 8 (Collaboration & Workflow) foundation — see docs/ROADMAP_V2.md "Phase 8".
--
-- entity_activity: one polymorphic table for comments + system events (status change,
-- assignment, attachment added, ...) on Issue/TestCase/TestPlan/TestRun. Comment is just
-- event_type='comment' here, not a separate table — Activity Timeline reads this table
-- directly, no union of multiple tables needed. Starts with 'comment' only; system event
-- producers are wired in incrementally (see ROADMAP_V2 Phase 8 T04-T06), not upfront.
--
-- Comments are soft-deleted (deleted_at set, body left in place but hidden by the UI) so
-- the timeline never has gaps — same anonymize-not-hard-delete philosophy as
-- delete_account() (see 20260729000004_delete_account_rpc.sql).

create table if not exists entity_activity (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  entity_type text not null check (entity_type in ('issue', 'test_case', 'test_plan', 'test_run')),
  entity_id uuid not null,
  actor_id uuid not null references profiles(id) on delete cascade,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_entity_activity_entity on entity_activity (entity_type, entity_id, created_at);
create index if not exists idx_entity_activity_project on entity_activity (project_id);

alter table entity_activity enable row level security;

create policy "project access - entity_activity select" on entity_activity for select
  using (has_project_access(project_id));
create policy "project access - entity_activity insert" on entity_activity for insert
  with check (has_project_access(project_id) and actor_id = auth.uid());
-- Only the author can edit/soft-delete their own comment. System events (actor may not be
-- the caller, e.g. a status change logged on someone else's behalf) are never updated.
create policy "author - entity_activity update" on entity_activity for update
  using (actor_id = auth.uid()) with check (actor_id = auth.uid());

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'entity_activity'
  ) then
    execute 'alter publication supabase_realtime add table entity_activity';
  end if;
end $$;

-- === Generalize attachments (issue-only) -> entity_attachments (polymorphic) ===
-- Same rename-and-reshape approach as 20260725000005 (profiles->users+profiles): keep the
-- table name change explicit rather than aliasing, so there's one source of truth for the
-- shape going forward instead of a view papering over two schemas.

alter table attachments rename to entity_attachments;

alter table entity_attachments add column entity_type text;
alter table entity_attachments add column entity_id uuid;

update entity_attachments set entity_type = 'issue', entity_id = issue_id where entity_type is null;

alter table entity_attachments alter column entity_type set not null;
alter table entity_attachments alter column entity_id set not null;
alter table entity_attachments add constraint entity_attachments_entity_type_check
  check (entity_type in ('issue', 'test_case', 'test_plan', 'test_run'));

drop index if exists idx_attachments_issue;
create index if not exists idx_entity_attachments_entity on entity_attachments (entity_type, entity_id);

-- Old issue_id-scoped policies must be dropped before the column they reference, or the
-- drop column below fails with a dependency error.
drop policy if exists "project access - attachments select" on entity_attachments;
drop policy if exists "issue managers - attachments insert" on entity_attachments;
drop policy if exists "issue managers - attachments delete" on entity_attachments;

alter table entity_attachments drop constraint if exists attachments_issue_id_fkey;
alter table entity_attachments drop column issue_id;

-- RLS: issue_id-based policies resolved project via a join to issues. Without a foreign
-- key, project scoping is carried directly on the row instead (same approach as
-- entity_activity above) rather than a per-entity-type join, since entity_id doesn't point
-- at one single table.
alter table entity_attachments add column project_id uuid references projects(id) on delete cascade;
update entity_attachments ea set project_id = i.project_id from issues i where ea.entity_id = i.id and ea.entity_type = 'issue';
alter table entity_attachments alter column project_id set not null;

-- Preserve the pre-existing issue-attachment write gate exactly (manager/tester only, via
-- can_manage_issues) rather than loosening it to is_approved() as a side effect of this
-- generalization. Non-issue entity types (test_case/test_plan/test_run) have no equivalent
-- "manager" concept yet, so they fall back to is_approved() (any accepted project member)
-- until/unless product decides they need narrower gating — revisit when T07 (Attachment UI
-- generalization) actually ships those entity types.
create or replace function can_write_entity_attachment(p_project_id uuid, p_entity_type text)
returns boolean as $$
  select case
    when p_entity_type = 'issue' then can_manage_issues(p_project_id)
    else is_approved() and has_project_access(p_project_id)
  end;
$$ language sql security definer set search_path = public stable;

create policy "project access - entity_attachments select" on entity_attachments for select
  using (has_project_access(project_id));
create policy "entity managers - entity_attachments insert" on entity_attachments for insert
  with check (can_write_entity_attachment(project_id, entity_type));
create policy "entity managers - entity_attachments delete" on entity_attachments for delete
  using (can_write_entity_attachment(project_id, entity_type));
