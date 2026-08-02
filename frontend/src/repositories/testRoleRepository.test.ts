import { describe, expect, it, vi } from 'vitest';

// Proves the public repository delegates to the mock adapter selected by the
// resolver when VITE_DATA_SOURCE=mock. The adapter's own round-trips are tested
// in adapters/mock/*.test.ts; this layer verifies the wiring (public file ->
// resolver -> mock) is intact end to end.
vi.stubEnv('VITE_DATA_SOURCE', 'mock');

const { testRoleRepository } = await import('./testRoleRepository');

describe('testRoleRepository (VITE_DATA_SOURCE=mock)', () => {
  it('routes findAllByProject through the mock adapter', async () => {
    const created = await testRoleRepository.create({ projectId: 'p1', name: 'Admin' });
    await expect(testRoleRepository.findAllByProject('p1')).resolves.toMatchObject([{ id: created.id, name: 'Admin' }]);
  });

  it('create -> update -> remove round-trips', async () => {
    const created = await testRoleRepository.create({ projectId: 'p2', name: 'Manager' });
    const updated = await testRoleRepository.update(created.id, { name: 'Supervisor' });
    expect(updated.name).toBe('Supervisor');

    await testRoleRepository.remove(created.id);
    await expect(testRoleRepository.findAllByProject('p2')).resolves.toEqual([]);
  });

  it('createMany inserts multiple rows', async () => {
    const rows = await testRoleRepository.createMany([
      { projectId: 'p3', name: 'A' },
      { projectId: 'p3', name: 'B' },
    ]);
    expect(rows).toHaveLength(2);
    await expect(testRoleRepository.findAllByProject('p3')).resolves.toHaveLength(2);
  });
});
