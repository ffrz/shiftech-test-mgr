-- Adds `updated_at` to entity_activity so an edited comment can show an "(edited)" marker
-- with the edit timestamp — previously there was no way to tell an edited comment apart
-- from an untouched one. Only comment edits touch this (activityRepository.updateComment),
-- system events and inserts leave it null.

alter table entity_activity add column if not exists updated_at timestamptz;
