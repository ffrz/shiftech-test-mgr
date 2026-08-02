import { describe, expect, it } from 'vitest';
import { createMockModuleRepository } from './moduleRepository';

describe('createMockModuleRepository', () => {
  it('starts empty when no seed is given', async () => {
    const repo = createMockModuleRepository();
    await expect(repo.findAllByProject('proj-1')).resolves.toEqual([]);
  });

  it('create() is visible to findAllByProject()', async () => {
    const repo = createMockModuleRepository();
    const created = await repo.create({ projectId: 'proj-1', name: 'Core' });

    await expect(repo.findAllByProject('proj-1')).resolves.toEqual([created]);
  });

  it('update() changes are reflected in subsequent reads', async () => {
    const repo = createMockModuleRepository();
    const created = await repo.create({ projectId: 'proj-1', name: 'Core' });

    const updated = await repo.update(created.id, { name: 'Core Renamed' });

    expect(updated.name).toBe('Core Renamed');
    await expect(repo.findAllByProject('proj-1')).resolves.toMatchObject([{ name: 'Core Renamed' }]);
  });

  it('remove() deletes from later reads', async () => {
    const repo = createMockModuleRepository();
    const created = await repo.create({ projectId: 'proj-1', name: 'Core' });

    await repo.remove(created.id);

    await expect(repo.findAllByProject('proj-1')).resolves.toEqual([]);
  });

  it('createMany() bulk inserts are all visible', async () => {
    const repo = createMockModuleRepository();
    await repo.createMany([
      { projectId: 'proj-1', name: 'Alpha', code: 'A' },
      { projectId: 'proj-1', name: 'Beta', code: 'B' },
    ]);

    const all = await repo.findAllByProject('proj-1');
    expect(all).toHaveLength(2);
    expect(all.map((m) => m.name).sort()).toEqual(['Alpha', 'Beta']);
  });

  it('two instances never share state', async () => {
    const repoA = createMockModuleRepository();
    const repoB = createMockModuleRepository();

    await repoA.create({ projectId: 'proj-1', name: 'Only in A' });

    await expect(repoB.findAllByProject('proj-1')).resolves.toEqual([]);
  });
});
