import { describe, expect, it } from 'vitest';
import { createMockTestRunRepository } from './testRunRepository';

const sampleRun = {
  projectId: 'proj-1',
  testPlanId: 'plan-1',
  name: 'Sprint 1 Run',
  code: null,
  startedBy: 'user-1',
};

describe('createMockTestRunRepository', () => {
  it('starts empty when no seed is given', async () => {
    const repo = createMockTestRunRepository();
    await expect(repo.findAllByPlan('plan-1')).resolves.toEqual([]);
  });

  it('create is immediately visible in findAllByPlan and findById', async () => {
    const repo = createMockTestRunRepository();
    const created = await repo.create(sampleRun);
    await expect(repo.findById(created.id)).resolves.toEqual(created);
    await expect(repo.findAllByPlan('plan-1')).resolves.toEqual([created]);
  });

  it('findAllByPlanPaginated returns paginated results', async () => {
    const repo = createMockTestRunRepository();
    await repo.create({ ...sampleRun, name: 'Run A' });
    await repo.create({ ...sampleRun, name: 'Run B' });

    const page1 = await repo.findAllByPlanPaginated('plan-1', { page: 1, rowsPerPage: 1 });
    expect(page1.data).toHaveLength(1);
    expect(page1.total).toBe(2);

    const page2 = await repo.findAllByPlanPaginated('plan-1', { page: 2, rowsPerPage: 1 });
    expect(page2.data).toHaveLength(1);
  });

  it('findAllByPlanPaginated filters by search', async () => {
    const repo = createMockTestRunRepository();
    await repo.create({ ...sampleRun, name: 'Alpha Run', code: 'TR-0001' });
    const zebra = await repo.create({ ...sampleRun, name: 'Zebra Run', code: 'TR-0002' });

    const result = await repo.findAllByPlanPaginated('plan-1', { search: 'zebra', page: 1, rowsPerPage: 10 });
    expect(result.data).toHaveLength(1);
    expect(result.data[0].id).toBe(zebra.id);
  });

  it('findAllByPlanPaginated filters by statuses', async () => {
    const repo = createMockTestRunRepository();
    await repo.create({ ...sampleRun, name: 'Run 1' });
    const r2 = await repo.create({ ...sampleRun, name: 'Run 2' });
    await repo.updateStatus(r2.id, 'completed');

    const result = await repo.findAllByPlanPaginated('plan-1', { statuses: ['completed'], page: 1, rowsPerPage: 10 });
    expect(result.data).toHaveLength(1);
    expect(result.data[0].status).toBe('completed');
  });

  it('findAllByProject returns runs for the given project', async () => {
    const repo = createMockTestRunRepository();
    await repo.create(sampleRun);
    await repo.create({ ...sampleRun, projectId: 'proj-2', name: 'Other Project Run' });

    const results = await repo.findAllByProject('proj-1');
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('Sprint 1 Run');
  });

  it('update reflects changes in subsequent reads', async () => {
    const repo = createMockTestRunRepository();
    const created = await repo.create(sampleRun);

    const updated = await repo.update(created.id, { name: 'Renamed Run' });
    expect(updated.name).toBe('Renamed Run');
    await expect(repo.findById(created.id)).resolves.toMatchObject({ name: 'Renamed Run' });
  });

  it('updateStatus sets completedAt when completed', async () => {
    const repo = createMockTestRunRepository();
    const created = await repo.create(sampleRun);

    const updated = await repo.updateStatus(created.id, 'completed', 'all done');
    expect(updated.status).toBe('completed');
    expect(updated.completedAt).not.toBeNull();
    expect(updated.notes).toBe('all done');
  });

  it('remove deletes the run', async () => {
    const repo = createMockTestRunRepository();
    const created = await repo.create(sampleRun);

    await repo.remove(created.id);
    await expect(repo.findById(created.id)).resolves.toBeNull();
  });

  it('two instances do not share state', async () => {
    const repoA = createMockTestRunRepository();
    const repoB = createMockTestRunRepository();

    await repoA.create(sampleRun);
    await expect(repoB.findAllByPlan('plan-1')).resolves.toEqual([]);
  });
});
