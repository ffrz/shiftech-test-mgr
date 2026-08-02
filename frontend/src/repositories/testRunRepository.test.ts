import { describe, expect, it, vi } from 'vitest';

vi.stubEnv('VITE_DATA_SOURCE', 'mock');

const { testRunRepository } = await import('./testRunRepository');

describe('testRunRepository (VITE_DATA_SOURCE=mock)', () => {
  it('create -> findAllByPlan -> findById round-trip', async () => {
    const created = await testRunRepository.create({
      projectId: 'tr-project-1',
      testPlanId: 'tr-plan-1',
      name: 'Release Smoke',
      code: 'TR-1001',
      startedBy: 'user-1',
    });
    expect(created.id).toBeTruthy();
    expect(created.status).toBe('in_progress');

    await expect(testRunRepository.findAllByPlan('tr-plan-1')).resolves.toMatchObject([
      { id: created.id, name: 'Release Smoke', code: 'TR-1001' },
    ]);
    await expect(testRunRepository.findById(created.id)).resolves.toMatchObject({
      projectId: 'tr-project-1',
      testPlanId: 'tr-plan-1',
      startedBy: 'user-1',
    });
  });

  it('findById returns null for unknown id', async () => {
    await expect(testRunRepository.findById('tr-missing-1')).resolves.toBeNull();
  });

  it('update reflects name/code changes', async () => {
    const created = await testRunRepository.create({
      projectId: 'tr-project-2',
      name: 'Original Name',
    });
    const updated = await testRunRepository.update(created.id, { name: 'Renamed', code: 'TR-2002' });
    expect(updated.name).toBe('Renamed');
    expect(updated.code).toBe('TR-2002');
    await expect(testRunRepository.findById(created.id)).resolves.toMatchObject({
      name: 'Renamed',
      code: 'TR-2002',
    });
  });

  it('updateStatus reflects status and completedAt', async () => {
    const created = await testRunRepository.create({
      projectId: 'tr-project-3',
      name: 'Status Run',
    });
    const completed = await testRunRepository.updateStatus(created.id, 'completed', 'all good');
    expect(completed.status).toBe('completed');
    expect(completed.completedAt).toBeTruthy();
    expect(completed.notes).toBe('all good');
    await expect(testRunRepository.findById(created.id)).resolves.toMatchObject({
      status: 'completed',
      notes: 'all good',
    });
  });

  it('remove deletes the run', async () => {
    const created = await testRunRepository.create({
      projectId: 'tr-project-4',
      testPlanId: 'tr-plan-4',
      name: 'Doomed Run',
    });
    await testRunRepository.remove(created.id);
    await expect(testRunRepository.findById(created.id)).resolves.toBeNull();
    await expect(testRunRepository.findAllByPlan('tr-plan-4')).resolves.toEqual([]);
  });
});
