import { describe, expect, it } from 'vitest';
import { createMockAuditLogRepository } from './auditLogRepository';
import type { AuditLogEntry } from '../../interfaces/auditLogRepository';

const baseEntry = (overrides: Partial<AuditLogEntry> = {}): AuditLogEntry => ({
  id: 'entry-1',
  projectId: 'proj-1',
  entityType: 'issue',
  entityId: 'issue-1',
  actorId: 'user-1',
  eventType: 'comment',
  payload: { body: 'fixed the login bug' },
  parentCommentId: null,
  deletedAt: null,
  updatedAt: null,
  createdAt: '2025-03-01T10:00:00Z',
  actorName: 'Alice',
  ...overrides,
});

describe('createMockAuditLogRepository', () => {
  it('starts empty when no seed is given', async () => {
    const repo = createMockAuditLogRepository();
    const result = await repo.findAllByProject('proj-1', { page: 1, pageSize: 10 });
    expect(result).toEqual({ data: [], total: 0 });
  });

  it('seed is visible in findAllByProject for the matching project', async () => {
    const e1 = baseEntry({ id: '1', projectId: 'proj-a' });
    const e2 = baseEntry({ id: '2', projectId: 'proj-b' });
    const repo = createMockAuditLogRepository([e1, e2]);

    const resultA = await repo.findAllByProject('proj-a', { page: 1, pageSize: 10 });
    expect(resultA.total).toBe(1);
    expect(resultA.data[0].id).toBe('1');

    const resultB = await repo.findAllByProject('proj-b', { page: 1, pageSize: 10 });
    expect(resultB.total).toBe(1);
    expect(resultB.data[0].id).toBe('2');
  });

  it('filters by entityTypes', async () => {
    const e1 = baseEntry({ id: '1', entityType: 'issue' });
    const e2 = baseEntry({ id: '2', entityType: 'test_case' });
    const e3 = baseEntry({ id: '3', entityType: 'test_plan' });
    const repo = createMockAuditLogRepository([e1, e2, e3]);

    const result = await repo.findAllByProject('proj-1', {
      entityTypes: ['issue', 'test_plan'],
      page: 1,
      pageSize: 10,
    });

    expect(result.total).toBe(2);
    expect(result.data.map((e) => e.id)).toEqual(['1', '3']);
  });

  it('filters by search on payload.body', async () => {
    const e1 = baseEntry({ id: '1', payload: { body: 'login error' } });
    const e2 = baseEntry({ id: '2', payload: { body: 'signup flow' } });
    const e3 = baseEntry({ id: '3', payload: {} });
    const repo = createMockAuditLogRepository([e1, e2, e3]);

    const result = await repo.findAllByProject('proj-1', {
      search: 'login',
      page: 1,
      pageSize: 10,
    });

    expect(result.total).toBe(1);
    expect(result.data[0].id).toBe('1');
  });

  it('search is case-insensitive', async () => {
    const e1 = baseEntry({ id: '1', payload: { body: 'Login Error' } });
    const repo = createMockAuditLogRepository([e1]);

    const result = await repo.findAllByProject('proj-1', {
      search: 'login',
      page: 1,
      pageSize: 10,
    });

    expect(result.total).toBe(1);
  });

  it('paginates correctly', async () => {
    const entries = Array.from({ length: 5 }, (_, i) =>
      baseEntry({ id: `e-${i}`, createdAt: `2025-03-0${i + 1}T10:00:00Z` }),
    );
    const repo = createMockAuditLogRepository(entries);

    const page1 = await repo.findAllByProject('proj-1', { page: 1, pageSize: 2 });
    expect(page1.total).toBe(5);
    expect(page1.data).toHaveLength(2);
    expect(page1.data[0].id).toBe('e-4');
    expect(page1.data[1].id).toBe('e-3');

    const page3 = await repo.findAllByProject('proj-1', { page: 3, pageSize: 2 });
    expect(page3.data).toHaveLength(1);
    expect(page3.data[0].id).toBe('e-0');
  });

  it('two instances do not share state', async () => {
    const repoA = createMockAuditLogRepository([baseEntry({ id: 'a', projectId: 'proj-a' })]);
    const repoB = createMockAuditLogRepository();

    const resultA = await repoA.findAllByProject('proj-a', { page: 1, pageSize: 10 });
    expect(resultA.total).toBe(1);

    const resultB = await repoB.findAllByProject('proj-a', { page: 1, pageSize: 10 });
    expect(resultB.total).toBe(0);
  });
});
