import { ISSUE_STATUS_LABEL, TEST_PLAN_STATUS_LABEL, TEST_CASE_STATUS_LABEL, TEST_RUN_STATUS_LABEL, PROJECT_STATUS_LABEL } from './statusLabels';
import type { ActivityEntityType, ActivityEntry } from '../types/domain';

// status_change payloads always store the raw DB value ('open', 'in_progress', ...) — see
// issueService.changeStatus / testPlanService.changeStatus / testRunService.complete/reopen.
// Each entity type has its own status enum + label map, so the raw value has to be resolved
// per entityType rather than displayed as-is. No project-level status_change producer exists
// yet, but the map stays exhaustive over ActivityEntityType so this doesn't silently break
// if one gets added later.
const STATUS_LABEL_BY_ENTITY: Record<ActivityEntityType, Record<string, string>> = {
  issue: ISSUE_STATUS_LABEL,
  test_plan: TEST_PLAN_STATUS_LABEL,
  test_case: TEST_CASE_STATUS_LABEL,
  test_run: TEST_RUN_STATUS_LABEL,
  project: PROJECT_STATUS_LABEL,
};

function statusLabel(entityType: string, rawStatus: unknown): string {
  if (typeof rawStatus !== 'string') return '?';
  const map = STATUS_LABEL_BY_ENTITY[entityType as ActivityEntityType];
  return map?.[rawStatus] ?? rawStatus;
}

// Shared with ActivityPanel (entity-level timeline) and HomePage (cross-project Activity
// Feed) so a new event_type's copy only needs to change in one place. Unknown event_type
// falls back to the raw value, same as ActivityPanel — new producers don't require a UI
// change here to render something reasonable.
export function describeSystemEvent(entry: ActivityEntry): string {
  switch (entry.eventType) {
    case 'status_change':
      return `changed status from ${statusLabel(entry.entityType, entry.payload.from)} to ${statusLabel(entry.entityType, entry.payload.to)}`;
    case 'assignment':
      return entry.payload.assigneeName ? `assigned to ${entry.payload.assigneeName}` : 'changed the assignee';
    case 'attachment_added':
      return entry.payload.fileName ? `attached ${entry.payload.fileName}` : 'added an attachment';
    default:
      return entry.eventType;
  }
}

// Short label for entity_activity.event_type — used where the event needs to stand alone
// as a value (e.g. the "Event" column/Tag in ActivityLogTab), as opposed to
// describeSystemEvent's full sentence. Not a Record<EventType, string> because event_type
// isn't a closed union in ActivityEntry (new producers can add values over time, same
// reasoning as describeSystemEvent's default case) — unrecognized values fall back to the
// raw string so a new producer doesn't need a UI change to render something readable.
const EVENT_TYPE_LABEL: Record<string, string> = {
  comment: 'Comment',
  status_change: 'Status Change',
  assignment: 'Assignment',
  attachment_added: 'Attachment Added',
};

export function eventTypeLabel(eventType: string): string {
  return EVENT_TYPE_LABEL[eventType] ?? eventType;
}
