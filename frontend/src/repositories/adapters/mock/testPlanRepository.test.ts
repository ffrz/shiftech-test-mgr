import { describe, expect, it } from 'vitest';
import { createMockTestPlanRepository } from './testPlanRepository';

describe('createMockTestPlanRepository', () => {
  it('starts empty when no seed is given', async () => {
    const repo = createMockTestPlanRepository();
    await expect(repo.findAllByProject('project-1')).resolves.toEqual([]);
  });

  it('create() is immediately visible to findAllByProject()/findById()', async () => {
    const repo = createMockTestPlanRepository();
    const created = await repo.create({ projectId: 'p1', name: 'Release Plan', description: 'desc' });

    await expect(repo.findById(created.id)).resolves.toEqual(created);
    await expect(repo.findAllByProject('p1')).resolves.toEqual([created]);
  });

  it('findAllByProject() filters by projectId only', async () => {
    const repo = createMockTestPlanRepository();
    await repo.create({ projectId: 'p1', name: 'Plan A', description: null });
    await repo.create({ projectId: 'p2', name: 'Plan B', description: null });

    const results = await repo.findAllByProject('p1');
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('Plan A');
  });

  it('findAllByProject() search filters by name and code', async () => {
    const repo = createMockTestPlanRepository();
    await repo.create({ projectId: 'p1', name: 'Alpha', code: 'TP-001', description: null });
    await repo.create({ projectId: 'p1', name: 'Beta', code: 'TP-002', description: null });
    await repo.create({ projectId: 'p1', name: 'Gamma', code: 'TP-003', description: null });

    const byName = await repo.findAllByProject('p1', { search: 'alpha' });
    expect(byName).toHaveLength(1);
    expect(byName[0].name).toBe('Alpha');

    const byCode = await repo.findAllByProject('p1', { search: '001' });
    expect(byCode).toHaveLength(1);
    expect(byCode[0].code).toBe('TP-001');
  });

  it('findAllByProject() filters by statuses', async () => {
    const repo = createMockTestPlanRepository();
    await repo.create({ projectId: 'p1', name: 'Plan A', description: null });
    const planB = await repo.create({ projectId: 'p1', name: 'Plan B', description: null });
    await repo.update(planB.id, { status: 'active' });

    const draft = await repo.findAllByProject('p1', { statuses: ['draft'] });
    expect(draft).toHaveLength(1);
    expect(draft[0].name).toBe('Plan A');

    const active = await repo.findAllByProject('p1', { statuses: ['active'] });
    expect(active).toHaveLength(1);
    expect(active[0].name).toBe('Plan B');
  });

  it('findAllByProject() sorts results by code', async () => {
    const repo = createMockTestPlanRepository();
    await repo.create({ projectId: 'p1', name: 'Zulu', code: 'TP-003', description: null });
    await repo.create({ projectId: 'p1', name: 'Alpha', code: 'TP-001', description: null });
    await repo.create({ projectId: 'p1', name: 'Beta', code: 'TP-002', description: null });

    const results = await repo.findAllByProject('p1');
    expect(results.map((r) => r.code)).toEqual(['TP-001', 'TP-002', 'TP-003']);
  });

  it('update() changes are reflected in subsequent reads', async () => {
    const repo = createMockTestPlanRepository();
    const created = await repo.create({ projectId: 'p1', name: 'Original', description: null });

    const updated = await repo.update(created.id, { name: 'Renamed' });

    expect(updated.name).toBe('Renamed');
    await expect(repo.findById(created.id)).resolves.toMatchObject({ name: 'Renamed' });
  });

  it('remove() deletes the test plan from later reads', async () => {
    const repo = createMockTestPlanRepository();
    const created = await repo.create({ projectId: 'p1', name: 'To Delete', description: null });

    await repo.remove(created.id);

    await expect(repo.findById(created.id)).resolves.toBeNull();
    await expect(repo.findAllByProject('p1')).resolves.toEqual([]);
  });

  it('two instances never share state', async () => {
    const repoA = createMockTestPlanRepository();
    const repoB = createMockTestPlanRepository();

    await repoA.create({ projectId: 'p1', name: 'Only in A', description: null });

    await expect(repoB.findAllByProject('p1')).resolves.toEqual([]);
  });
});
