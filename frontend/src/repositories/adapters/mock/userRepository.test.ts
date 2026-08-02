import { describe, expect, it } from 'vitest';
import { createMockUserRepository } from './userRepository';
import type { User } from '../../../types/domain';

function seedUser(overrides: Partial<User> = {}): User {
  return {
    id: overrides.id ?? 'u-1',
    email: overrides.email ?? 'a@test.com',
    role: overrides.role ?? 'user',
    createdAt: overrides.createdAt ?? '2025-01-01T00:00:00.000Z',
    updatedAt: overrides.updatedAt ?? '2025-01-01T00:00:00.000Z',
    deletedAt: overrides.deletedAt ?? null,
  };
}

describe('createMockUserRepository', () => {
  it('starts empty when no seed is given', async () => {
    const repo = createMockUserRepository();
    await expect(repo.findAll()).resolves.toEqual([]);
  });

  it('seed+findAll shows non-deleted users sorted by createdAt desc', async () => {
    const earlier = seedUser({ id: 'u-1', email: 'a@test.com', createdAt: '2025-01-01T00:00:00.000Z' });
    const later = seedUser({ id: 'u-2', email: 'b@test.com', createdAt: '2025-06-01T00:00:00.000Z' });
    const repo = createMockUserRepository([earlier, later]);

    const all = await repo.findAll();

    expect(all).toHaveLength(2);
    expect(all[0].id).toBe('u-2');
    expect(all[1].id).toBe('u-1');
  });

  it('findAll skips deleted users', async () => {
    const active = seedUser({ id: 'u-1', deletedAt: null });
    const deleted = seedUser({ id: 'u-2', deletedAt: '2025-02-01T00:00:00.000Z' });
    const repo = createMockUserRepository([active, deleted]);

    const all = await repo.findAll();

    expect(all).toHaveLength(1);
    expect(all[0].id).toBe('u-1');
  });

  it('findById returns null for a deleted user', async () => {
    const deleted = seedUser({ id: 'u-1', deletedAt: '2025-02-01T00:00:00.000Z' });
    const repo = createMockUserRepository([deleted]);

    await expect(repo.findById('u-1')).resolves.toBeNull();
  });

  it('findById returns the user when not deleted', async () => {
    const user = seedUser();
    const repo = createMockUserRepository([user]);

    await expect(repo.findById('u-1')).resolves.toEqual(user);
  });

  it('updateRole changes the role and updates updatedAt', async () => {
    const user = seedUser({ role: 'user', updatedAt: '2025-01-01T00:00:00.000Z' });
    const repo = createMockUserRepository([user]);

    const updated = await repo.updateRole('u-1', 'admin');

    expect(updated.role).toBe('admin');
    expect(updated.updatedAt).not.toBe('2025-01-01T00:00:00.000Z');
    const read = await repo.findById('u-1');
    expect(read!.role).toBe('admin');
  });

  it('softDelete sets deletedAt on the user', async () => {
    const user = seedUser({ deletedAt: null });
    const repo = createMockUserRepository([user]);

    await repo.softDelete('u-1');

    const read = await repo.findById('u-1');
    expect(read).toBeNull();
    const all = await repo.findAll();
    expect(all).toHaveLength(0);
  });

  it('findAllPaginated filters by search (email)', async () => {
    const a = seedUser({ id: 'u-1', email: 'alice@test.com' });
    const b = seedUser({ id: 'u-2', email: 'bob@test.com' });
    const repo = createMockUserRepository([a, b]);

    const result = await repo.findAllPaginated({ search: 'alice', page: 1, pageSize: 10 });

    expect(result.total).toBe(1);
    expect(result.data[0].id).toBe('u-1');
  });

  it('findAllPaginated filters by roles', async () => {
    const admin = seedUser({ id: 'u-1', email: 'a@test.com', role: 'admin' });
    const user = seedUser({ id: 'u-2', email: 'b@test.com', role: 'user' });
    const repo = createMockUserRepository([admin, user]);

    const result = await repo.findAllPaginated({ roles: ['admin'], page: 1, pageSize: 10 });

    expect(result.total).toBe(1);
    expect(result.data[0].id).toBe('u-1');
  });

  it('findAllPaginated paginates correctly', async () => {
    const users = Array.from({ length: 5 }, (_, i) =>
      seedUser({ id: `u-${i + 1}`, email: `u${i + 1}@test.com`, createdAt: `2025-01-0${i + 1}T00:00:00.000Z` }),
    );
    const repo = createMockUserRepository(users);

    const page1 = await repo.findAllPaginated({ page: 1, pageSize: 2 });

    expect(page1.total).toBe(5);
    expect(page1.data).toHaveLength(2);

    const page2 = await repo.findAllPaginated({ page: 2, pageSize: 2 });

    expect(page2.data).toHaveLength(2);
    expect(page2.data[0].id).not.toBe(page1.data[0].id);
  });

  it('two instances never share state', async () => {
    const repoA = createMockUserRepository([seedUser({ id: 'u-1', email: 'a@test.com' })]);
    const repoB = createMockUserRepository();

    await expect(repoA.findAll()).resolves.toHaveLength(1);
    await expect(repoB.findAll()).resolves.toEqual([]);
  });
});
