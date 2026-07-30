-- Add 'comment' to entity_attachments' entity_type CHECK constraint — per-comment
-- attachments (e.g. a screenshot attached to one specific reply, not the whole Issue/Test
-- Case) point entity_id at an entity_activity.id row rather than at the parent entity.
-- Split into its own migration from 20260730000002 because that file had already been
-- applied to the remote database before this addition was made — Supabase CLI's migration
-- tracking is by filename, not content, so editing an already-applied file's contents
-- doesn't get picked up by a later `db push`.

alter table entity_attachments drop constraint if exists entity_attachments_entity_type_check;
alter table entity_attachments add constraint entity_attachments_entity_type_check
  check (entity_type in ('issue', 'test_case', 'test_plan', 'test_run', 'project', 'comment'));
