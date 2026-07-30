-- Reply-to-comment support for entity_activity — one level of nesting (a reply cannot
-- itself be replied to; parent_comment_id always points at a top-level comment). Only
-- meaningful for event_type='comment' rows; system events never set it.
alter table entity_activity add column if not exists parent_comment_id uuid references entity_activity(id) on delete cascade;

create index if not exists idx_entity_activity_parent on entity_activity (parent_comment_id);
