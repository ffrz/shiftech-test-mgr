import { describe, expect, it } from 'vitest';
import { createMockTestRoleRepository } from './testRoleRepository';

describe('createMockTestRoleRepository', () => {
  it('starts empty when no seed is given', async () => {
    const repo = createMockTestRoleRepository();
    await expect(repo.findAllByProject('any-project')).resolves.toEqual([]);
  });

  it('create() is immediately visible to findAllByProject()', async () => {
    const repo = createMockTestRoleRepository();
    const created = await repo.create({ projectId: 'proj-1', name: 'Admin' });

    const list = await repo.findAllByProject('proj-1');
    expect(list).toHaveLength(1);
    expect(list[0]).toEqual(created);
  });

  it('update() changes are reflected in subsequent reads', async () => {
    const repo = createMockTestRoleRepository();
    const created = await repo.create({ projectId: 'proj-1', name: 'Admin' });

    const updated = await repo.update(created.id, { name: 'Tester' });

    expect(updated.name).toBe('Tester');
    const list = await repo.findAllByProject('proj-1');
    expect(list[0].name).toBe('Tester');
  });

  it('remove() deletes the role from later reads', async () => {
    const repo = createMockTestRoleRepository();
    const created = await repo.create({ projectId: 'proj-1', name: 'Admin' });

    await repo.remove(created.id);

    const list = await repo.findAllByProject('proj-1');
    expect(list).toHaveLength(0);
  });

  it('two instances never share state', async () => {
    const repoA = createMockTestRoleRepository();
    const repoB = createMockTestRoleRepository();

    await repoA.create({ projectId: 'proj-1', name: 'Only in A' });

    await expect(repoB.findAllByProject('proj-1')).resolves.toEqual([]);
  });
});
