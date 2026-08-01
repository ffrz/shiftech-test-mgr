import { describe, expect, it } from 'vitest';
import { ACTIVITY_ENTITY_ROUTE, ACTIVITY_ENTITY_LABEL, pathForActivityEntity } from './activityRoutes';

describe('ACTIVITY_ENTITY_ROUTE', () => {
  it('maps all entity types to their list routes', () => {
    expect(ACTIVITY_ENTITY_ROUTE.issue).toBe('/issues');
    expect(ACTIVITY_ENTITY_ROUTE.test_case).toBe('/test-cases');
    expect(ACTIVITY_ENTITY_ROUTE.test_plan).toBe('/test-plans');
    expect(ACTIVITY_ENTITY_ROUTE.test_run).toBe('/test-runs');
    expect(ACTIVITY_ENTITY_ROUTE.project).toBe('/projects');
  });
});

describe('ACTIVITY_ENTITY_LABEL', () => {
  it('maps all entity types to readable labels', () => {
    expect(ACTIVITY_ENTITY_LABEL.issue).toBe('Issue');
    expect(ACTIVITY_ENTITY_LABEL.test_case).toBe('Test Case');
    expect(ACTIVITY_ENTITY_LABEL.test_plan).toBe('Test Plan');
    expect(ACTIVITY_ENTITY_LABEL.test_run).toBe('Test Run');
    expect(ACTIVITY_ENTITY_LABEL.project).toBe('Project');
  });
});

describe('pathForActivityEntity', () => {
  it('builds path for issue', () => {
    expect(pathForActivityEntity('issue', 'i-123')).toBe('/issues/i-123');
  });

  it('builds path for test_case', () => {
    expect(pathForActivityEntity('test_case', 'tc-456')).toBe('/test-cases/tc-456');
  });

  it('builds path for test_plan', () => {
    expect(pathForActivityEntity('test_plan', 'tp-789')).toBe('/test-plans/tp-789');
  });

  it('builds path for test_run', () => {
    expect(pathForActivityEntity('test_run', 'tr-101')).toBe('/test-runs/tr-101');
  });

  it('builds path for project', () => {
    expect(pathForActivityEntity('project', 'p-202')).toBe('/projects/p-202');
  });

  it('returns "/" for unknown entity type', () => {
    expect(pathForActivityEntity('unknown', 'id')).toBe('/');
  });

  it('returns "/" for empty entity type', () => {
    expect(pathForActivityEntity('', 'id')).toBe('/');
  });
});
