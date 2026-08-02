import { describe, expect, it } from 'vitest';
import { createMockProjectRepository } from './projectRepository';

// Demonstrates the mock adapter's purpose: real create -> list -> update
// round-trips against an isolated in-memory store, which per-call
// vi.fn() stubs (see services/*.test.ts) can't express without manually
// wiring return values for every call in sequence.
describe('createMockProjectRepository', () => {
  it('starts empty when no seed is given', async () => {
    const repo = createMockProjectRepository();
    await expect(repo.findAll()).resolves.toEqual([]);
  });

  it('create() is immediately visible to findAll()/findById()', async () => {
    const repo = createMockProjectRepository();
    const created = await repo.create({ name: 'Alpha', description: 'first project' });

    await expect(repo.findById(created.id)).resolves.toEqual(created);
    await expect(repo.findAll()).resolves.toEqual([created]);
  });

  it('update() changes are reflected in subsequent reads', async () => {
    const repo = createMockProjectRepository();
    const created = await repo.create({ name: 'Alpha', description: null });

    const updated = await repo.update(created.id, { name: 'Alpha Renamed' });

    expect(updated.name).toBe('Alpha Renamed');
    await expect(repo.findById(created.id)).resolves.toMatchObject({ name: 'Alpha Renamed' });
  });

  it('deletePermanently() removes the project from later reads', async () => {
    const repo = createMockProjectRepository();
    const created = await repo.create({ name: 'Alpha', description: null });

    await repo.deletePermanently(created.id);

    await expect(repo.findById(created.id)).resolves.toBeNull();
  });

  it('two instances never share state', async () => {
    const repoA = createMockProjectRepository();
    const repoB = createMockProjectRepository();

    await repoA.create({ name: 'Only in A', description: null });

    await expect(repoB.findAll()).resolves.toEqual([]);
  });

  it('findAll() search filters by name, case-insensitively', async () => {
    const repo = createMockProjectRepository();
    await repo.create({ name: 'Zebra Project', description: null });
    await repo.create({ name: 'Alpha Project', description: null });

    const results = await repo.findAll({ search: 'zebra' });

    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('Zebra Project');
  });
});
