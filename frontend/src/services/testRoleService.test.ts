import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('../repositories/testRoleRepository', () => ({
  testRoleRepository: {
    findAllByProject: vi.fn(),
    create: vi.fn(),
    createMany: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
}));

const { testRoleRepository } = await import('../repositories/testRoleRepository');
const { testRoleService } = await import('./testRoleService');

beforeEach(() => {
  vi.clearAllMocks();
});

describe('testRoleService.create', () => {
  it('rejects an empty role name', async () => {
    await expect(testRoleService.create({ projectId: 'proj-1', name: '   ' })).rejects.toThrow(
      'Role name cannot be empty',
    );
    expect(testRoleRepository.create).not.toHaveBeenCalled();
  });

  it('trims the role name before delegating', async () => {
    vi.mocked(testRoleRepository.create).mockResolvedValue({ id: 'r1' } as never);

    await testRoleService.create({ projectId: 'proj-1', name: '  Admin  ' });

    expect(testRoleRepository.create).toHaveBeenCalledWith({ projectId: 'proj-1', name: 'Admin' });
  });
});

describe('testRoleService.createMany', () => {
  it('trims the role name for every input', async () => {
    vi.mocked(testRoleRepository.createMany).mockResolvedValue([] as never);

    await testRoleService.createMany([
      { projectId: 'proj-1', name: '  Admin  ' },
      { projectId: 'proj-1', name: ' Manager ' },
    ]);

    expect(testRoleRepository.createMany).toHaveBeenCalledWith([
      { projectId: 'proj-1', name: 'Admin' },
      { projectId: 'proj-1', name: 'Manager' },
    ]);
  });
});

describe('testRoleService.update', () => {
  it('rejects an empty role name', async () => {
    await expect(testRoleService.update('r1', { name: '  ' })).rejects.toThrow('Role name cannot be empty');
  });

  it('trims the role name before delegating', async () => {
    vi.mocked(testRoleRepository.update).mockResolvedValue({ id: 'r1' } as never);

    await testRoleService.update('r1', { name: '  Tester  ' });

    expect(testRoleRepository.update).toHaveBeenCalledWith('r1', { name: 'Tester' });
  });
});

describe('testRoleService passthrough ops', () => {
  it('delegates listByProject', async () => {
    vi.mocked(testRoleRepository.findAllByProject).mockResolvedValue([{ id: 'r1' } as never]);
    const result = await testRoleService.listByProject('proj-1');
    expect(testRoleRepository.findAllByProject).toHaveBeenCalledWith('proj-1');
    expect(result).toHaveLength(1);
  });

  it('delegates remove', async () => {
    vi.mocked(testRoleRepository.remove).mockResolvedValue(undefined);
    await testRoleService.remove('r1');
    expect(testRoleRepository.remove).toHaveBeenCalledWith('r1');
  });
});
