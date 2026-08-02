import { describe, expect, it, vi } from 'vitest';

vi.stubEnv('VITE_DATA_SOURCE', 'mock');

const { moduleRepository } = await import('./moduleRepository');

describe('moduleRepository (VITE_DATA_SOURCE=mock)', () => {
  it('create() with a unique projectId then findAllByProject returns it', async () => {
    const created = await moduleRepository.create({ projectId: 'module-p1', name: 'Auth' });
    const rows = await moduleRepository.findAllByProject('module-p1');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: created.id, name: 'Auth' });
  });

  it('update() changes are reflected in findAllByProject', async () => {
    const created = await moduleRepository.create({ projectId: 'module-p2', name: 'Payments', code: 'PAY' });
    await moduleRepository.update(created.id, { name: 'Billing', code: 'BIL' });
    const rows = await moduleRepository.findAllByProject('module-p2');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: created.id, name: 'Billing', code: 'BIL' });
  });

  it('createMany() inserts multiple modules', async () => {
    const created = await moduleRepository.createMany([
      { projectId: 'module-p3', name: 'A' },
      { projectId: 'module-p3', name: 'B' },
      { projectId: 'module-p3', name: 'C' },
    ]);
    expect(created).toHaveLength(3);
    await expect(moduleRepository.findAllByProject('module-p3')).resolves.toHaveLength(3);
  });

  it('remove() removes the module', async () => {
    const created = await moduleRepository.create({ projectId: 'module-p4', name: 'Legacy' });
    await moduleRepository.remove(created.id);
    await expect(moduleRepository.findAllByProject('module-p4')).resolves.toEqual([]);
  });
});
