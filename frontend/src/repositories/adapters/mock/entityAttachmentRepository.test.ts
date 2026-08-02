import { describe, expect, it } from 'vitest';
import { createMockEntityAttachmentRepository } from './entityAttachmentRepository';

describe('createMockEntityAttachmentRepository', () => {
  it('starts empty when no seed is given', async () => {
    const repo = createMockEntityAttachmentRepository();
    await expect(repo.findForEntity('test_case', 'tc-1')).resolves.toEqual([]);
  });

  it('create() is immediately visible to findForEntity()', async () => {
    const repo = createMockEntityAttachmentRepository();
    const created = await repo.create({
      entityType: 'test_case',
      entityId: 'tc-1',
      projectId: 'proj-1',
      storageProvider: 'supabase',
      url: 'https://cdn/1.png',
      fileName: 'shot.png',
      fileSize: 42,
      contentType: 'image/png',
    });

    const results = await repo.findForEntity('test_case', 'tc-1');
    expect(results).toEqual([created]);
  });

  it('findForEntity() filters by entityType and entityId', async () => {
    const repo = createMockEntityAttachmentRepository();
    const a1 = await repo.create({
      entityType: 'test_case',
      entityId: 'tc-1',
      projectId: 'proj-1',
      storageProvider: 'supabase',
      url: 'https://cdn/1.png',
      fileName: 'a.png',
      fileSize: 1,
      contentType: 'image/png',
    });
    await repo.create({
      entityType: 'test_case',
      entityId: 'tc-2',
      projectId: 'proj-1',
      storageProvider: 'supabase',
      url: 'https://cdn/2.png',
      fileName: 'b.png',
      fileSize: 2,
      contentType: 'image/png',
    });

    const results = await repo.findForEntity('test_case', 'tc-1');
    expect(results).toEqual([a1]);
  });

  it('remove() deletes the attachment from subsequent reads', async () => {
    const repo = createMockEntityAttachmentRepository();
    const created = await repo.create({
      entityType: 'test_case',
      entityId: 'tc-1',
      projectId: 'proj-1',
      storageProvider: 'supabase',
      url: 'https://cdn/1.png',
      fileName: 'shot.png',
      fileSize: 42,
      contentType: 'image/png',
    });

    await repo.remove(created.id);

    const results = await repo.findForEntity('test_case', 'tc-1');
    expect(results).toEqual([]);
  });

  it('two instances never share state', async () => {
    const repoA = createMockEntityAttachmentRepository();
    const repoB = createMockEntityAttachmentRepository();

    await repoA.create({
      entityType: 'test_case',
      entityId: 'tc-1',
      projectId: 'proj-1',
      storageProvider: 'supabase',
      url: 'https://cdn/1.png',
      fileName: 'shot.png',
      fileSize: 42,
      contentType: 'image/png',
    });

    await expect(repoB.findForEntity('test_case', 'tc-1')).resolves.toEqual([]);
  });
});
