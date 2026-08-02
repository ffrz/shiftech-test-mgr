import { describe, expect, it, vi } from 'vitest';

vi.stubEnv('VITE_DATA_SOURCE', 'mock');

const { entityAttachmentRepository } = await import('./entityAttachmentRepository');

describe('entityAttachmentRepository (VITE_DATA_SOURCE=mock)', () => {
  it('create() then findForEntity returns the attachment', async () => {
    const created = await entityAttachmentRepository.create({
      entityType: 'issue',
      entityId: 'att-e1',
      projectId: 'att-p1',
      storageProvider: 'supabase-storage',
      url: 'https://example.com/screenshot.png',
      fileName: 'screenshot.png',
      fileSize: 2048,
      contentType: 'image/png',
    });
    const rows = await entityAttachmentRepository.findForEntity('issue', 'att-e1');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id: created.id,
      entityType: 'issue',
      entityId: 'att-e1',
      projectId: 'att-p1',
      fileName: 'screenshot.png',
    });
  });

  it('remove() deletes the attachment', async () => {
    const created = await entityAttachmentRepository.create({
      entityType: 'test_case',
      entityId: 'att-e2',
      projectId: 'att-p2',
      storageProvider: 'supabase-storage',
      url: 'https://example.com/log.txt',
      fileName: 'log.txt',
      fileSize: null,
      contentType: 'text/plain',
    });
    await entityAttachmentRepository.remove(created.id);
    await expect(entityAttachmentRepository.findForEntity('test_case', 'att-e2')).resolves.toEqual([]);
  });

  it('findForEntity() filters by entityType + entityId', async () => {
    await entityAttachmentRepository.create({
      entityType: 'issue',
      entityId: 'att-e3',
      projectId: 'att-p3',
      storageProvider: 'supabase-storage',
      url: 'https://example.com/a.png',
      fileName: 'a.png',
      fileSize: 100,
      contentType: 'image/png',
    });
    await entityAttachmentRepository.create({
      entityType: 'comment',
      entityId: 'att-e4',
      projectId: 'att-p3',
      storageProvider: 'supabase-storage',
      url: 'https://example.com/b.png',
      fileName: 'b.png',
      fileSize: 200,
      contentType: 'image/png',
    });
    const issueRows = await entityAttachmentRepository.findForEntity('issue', 'att-e3');
    const commentRows = await entityAttachmentRepository.findForEntity('comment', 'att-e4');
    expect(issueRows).toHaveLength(1);
    expect(issueRows[0].entityId).toBe('att-e3');
    expect(commentRows).toHaveLength(1);
    expect(commentRows[0].entityId).toBe('att-e4');
  });
});
