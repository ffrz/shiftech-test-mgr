import { describe, expect, it } from 'vitest';
import { createMockActivityRepository } from './activityRepository';

describe('createMockActivityRepository', () => {
  it('starts empty when no seed is given', async () => {
    const repo = createMockActivityRepository();
    await expect(repo.findForEntity('project', 'p1')).resolves.toEqual([]);
  });

  it('create is visible in findForEntity', async () => {
    const repo = createMockActivityRepository();
    const created = await repo.create({
      projectId: 'proj-1',
      entityType: 'issue',
      entityId: 'issue-1',
      actorId: 'user-1',
      eventType: 'comment',
      payload: { body: 'hello' },
    });

    const results = await repo.findForEntity('issue', 'issue-1');
    expect(results).toHaveLength(1);
    expect(results[0]).toEqual(created);
  });

  it('findForEntity filters by entityType', async () => {
    const repo = createMockActivityRepository();
    await repo.create({
      projectId: 'proj-1',
      entityType: 'issue',
      entityId: 'e1',
      actorId: 'user-1',
      eventType: 'comment',
    });
    await repo.create({
      projectId: 'proj-1',
      entityType: 'test_case',
      entityId: 'e1',
      actorId: 'user-1',
      eventType: 'comment',
    });

    const issueResults = await repo.findForEntity('issue', 'e1');
    expect(issueResults).toHaveLength(1);
    expect(issueResults[0].entityType).toBe('issue');

    const tcResults = await repo.findForEntity('test_case', 'e1');
    expect(tcResults).toHaveLength(1);
    expect(tcResults[0].entityType).toBe('test_case');
  });

  it('updateComment reflects payload.body', async () => {
    const repo = createMockActivityRepository();
    const created = await repo.create({
      projectId: 'proj-1',
      entityType: 'issue',
      entityId: 'issue-1',
      actorId: 'user-1',
      eventType: 'comment',
      payload: { body: 'original' },
    });

    const updated = await repo.updateComment(created.id, 'edited body');

    expect(updated.payload).toEqual({ body: 'edited body' });
    expect(updated.updatedAt).not.toBeNull();
  });

  it('softDelete sets deletedAt and entry is still found', async () => {
    const repo = createMockActivityRepository();
    const created = await repo.create({
      projectId: 'proj-1',
      entityType: 'issue',
      entityId: 'issue-1',
      actorId: 'user-1',
      eventType: 'comment',
    });

    const deleted = await repo.softDelete(created.id);

    expect(deleted.deletedAt).not.toBeNull();
    const results = await repo.findForEntity('issue', 'issue-1');
    expect(results).toHaveLength(1);
    expect(results[0].deletedAt).not.toBeNull();
  });

  it('two instances do not share state', async () => {
    const repoA = createMockActivityRepository();
    const repoB = createMockActivityRepository();

    await repoA.create({
      projectId: 'proj-1',
      entityType: 'issue',
      entityId: 'issue-1',
      actorId: 'user-1',
      eventType: 'comment',
    });

    await expect(repoB.findForEntity('issue', 'issue-1')).resolves.toEqual([]);
  });
});
