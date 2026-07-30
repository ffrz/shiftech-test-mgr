import type { ActivityEntityType } from '../types/domain';

// Where an entity_activity row's entity_type/entity_id resolves to in the app — used by
// anything that needs to link an activity/notification back to its source entity
// (AppTopbar's notification click, HomePage's Activity Feed, ...). Single source so a
// route rename only needs to change here, not at every call site.
export const ACTIVITY_ENTITY_ROUTE: Record<ActivityEntityType, string> = {
  issue: '/issues',
  test_case: '/test-cases',
  test_plan: '/test-plans',
  test_run: '/test-runs',
  project: '/projects',
};

export const ACTIVITY_ENTITY_LABEL: Record<ActivityEntityType, string> = {
  issue: 'Issue',
  test_case: 'Test Case',
  test_plan: 'Test Plan',
  test_run: 'Test Run',
  project: 'Project',
};

export function pathForActivityEntity(entityType: string, entityId: string): string {
  if (entityType in ACTIVITY_ENTITY_ROUTE) {
    return `${ACTIVITY_ENTITY_ROUTE[entityType as ActivityEntityType]}/${entityId}`;
  }
  return '/';
}
