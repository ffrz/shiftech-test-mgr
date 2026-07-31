-- Allow per-test-case attachments within a Test Run — one Test Result row per
-- (Test Run x Test Case), same idea as Issue attachments but scoped to the executed
-- result rather than the reusable Test Case template.
alter table entity_attachments drop constraint if exists entity_attachments_entity_type_check;
alter table entity_attachments add constraint entity_attachments_entity_type_check
  check (entity_type in ('issue', 'test_case', 'test_plan', 'test_run', 'project', 'comment', 'test_result'));
