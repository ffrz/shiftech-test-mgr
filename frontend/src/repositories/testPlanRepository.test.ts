import { describe, expect, it, vi } from 'vitest';

vi.stubEnv('VITE_DATA_SOURCE', 'mock');

const { testPlanRepository } = await import('./testPlanRepository');

describe('testPlanRepository (VITE_DATA_SOURCE=mock)', () => {
  it('create -> findAllByProject returns the plan', async () => {
    const created = await testPlanRepository.create({
      projectId: 'tp-p1',
      name: 'Release 1.0 Smoke',
      description: 'Smoke tests for release 1.0',
    });
    await expect(testPlanRepository.findAllByProject('tp-p1')).resolves.toMatchObject([
      { id: created.id, name: 'Release 1.0 Smoke', status: 'draft' },
    ]);
  });

  it('create -> update -> remove round-trips', async () => {
    const created = await testPlanRepository.create({
      projectId: 'tp-p2',
      name: 'Plan A',
      description: null,
    });
    const updated = await testPlanRepository.update(created.id, { name: 'Plan A v2', status: 'active' });
    expect(updated.name).toBe('Plan A v2');
    expect(updated.status).toBe('active');

    await testPlanRepository.remove(created.id);
    await expect(testPlanRepository.findAllByProject('tp-p2')).resolves.toEqual([]);
  });

  it('findAllByProject filters by search and status options', async () => {
    const p1 = await testPlanRepository.create({ projectId: 'tp-p3', name: 'Alpha Smoke', description: null });
    const p2 = await testPlanRepository.create({ projectId: 'tp-p3', name: 'Beta Regression', description: null });
    await testPlanRepository.update(p2.id, { status: 'active' });

    await expect(testPlanRepository.findAllByProject('tp-p3', { search: 'smoke' })).resolves.toHaveLength(1);
    await expect(testPlanRepository.findAllByProject('tp-p3', { statuses: ['active'] })).resolves.toMatchObject([
      { id: p2.id },
    ]);
    await expect(testPlanRepository.findAllByProject('tp-p3', { search: 'alpha', statuses: ['draft'] })).resolves.toMatchObject([
      { id: p1.id },
    ]);
  });
});
