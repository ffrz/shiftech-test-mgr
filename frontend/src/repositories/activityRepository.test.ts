import { describe, expect, it, vi } from 'vitest';

vi.stubEnv('VITE_DATA_SOURCE', 'mock');

const { activityRepository } = await import('./activityRepository');

describe('activityRepository (VITE_DATA_SOURCE=mock)', () => {
  it('create() then findForEntity returns the entry', async () => {
    const created = await activityRepository.create({
      projectId: 'act-p1',
      entityType: 'issue',
      entityId: 'act-e1',
      actorId: 'act-user-1',
      eventType: 'comment',
      payload: { body: 'hello' },
    });
    const rows = await activityRepository.findForEntity('issue', 'act-e1');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id: created.id,
      projectId: 'act-p1',
      entityType: 'issue',
      entityId: 'act-e1',
      actorId: 'act-user-1',
    });
  });

  it('updateComment() replaces the payload body', async () => {
    const created = await activityRepository.create({
      projectId: 'act-p2',
      entityType: 'test_case',
      entityId: 'act-e2',
      actorId: 'act-user-1',
      eventType: 'comment',
      payload: { body: 'old body' },
    });
    const updated = await activityRepository.updateComment(created.id, 'new body');
    expect(updated.payload.body).toBe('new body');
    const rows = await activityRepository.findForEntity('test_case', 'act-e2');
    expect(rows[0].payload.body).toBe('new body');
  });

  it('softDelete() sets deletedAt without removing the entry', async () => {
    const created = await activityRepository.create({
      projectId: 'act-p3',
      entityType: 'issue',
      entityId: 'act-e3',
      actorId: 'act-user-1',
      eventType: 'status_change',
      payload: {},
    });
    const deleted = await activityRepository.softDelete(created.id);
    expect(deleted.deletedAt).not.toBeNull();
    const rows = await activityRepository.findForEntity('issue', 'act-e3');
    expect(rows).toHaveLength(1);
    expect(rows[0].deletedAt).not.toBeNull();
  });

  it('findForEntity() filters by entityType + entityId', async () => {
    await activityRepository.create({
      projectId: 'act-p4',
      entityType: 'issue',
      entityId: 'act-e4',
      actorId: 'act-user-1',
      eventType: 'comment',
      payload: {},
    });
    await activityRepository.create({
      projectId: 'act-p4',
      entityType: 'test_case',
      entityId: 'act-e5',
      actorId: 'act-user-1',
      eventType: 'comment',
      payload: {},
    });
    const issueRows = await activityRepository.findForEntity('issue', 'act-e4');
    const caseRows = await activityRepository.findForEntity('test_case', 'act-e5');
    expect(issueRows).toHaveLength(1);
    expect(issueRows[0].entityId).toBe('act-e4');
    expect(caseRows).toHaveLength(1);
    expect(caseRows[0].entityId).toBe('act-e5');
  });
});
