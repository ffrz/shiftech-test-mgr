import { describe, expect, it } from 'vitest';
import { createMockIssueRepository } from './issueRepository';
import type { Issue, IssuePriority, IssueStatus, IssueType } from '../../../types/domain';

function seedIssue(overrides: Partial<Issue> = {}): Issue {
  return {
    id: `iss-${Math.random().toString(36).slice(2, 8)}`,
    code: 'ISS-1',
    projectId: 'p1',
    moduleId: null,
    type: 'bug',
    title: 'Default issue',
    description: null,
    actualResult: null,
    expectedResult: null,
    priority: 'medium' as IssuePriority,
    status: 'open' as IssueStatus,
    assignedTo: null,
    targetRoleId: null,
    externalLinks: [],
    createdBy: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('createMockIssueRepository', () => {
  it('starts empty when no seed is given', async () => {
    const repo = createMockIssueRepository();
    await expect(repo.findAllByProject('p1')).resolves.toEqual([]);
  });

  it('seed issues are immediately visible', async () => {
    const iss = seedIssue({ id: 'seeded-1', projectId: 'p1', title: 'Seeded' });
    const repo = createMockIssueRepository({ issues: [iss] });
    const results = await repo.findAllByProject('p1');
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe('Seeded');
  });

  it('create is immediately visible', async () => {
    const repo = createMockIssueRepository();
    const created = await repo.create({
      projectId: 'p1',
      moduleId: null,
      type: 'bug',
      title: 'New issue',
      description: null,
      actualResult: null,
      expectedResult: null,
      priority: 'high',
      status: 'open',
      assignedTo: null,
      externalLinks: [],
    });
    const results = await repo.findAllByProject('p1');
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe(created.id);
  });

  it('findAllByProject filters by search', async () => {
    const repo = createMockIssueRepository({
      issues: [
        seedIssue({ id: 'i1', projectId: 'p1', code: 'ISS-10', title: 'Login broken' }),
        seedIssue({ id: 'i2', projectId: 'p1', code: 'ISS-11', title: 'Dashboard slow' }),
        seedIssue({ id: 'i3', projectId: 'p2', code: 'ISS-12', title: 'Login broken' }),
      ],
    });
    const results = await repo.findAllByProject('p1', { search: 'login' });
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('i1');
  });

  it('findAllByProject filters by statuses', async () => {
    const repo = createMockIssueRepository({
      issues: [
        seedIssue({ id: 'i1', projectId: 'p1', status: 'open' }),
        seedIssue({ id: 'i2', projectId: 'p1', status: 'closed' }),
      ],
    });
    const results = await repo.findAllByProject('p1', { statuses: ['open'] });
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('i1');
  });

  it('findAllByProject filters by priorities', async () => {
    const repo = createMockIssueRepository({
      issues: [
        seedIssue({ id: 'i1', projectId: 'p1', priority: 'critical' }),
        seedIssue({ id: 'i2', projectId: 'p1', priority: 'low' }),
      ],
    });
    const results = await repo.findAllByProject('p1', { priorities: ['critical'] });
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('i1');
  });

  it('findAllByProject filters by moduleIds', async () => {
    const repo = createMockIssueRepository({
      issues: [
        seedIssue({ id: 'i1', projectId: 'p1', moduleId: 'mod-a' }),
        seedIssue({ id: 'i2', projectId: 'p1', moduleId: 'mod-b' }),
      ],
    });
    const results = await repo.findAllByProject('p1', { moduleIds: ['mod-a'] });
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('i1');
  });

  it('findAllByProjectPaginated paginates correctly', async () => {
    const issues = Array.from({ length: 5 }, (_, j) =>
      seedIssue({ id: `i${j + 1}`, projectId: 'p1', code: `ISS-${j + 1}` }),
    );
    const repo = createMockIssueRepository({ issues });
    const page1 = await repo.findAllByProjectPaginated('p1', { page: 1, pageSize: 2 });
    expect(page1.data).toHaveLength(2);
    expect(page1.total).toBe(5);
    const page2 = await repo.findAllByProjectPaginated('p1', { page: 2, pageSize: 2 });
    expect(page2.data).toHaveLength(2);
    const page3 = await repo.findAllByProjectPaginated('p1', { page: 3, pageSize: 2 });
    expect(page3.data).toHaveLength(1);
  });

  it('findAllByProjectPaginated filters by tagIds', async () => {
    const repo = createMockIssueRepository({
      issues: [
        seedIssue({ id: 'i1', projectId: 'p1' }),
        seedIssue({ id: 'i2', projectId: 'p1' }),
      ],
    });
    await repo.replaceTags('i1', ['tag-a']);
    await repo.replaceTags('i2', ['tag-b']);
    const results = await repo.findAllByProjectPaginated('p1', { page: 1, pageSize: 10, tagIds: ['tag-a'] });
    expect(results.data).toHaveLength(1);
    expect(results.data[0].id).toBe('i1');
  });

  it('searchByProject returns matching lightweight results', async () => {
    const repo = createMockIssueRepository({
      issues: [
        seedIssue({ id: 'i1', projectId: 'p1', code: 'ISS-100', title: 'Fix logout' }),
        seedIssue({ id: 'i2', projectId: 'p1', code: 'ISS-101', title: 'Add theme' }),
      ],
    });
    const results = await repo.searchByProject('p1', 'logout');
    expect(results).toHaveLength(1);
    expect(results[0].code).toBe('ISS-100');
    expect((results[0] as any).status).toBeUndefined();
  });

  it('update modifies fields', async () => {
    const repo = createMockIssueRepository({
      issues: [seedIssue({ id: 'i1', projectId: 'p1', title: 'Old' })],
    });
    const updated = await repo.update('i1', { title: 'New' });
    expect(updated.title).toBe('New');
    const found = await repo.findById('i1');
    expect(found!.title).toBe('New');
  });

  it('update throws when issue not found', async () => {
    const repo = createMockIssueRepository();
    await expect(repo.update('nonexistent', { title: 'X' })).rejects.toThrow('mock issue not found');
  });

  it('updateStatus changes status', async () => {
    const repo = createMockIssueRepository({
      issues: [seedIssue({ id: 'i1', projectId: 'p1', status: 'open' })],
    });
    const updated = await repo.updateStatus('i1', 'closed');
    expect(updated.status).toBe('closed');
  });

  it('assign changes assignedTo', async () => {
    const repo = createMockIssueRepository({
      issues: [seedIssue({ id: 'i1', projectId: 'p1', assignedTo: null })],
    });
    const updated = await repo.assign('i1', 'user-1');
    expect(updated.assignedTo).toBe('user-1');
    const cleared = await repo.assign('i1', null);
    expect(cleared.assignedTo).toBeNull();
  });

  it('remove deletes the issue', async () => {
    const repo = createMockIssueRepository({
      issues: [seedIssue({ id: 'i1', projectId: 'p1' })],
    });
    await repo.remove('i1');
    const found = await repo.findById('i1');
    expect(found).toBeNull();
  });

  it('linkToTestResult and findAllByTestResult work together', async () => {
    const repo = createMockIssueRepository({
      issues: [seedIssue({ id: 'i1', projectId: 'p1' })],
    });
    await repo.linkToTestResult('i1', 'tr-1');
    const results = await repo.findAllByTestResult('tr-1');
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('i1');
  });

  it('unlinkFromTestResult removes the link', async () => {
    const repo = createMockIssueRepository({
      issues: [seedIssue({ id: 'i1', projectId: 'p1' })],
    });
    await repo.linkToTestResult('i1', 'tr-1');
    await repo.unlinkFromTestResult('i1', 'tr-1');
    const results = await repo.findAllByTestResult('tr-1');
    expect(results).toHaveLength(0);
  });

  it('replaceTags sets tags visible in IssueWithDetails', async () => {
    const repo = createMockIssueRepository({
      issues: [seedIssue({ id: 'i1', projectId: 'p1' })],
    });
    await repo.replaceTags('i1', ['tag-1', 'tag-2']);
    const found = await repo.findById('i1');
    expect(found!.tags.map((t) => t.id).sort()).toEqual(['tag-1', 'tag-2']);
    await repo.replaceTags('i1', []);
    const cleared = await repo.findById('i1');
    expect(cleared!.tags).toHaveLength(0);
  });

  it('addAttachment and findAttachments work together', async () => {
    const repo = createMockIssueRepository();
    const att = await repo.addAttachment({
      issueId: 'i1',
      projectId: 'p1',
      storageProvider: 'supabase',
      url: 'https://example.com/screenshot.png',
      fileName: 'screenshot.png',
      fileSize: 1024,
      contentType: 'image/png',
    });
    const attachments = await repo.findAttachments('i1');
    expect(attachments).toHaveLength(1);
    expect(attachments[0].id).toBe(att.id);
    expect(attachments[0].fileName).toBe('screenshot.png');
  });

  it('removeAttachment deletes the attachment', async () => {
    const repo = createMockIssueRepository();
    const att = await repo.addAttachment({
      issueId: 'i1',
      projectId: 'p1',
      storageProvider: 'supabase',
      url: 'https://example.com/file.png',
      fileName: 'file.png',
      fileSize: null,
      contentType: null,
    });
    await repo.removeAttachment(att.id);
    const attachments = await repo.findAttachments('i1');
    expect(attachments).toHaveLength(0);
  });

  it('two instances do not share state', async () => {
    const repoA = createMockIssueRepository();
    const repoB = createMockIssueRepository();

    await repoA.create({
      projectId: 'p1',
      moduleId: null,
      type: 'bug',
      title: 'Only in A',
      description: null,
      actualResult: null,
      expectedResult: null,
      priority: 'medium',
      status: 'open',
      assignedTo: null,
      externalLinks: [],
    });

    await expect(repoB.findAllByProject('p1')).resolves.toEqual([]);
  });

  it('findByCode returns matching issue', async () => {
    const repo = createMockIssueRepository({
      issues: [seedIssue({ id: 'i1', projectId: 'p1', code: 'ISS-500' })],
    });
    const found = await repo.findByCode('p1', 'ISS-500');
    expect(found!.id).toBe('i1');
    const missing = await repo.findByCode('p1', 'ISS-999');
    expect(missing).toBeNull();
  });

  it('createMany creates multiple issues', async () => {
    const repo = createMockIssueRepository();
    const results = await repo.createMany([
      {
        projectId: 'p1',
        moduleId: null,
        type: 'bug' as IssueType,
        title: 'Bug A',
        description: null,
        actualResult: null,
        expectedResult: null,
        priority: 'medium' as IssuePriority,
        status: 'open' as IssueStatus,
        assignedTo: null,
        externalLinks: [],
      },
      {
        projectId: 'p1',
        moduleId: null,
        type: 'feature' as IssueType,
        title: 'Feature B',
        description: null,
        actualResult: null,
        expectedResult: null,
        priority: 'low' as IssuePriority,
        status: 'backlog' as IssueStatus,
        assignedTo: null,
        externalLinks: [],
      },
    ]);
    expect(results).toHaveLength(2);
    const all = await repo.findAllByProject('p1');
    expect(all).toHaveLength(2);
  });
});
