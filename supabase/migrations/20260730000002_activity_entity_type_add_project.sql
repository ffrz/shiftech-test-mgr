-- Add 'project' to the entity_type CHECK constraints on entity_activity/entity_attachments.
-- Project was originally left out of the polymorphic entity set (20260730000001) — it
-- only covered the 4 Testing Domain entities on the golden path (Issue/TestCase/TestPlan/
-- TestRun). Product decision (2026-07-30): Project itself also needs a comment/activity
-- feed (project-level discussion, release notes, freeze announcements — things that don't
-- belong to one specific Test Plan/Issue), so it's added as a 5th supported entity_type.
--
-- ('comment' entity_type for per-comment attachments was added later, in
-- 20260730000003 — see that file for why it's separate rather than folded in here.)

alter table entity_activity drop constraint if exists entity_activity_entity_type_check;
alter table entity_activity add constraint entity_activity_entity_type_check
  check (entity_type in ('issue', 'test_case', 'test_plan', 'test_run', 'project'));

alter table entity_attachments drop constraint if exists entity_attachments_entity_type_check;
alter table entity_attachments add constraint entity_attachments_entity_type_check
  check (entity_type in ('issue', 'test_case', 'test_plan', 'test_run', 'project'));
