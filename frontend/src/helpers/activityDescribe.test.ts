import { describe, expect, it } from 'vitest';
import { describeSystemEvent, eventTypeLabel } from './activityDescribe';

function makeEntry(eventType: string, entityType: string, payload: Record<string, unknown> = {}) {
  return {
    id: 'ae1',
    projectId: 'p1',
    entityType: entityType as any,
    entityId: 'e1',
    actorId: 'u1',
    eventType,
    payload,
    parentCommentId: null,
    deletedAt: null,
    updatedAt: null,
    createdAt: '2026-01-01T00:00:00Z',
  };
}

describe('describeSystemEvent', () => {
  describe('status_change', () => {
    it('describes issue status change with resolved labels', () => {
      expect(describeSystemEvent(makeEntry('status_change', 'issue', { from: 'open', to: 'closed' })))
        .toBe('changed status from Open to Closed');
    });

    it('describes test_plan status change', () => {
      expect(describeSystemEvent(makeEntry('status_change', 'test_plan', { from: 'draft', to: 'active' })))
        .toBe('changed status from Draft to Active');
    });

    it('describes test_case status change', () => {
      expect(describeSystemEvent(makeEntry('status_change', 'test_case', { from: 'active', to: 'archived' })))
        .toBe('changed status from Active to Archived');
    });

    it('describes test_run status change', () => {
      expect(describeSystemEvent(makeEntry('status_change', 'test_run', { from: 'in_progress', to: 'completed' })))
        .toBe('changed status from In Progress to Completed');
    });

    it('describes project status change', () => {
      expect(describeSystemEvent(makeEntry('status_change', 'project', { from: 'active', to: 'archived' })))
        .toBe('changed status from Active to Archived');
    });

    it('falls back to raw status value when non-string', () => {
      expect(describeSystemEvent(makeEntry('status_change', 'issue', { from: 1, to: 2 })))
        .toBe('changed status from ? to ?');
    });

    it('falls back to raw status value for unknown entity type', () => {
      const result = describeSystemEvent(makeEntry('status_change', 'unknown_entity', { from: 'x', to: 'y' }));
      expect(result).toBe('changed status from x to y');
    });

    it('falls back to raw value when entity type missing from map', () => {
      expect(describeSystemEvent(makeEntry('status_change', 'issue', { from: 'nonexistent', to: 'also-fake' })))
        .toBe('changed status from nonexistent to also-fake');
    });
  });

  describe('assignment', () => {
    it('describes assignment with assignee name', () => {
      expect(describeSystemEvent(makeEntry('assignment', 'issue', { assigneeName: 'Alice' })))
        .toBe('assigned to Alice');
    });

    it('falls back when assignee name missing', () => {
      expect(describeSystemEvent(makeEntry('assignment', 'issue', {})))
        .toBe('changed the assignee');
    });
  });

  describe('attachment_added', () => {
    it('describes attachment with file name', () => {
      expect(describeSystemEvent(makeEntry('attachment_added', 'issue', { fileName: 'screenshot.png' })))
        .toBe('attached screenshot.png');
    });

    it('falls back when file name missing', () => {
      expect(describeSystemEvent(makeEntry('attachment_added', 'issue', {})))
        .toBe('added an attachment');
    });
  });

  describe('created', () => {
    it('describes with the entity code when present', () => {
      expect(describeSystemEvent(makeEntry('created', 'issue', { code: 'ISS-123', title: 'Login fails' })))
        .toBe('created ISS-123');
    });

    it('falls back to the entity label when code is missing', () => {
      expect(describeSystemEvent(makeEntry('created', 'test_plan', {})))
        .toBe('created this test plan');
    });
  });

  describe('field_update', () => {
    it('returns generic message', () => {
      expect(describeSystemEvent(makeEntry('field_update', 'issue', { field: 'priority' })))
        .toBe('updated the details');
    });
  });

  describe('unknown event type', () => {
    it('returns the raw eventType string', () => {
      expect(describeSystemEvent(makeEntry('new_custom_event', 'issue', {})))
        .toBe('new_custom_event');
    });
  });
});

describe('eventTypeLabel', () => {
  it('returns label for comment', () => {
    expect(eventTypeLabel('comment')).toBe('Comment');
  });

  it('returns label for created', () => {
    expect(eventTypeLabel('created')).toBe('Created');
  });

  it('returns label for status_change', () => {
    expect(eventTypeLabel('status_change')).toBe('Status Change');
  });

  it('returns label for assignment', () => {
    expect(eventTypeLabel('assignment')).toBe('Assignment');
  });

  it('returns label for attachment_added', () => {
    expect(eventTypeLabel('attachment_added')).toBe('Attachment Added');
  });

  it('returns label for field_update', () => {
    expect(eventTypeLabel('field_update')).toBe('Updated');
  });

  it('falls back to raw value for unknown event type', () => {
    expect(eventTypeLabel('custom_event')).toBe('custom_event');
  });
});
