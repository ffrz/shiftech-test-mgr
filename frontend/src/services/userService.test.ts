import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('../config/supabaseClient', () => ({
  supabase: { rpc: vi.fn() },
}));
vi.mock('../repositories/userRepository', () => ({
  userRepository: {
    findById: vi.fn(),
    findAll: vi.fn(),
    findAllPaginated: vi.fn(),
    updateRole: vi.fn(),
    softDelete: vi.fn(),
  },
}));

const { supabase } = await import('../config/supabaseClient');
const { userRepository } = await import('../repositories/userRepository');
const { userService } = await import('./userService');

beforeEach(() => {
  vi.clearAllMocks();
});

describe('userService passthrough reads', () => {
  it('delegates getOwn / getById to findById', async () => {
    vi.mocked(userRepository.findById).mockResolvedValue({ id: 'u1', email: 'a@b.c', role: 'user' } as never);
    const own = await userService.getOwn('u1');
    const byId = await userService.getById('u1');
    expect(userRepository.findById).toHaveBeenCalledTimes(2);
    expect(own?.id).toBe('u1');
    expect(byId?.id).toBe('u1');
  });

  it('delegates listAll to findAll', async () => {
    vi.mocked(userRepository.findAll).mockResolvedValue([{ id: 'u1' } as never]);
    const result = await userService.listAll();
    expect(userRepository.findAll).toHaveBeenCalled();
    expect(result).toHaveLength(1);
  });

  it('forwards pagination params to findAllPaginated', async () => {
    vi.mocked(userRepository.findAllPaginated).mockResolvedValue({ data: [], total: 0 } as never);
    const params = { search: 'al', roles: ['admin'], page: 2, pageSize: 25, sortField: 'email', sortOrder: 'asc' as const };
    await userService.listPaginated(params);
    expect(userRepository.findAllPaginated).toHaveBeenCalledWith(params);
  });
});

describe('userService role/admin operations', () => {
  it('promotes to admin', async () => {
    vi.mocked(userRepository.updateRole).mockResolvedValue({ id: 'u1' } as never);
    await userService.promoteToAdmin('u1');
    expect(userRepository.updateRole).toHaveBeenCalledWith('u1', 'admin');
  });

  it('demotes to user', async () => {
    vi.mocked(userRepository.updateRole).mockResolvedValue({ id: 'u1' } as never);
    await userService.demoteToUser('u1');
    expect(userRepository.updateRole).toHaveBeenCalledWith('u1', 'user');
  });

  it('removes via softDelete', async () => {
    vi.mocked(userRepository.softDelete).mockResolvedValue(undefined);
    await userService.remove('u1');
    expect(userRepository.softDelete).toHaveBeenCalledWith('u1');
  });
});

describe('userService.listPaginated', () => {
  it('maps rows through mapUserRow and falls back to em dash for missing profile fields', async () => {
    vi.mocked(userRepository.findAllPaginated).mockResolvedValue({
      data: [
        {
          id: 'u1',
          email: 'alice@testify.app',
          role: 'user',
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
          deleted_at: null,
          profiles: { display_name: 'Alice', username: 'alice' },
        },
        {
          id: 'u2',
          email: 'bob@testify.app',
          role: 'admin',
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
          deleted_at: null,
          profiles: { display_name: null, username: null },
        },
        {
          id: 'u3',
          email: 'carol@testify.app',
          role: 'user',
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
          deleted_at: null,
          profiles: null,
        },
      ],
      total: 3,
    } as never);

    const result = await userService.listPaginated({ page: 1, pageSize: 10 });

    expect(result.data[0]).toMatchObject({
      id: 'u1',
      email: 'alice@testify.app',
      role: 'user',
      _displayName: 'Alice',
      _username: 'alice',
    });
    expect(result.data[1]).toMatchObject({
      id: 'u2',
      role: 'admin',
      _displayName: '—',
      _username: '—',
    });
    expect(result.data[2]).toMatchObject({
      id: 'u3',
      _displayName: '—',
      _username: '—',
    });
    expect(result.total).toBe(3);
  });
});

describe('userService.deleteAccount', () => {
  it('calls the delete_account RPC and resolves when there is no error', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ error: null } as never);

    await expect(userService.deleteAccount()).resolves.toBeUndefined();

    expect(supabase.rpc).toHaveBeenCalledWith('delete_account');
  });

  it('throws when the RPC returns an error', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ error: new Error('rpc failed') } as never);

    await expect(userService.deleteAccount()).rejects.toThrow('rpc failed');
  });
});
