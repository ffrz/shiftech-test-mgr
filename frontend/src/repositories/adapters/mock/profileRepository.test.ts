import { describe, expect, it } from 'vitest';
import { createMockProfileRepository } from './profileRepository';
import type { Profile } from '../../../types/domain';

function makeProfile(overrides: Partial<Profile> & { id: string; username: string }): Profile {
  return {
    displayName: null,
    avatarUrl: null,
    bio: null,
    usernameChanged: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('createMockProfileRepository', () => {
  it('starts empty when no seed is given', async () => {
    const repo = createMockProfileRepository();
    await expect(repo.findById('any')).resolves.toBeNull();
    await expect(repo.findByUsername('any')).resolves.toBeNull();
    await expect(repo.findByIds(['any'])).resolves.toEqual([]);
    await expect(repo.search('any')).resolves.toEqual([]);
  });

  it('seed data is visible to all read methods', async () => {
    const alice = makeProfile({ id: 'u1', username: 'alice', displayName: 'Alice' });
    const bob = makeProfile({ id: 'u2', username: 'bob', displayName: 'Bob' });
    const repo = createMockProfileRepository([alice, bob]);

    await expect(repo.findById('u1')).resolves.toEqual(alice);
    await expect(repo.findByUsername('bob')).resolves.toEqual(bob);
    await expect(repo.findByIds(['u1', 'u2'])).resolves.toEqual([alice, bob]);
  });

  it('findById returns null for missing id', async () => {
    const repo = createMockProfileRepository([makeProfile({ id: 'u1', username: 'alice' })]);
    await expect(repo.findById('nonexistent')).resolves.toBeNull();
  });

  it('findByUsername returns null for missing username', async () => {
    const repo = createMockProfileRepository([makeProfile({ id: 'u1', username: 'alice' })]);
    await expect(repo.findByUsername('bob')).resolves.toBeNull();
  });

  it('findByIds skips missing ids', async () => {
    const alice = makeProfile({ id: 'u1', username: 'alice' });
    const repo = createMockProfileRepository([alice]);
    await expect(repo.findByIds(['u1', 'u2'])).resolves.toEqual([alice]);
  });

  it('findByIds returns empty array for empty input', async () => {
    const repo = createMockProfileRepository([makeProfile({ id: 'u1', username: 'alice' })]);
    await expect(repo.findByIds([])).resolves.toEqual([]);
  });

  it('search filters by username (case-insensitive, partial)', async () => {
    const alice = makeProfile({ id: 'u1', username: 'alice_wonder', displayName: 'Alice' });
    const bob = makeProfile({ id: 'u2', username: 'bob_builder', displayName: 'Bob' });
    const repo = createMockProfileRepository([alice, bob]);

    const results = await repo.search('ALICE');
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('u1');
  });

  it('search filters by displayName (case-insensitive, partial)', async () => {
    const alice = makeProfile({ id: 'u1', username: 'alice', displayName: 'Alice Wonderland' });
    const bob = makeProfile({ id: 'u2', username: 'bob', displayName: 'Bob Builder' });
    const repo = createMockProfileRepository([alice, bob]);

    const results = await repo.search('wonder');
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('u1');
  });

  it('search strips leading @ and special characters', async () => {
    const alice = makeProfile({ id: 'u1', username: 'alice', displayName: 'Alice' });
    const repo = createMockProfileRepository([alice]);

    const results = await repo.search('@alice');
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('u1');
  });

  it('search respects limit', async () => {
    const profiles = Array.from({ length: 10 }, (_, i) =>
      makeProfile({ id: `u${i}`, username: `user${i}`, displayName: `User ${i}` }),
    );
    const repo = createMockProfileRepository(profiles);

    const results = await repo.search('user', 3);
    expect(results).toHaveLength(3);
  });

  it('search returns empty for whitespace-only query', async () => {
    const repo = createMockProfileRepository([makeProfile({ id: 'u1', username: 'alice' })]);
    await expect(repo.search('   ')).resolves.toEqual([]);
  });

  it('update merges changes and sets updatedAt', async () => {
    const alice = makeProfile({ id: 'u1', username: 'alice', displayName: 'Alice' });
    const repo = createMockProfileRepository([alice]);

    const updated = await repo.update('u1', { displayName: 'Alice Updated', bio: 'new bio' });
    expect(updated.displayName).toBe('Alice Updated');
    expect(updated.bio).toBe('new bio');
    expect(updated.username).toBe('alice');

    const reread = await repo.findById('u1');
    expect(reread?.displayName).toBe('Alice Updated');
  });

  it('update throws on missing profile', async () => {
    const repo = createMockProfileRepository();
    await expect(repo.update('nonexistent', { displayName: 'X' })).rejects.toThrow('mock profile not found');
  });

  it('two instances do not share state', async () => {
    const repoA = createMockProfileRepository([makeProfile({ id: 'u1', username: 'alice' })]);
    const repoB = createMockProfileRepository();

    await expect(repoB.findById('u1')).resolves.toBeNull();
    await repoA.update('u1', { displayName: 'Changed' });
    const bAfter = await repoB.findById('u1');
    expect(bAfter).toBeNull();
  });
});
