-- ============================================================================
-- Issue: expand status from open/in_progress/resolved/verified/closed to
-- backlog/open/in_progress/resolved/verified/closed/rejected/duplicate.
-- Existing rows keep their current value (all old values remain valid members
-- of the new set) — no data migration needed, only the CHECK constraint widens.
-- ============================================================================

alter table issues drop constraint if exists issues_status_check;
alter table issues add constraint issues_status_check
  check (status in ('backlog', 'open', 'in_progress', 'resolved', 'verified', 'closed', 'rejected', 'duplicate'));
