import { describe, expect, it, vi } from 'vitest';

vi.stubEnv('VITE_DATA_SOURCE', 'mock');

const { userRepository } = await import('./userRepository');

describe('userRepository (VITE_DATA_SOURCE=mock)', () => {
  it('findAll returns empty array on shared mock with no seed', async () => {
    await expect(userRepository.findAll()).resolves.toEqual([]);
  });

  it('findById returns null for unknown id', async () => {
    await expect(userRepository.findById('user-missing-1')).resolves.toBeNull();
  });

  it('findAllPaginated returns empty page', async () => {
    await expect(
      userRepository.findAllPaginated({ search: 'nobody', page: 1, pageSize: 20 }),
    ).resolves.toEqual({ data: [], total: 0 });
  });

  it('updateRole throws for unknown id', async () => {
    await expect(userRepository.updateRole('user-missing-2', 'admin')).rejects.toThrow('mock user not found');
  });

  it('softDelete throws for unknown id', async () => {
    await expect(userRepository.softDelete('user-missing-3')).rejects.toThrow('mock user not found');
  });
});
