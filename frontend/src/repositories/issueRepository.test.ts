import { describe, expect, it, vi } from 'vitest';

vi.stubEnv('VITE_DATA_SOURCE', 'mock');

const { issueRepository } = await import('./issueRepository');

const baseIssue = {
  moduleId: null,
  type: 'bug' as const,
  description: 'login fails',
  actualResult: 'error shown',
  expectedResult: 'login succeeds',
  priority: 'high' as const,
  status: 'open' as const,
  assignedTo: null,
  externalLinks: [],
};

describe('issueRepository (VITE_DATA_SOURCE=mock)', () => {
  it('create() then findAllByProject returns the issue', async () => {
    const created = await issueRepository.create({ projectId: 'issue-p1', title: 'Broken login', ...baseIssue });
    const rows = await issueRepository.findAllByProject('issue-p1');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: created.id, projectId: 'issue-p1', title: 'Broken login' });
  });

  it('update() changes are reflected in findById', async () => {
    const created = await issueRepository.create({ projectId: 'issue-p2', title: 'Slow page', ...baseIssue });
    await issueRepository.update(created.id, { title: 'Slow dashboard', priority: 'critical' });
    const found = await issueRepository.findById(created.id);
    expect(found).toMatchObject({ id: created.id, title: 'Slow dashboard', priority: 'critical' });
  });

  it('updateStatus and assign are reflected in subsequent reads', async () => {
    const created = await issueRepository.create({ projectId: 'issue-p3', title: 'Flickering modal', ...baseIssue });
    await issueRepository.updateStatus(created.id, 'resolved');
    await issueRepository.assign(created.id, 'user-123');

    const statusRows = await issueRepository.findAllByProject('issue-p3', { statuses: ['resolved'] });
    expect(statusRows).toHaveLength(1);
    expect(statusRows[0].id).toBe(created.id);

    const found = await issueRepository.findById(created.id);
    expect(found).toMatchObject({ status: 'resolved', assignedTo: 'user-123' });
  });

  it('remove() removes the issue from findAllByProject', async () => {
    const created = await issueRepository.create({ projectId: 'issue-p4', title: 'Spinner stuck', ...baseIssue });
    await issueRepository.remove(created.id);
    await expect(issueRepository.findAllByProject('issue-p4')).resolves.toEqual([]);
    await expect(issueRepository.findById(created.id)).resolves.toBeNull();
  });
});
