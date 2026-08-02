import { describe, expect, it, vi } from 'vitest';

vi.stubEnv('VITE_DATA_SOURCE', 'mock');

const { profileRepository } = await import('./profileRepository');

describe('profileRepository (VITE_DATA_SOURCE=mock)', () => {
  it('findById routes through the mock adapter and returns null for an unknown id', async () => {
    await expect(profileRepository.findById('prof-none-1')).resolves.toBeNull();
  });

  it('findByUsername returns null for an unknown username', async () => {
    await expect(profileRepository.findByUsername('ghost-user')).resolves.toBeNull();
  });

  it('findByIds returns an empty array when no profiles exist', async () => {
    await expect(profileRepository.findByIds(['prof-none-2', 'prof-none-3'])).resolves.toEqual([]);
  });

  it('search returns an empty array from the unseeded store', async () => {
    await expect(profileRepository.search('anyone')).resolves.toEqual([]);
  });

  it('update rejects for an unknown profile', async () => {
    await expect(profileRepository.update('prof-none-4', { displayName: 'X' })).rejects.toThrow(/mock profile not found/);
  });
});
