import { describe, expect, it, vi } from 'vitest';

vi.stubEnv('VITE_DATA_SOURCE', 'mock');

const { tagRepository } = await import('./tagRepository');

describe('tagRepository (VITE_DATA_SOURCE=mock)', () => {
  it('findOrCreate creates a tag and is idempotent by name', async () => {
    const a = await tagRepository.findOrCreate('tg-p1', 'Smoke');
    const b = await tagRepository.findOrCreate('tg-p1', 'smoke');
    expect(b.id).toBe(a.id);
    expect(b.name).toBe('Smoke');
  });

  it('findAllByProject returns the project tags sorted by name', async () => {
    await tagRepository.findOrCreate('tg-p2', 'Zeta');
    await tagRepository.findOrCreate('tg-p2', 'Alpha');
    const tags = await tagRepository.findAllByProject('tg-p2');
    expect(tags.map((t) => t.name)).toEqual(['Alpha', 'Zeta']);
  });

  it('update renames the tag', async () => {
    const tag = await tagRepository.findOrCreate('tg-p3', 'Old');
    const updated = await tagRepository.update(tag.id, 'New');
    expect(updated.name).toBe('New');
    const tags = await tagRepository.findAllByProject('tg-p3');
    expect(tags).toEqual([expect.objectContaining({ id: tag.id, name: 'New' })]);
  });

  it('remove deletes the tag', async () => {
    const tag = await tagRepository.findOrCreate('tg-p4', 'Temp');
    await tagRepository.remove(tag.id);
    await expect(tagRepository.findAllByProject('tg-p4')).resolves.toEqual([]);
  });

  it('setTagsForTestCase and findTagsForTestCase round-trip', async () => {
    const a = await tagRepository.findOrCreate('tg-p5', 'RoundTripA');
    const b = await tagRepository.findOrCreate('tg-p5', 'RoundTripB');
    await tagRepository.setTagsForTestCase('tg-tc-1', [a.id, b.id]);
    const tags = await tagRepository.findTagsForTestCase('tg-tc-1');
    expect(tags.map((t) => t.id).sort()).toEqual([a.id, b.id].sort());
    await tagRepository.setTagsForTestCase('tg-tc-1', []);
    await expect(tagRepository.findTagsForTestCase('tg-tc-1')).resolves.toEqual([]);
  });

  it('findOrCreateMany returns a deduped name-to-tag map', async () => {
    const map = await tagRepository.findOrCreateMany('tg-p6', ['One', 'Two', 'One']);
    expect(map.size).toBe(2);
    expect(map.has('One')).toBe(true);
    expect(map.has('Two')).toBe(true);
    expect(map.get('One')).toEqual(expect.objectContaining({ projectId: 'tg-p6', name: 'One' }));
  });

  it('insertTestCaseTags and insertIssueTags wire through', async () => {
    const tag = await tagRepository.findOrCreate('tg-p7', 'Linked');
    await tagRepository.insertTestCaseTags([{ testCaseId: 'tg-tc-2', tagId: tag.id }]);
    await tagRepository.insertIssueTags([{ issueId: 'tg-iss-1', tagId: tag.id }]);
    const tags = await tagRepository.findTagsForTestCase('tg-tc-2');
    expect(tags).toHaveLength(1);
    expect(tags[0].id).toBe(tag.id);
  });
});
