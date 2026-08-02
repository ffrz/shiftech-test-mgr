import { describe, expect, it } from 'vitest';
import { createMockTagRepository } from './tagRepository';

describe('createMockTagRepository', () => {
  it('starts empty when no seed is given', async () => {
    const repo = createMockTagRepository();
    await expect(repo.findAllByProject('p1')).resolves.toEqual([]);
  });

  it('create via findOrCreate is immediately visible to findAllByProject', async () => {
    const repo = createMockTagRepository();
    const tag = await repo.findOrCreate('p1', 'smoke');
    await expect(repo.findAllByProject('p1')).resolves.toEqual([tag]);
  });

  it('findAllByProject filters by project and sorts by name', async () => {
    const repo = createMockTagRepository();
    await repo.findOrCreate('p1', 'beta');
    await repo.findOrCreate('p1', 'alpha');
    await repo.findOrCreate('p2', 'gamma');

    const results = await repo.findAllByProject('p1');
    expect(results.map((t) => t.name)).toEqual(['alpha', 'beta']);
  });

  it('findOrCreate returns existing tag when name matches case-insensitively', async () => {
    const repo = createMockTagRepository();
    const first = await repo.findOrCreate('p1', 'Smoke');
    const second = await repo.findOrCreate('p1', 'smoke');
    expect(second.id).toBe(first.id);
    const all = await repo.findAllByProject('p1');
    expect(all).toHaveLength(1);
  });

  it('update changes the name', async () => {
    const repo = createMockTagRepository();
    const tag = await repo.findOrCreate('p1', 'old');
    const updated = await repo.update(tag.id, 'new');
    expect(updated.name).toBe('new');
    const found = await repo.findAllByProject('p1');
    expect(found[0].name).toBe('new');
  });

  it('remove deletes the tag and cleans up junction references', async () => {
    const repo = createMockTagRepository();
    const tag = await repo.findOrCreate('p1', 'smoke');
    await repo.remove(tag.id);
    const found = await repo.findAllByProject('p1');
    expect(found).toHaveLength(0);
  });

  it('findTagsForTestCase returns tags linked via setTagsForTestCase', async () => {
    const repo = createMockTagRepository();
    const t1 = await repo.findOrCreate('p1', 'alpha');
    const t2 = await repo.findOrCreate('p1', 'beta');
    await repo.setTagsForTestCase('tc-1', [t1.id, t2.id]);

    const results = await repo.findTagsForTestCase('tc-1');
    expect(results.map((t) => t.name).sort()).toEqual(['alpha', 'beta']);
  });

  it('setTagsForTestCase replaces existing tags entirely', async () => {
    const repo = createMockTagRepository();
    const t1 = await repo.findOrCreate('p1', 'alpha');
    const t2 = await repo.findOrCreate('p1', 'beta');
    await repo.setTagsForTestCase('tc-1', [t1.id]);
    await repo.setTagsForTestCase('tc-1', [t2.id]);

    const results = await repo.findTagsForTestCase('tc-1');
    expect(results.map((t) => t.id)).toEqual([t2.id]);
  });

  it('findOrCreateMany creates missing tags and returns map', async () => {
    const repo = createMockTagRepository();
    await repo.findOrCreate('p1', 'existing');

    const map = await repo.findOrCreateMany('p1', ['existing', 'new-one', 'new-two']);
    expect(map.get('existing')!.name).toBe('existing');
    expect(map.get('new-one')!.name).toBe('new-one');
    expect(map.get('new-two')!.name).toBe('new-two');

    const all = await repo.findAllByProject('p1');
    expect(all.map((t) => t.name).sort()).toEqual(['existing', 'new-one', 'new-two']);
  });

  it('findOrCreateMany deduplicates names', async () => {
    const repo = createMockTagRepository();
    const map = await repo.findOrCreateMany('p1', ['a', 'A', 'a']);
    expect(map.size).toBe(2);
    const all = await repo.findAllByProject('p1');
    expect(all).toHaveLength(1);
  });

  it('findOrCreateMany with existingTags param avoids rescanning store', async () => {
    const repo = createMockTagRepository();
    const existing = await repo.findOrCreate('p1', 'existing');
    const map = await repo.findOrCreateMany('p1', ['existing', 'fresh'], [existing]);
    expect(map.get('existing')!.id).toBe(existing.id);
    expect(map.get('fresh')!.name).toBe('fresh');
  });

  it('insertIssueTags populates issue-store junction', async () => {
    const repo = createMockTagRepository();
    const t1 = await repo.findOrCreate('p1', 'alpha');
    const t2 = await repo.findOrCreate('p1', 'beta');
    await repo.insertIssueTags([
      { issueId: 'iss-1', tagId: t1.id },
      { issueId: 'iss-1', tagId: t2.id },
      { issueId: 'iss-2', tagId: t1.id },
    ]);
  });

  it('insertTestCaseTags populates test-case junction store', async () => {
    const repo = createMockTagRepository();
    const t1 = await repo.findOrCreate('p1', 'alpha');
    await repo.insertTestCaseTags([{ testCaseId: 'tc-1', tagId: t1.id }]);
    const results = await repo.findTagsForTestCase('tc-1');
    expect(results.map((t) => t.id)).toEqual([t1.id]);
  });

  it('two instances do not share state', async () => {
    const repoA = createMockTagRepository();
    const repoB = createMockTagRepository();

    await repoA.findOrCreate('p1', 'only-in-a');

    await expect(repoB.findAllByProject('p1')).resolves.toEqual([]);
  });
});
