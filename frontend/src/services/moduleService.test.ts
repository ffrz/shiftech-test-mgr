import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('../repositories/moduleRepository', () => ({
  moduleRepository: {
    findAllByProject: vi.fn(),
    create: vi.fn(),
    createMany: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
}));

const { moduleRepository } = await import('../repositories/moduleRepository');
const { moduleService } = await import('./moduleService');

beforeEach(() => {
  vi.clearAllMocks();
});

describe('moduleService.create', () => {
  it('rejects an empty module name', async () => {
    await expect(moduleService.create({ projectId: 'proj-1', name: '   ' })).rejects.toThrow(
      'Module name cannot be empty',
    );
    expect(moduleRepository.create).not.toHaveBeenCalled();
  });

  it('trims name and code before delegating', async () => {
    vi.mocked(moduleRepository.create).mockResolvedValue({ id: 'm1' } as never);

    await moduleService.create({ projectId: 'proj-1', name: '  Auth  ', code: '  AUTH  ' });

    expect(moduleRepository.create).toHaveBeenCalledWith({
      projectId: 'proj-1',
      name: 'Auth',
      code: 'AUTH',
    });
  });

  it('defaults code to null when omitted', async () => {
    vi.mocked(moduleRepository.create).mockResolvedValue({ id: 'm1' } as never);

    await moduleService.create({ projectId: 'proj-1', name: 'Auth' });

    expect(moduleRepository.create).toHaveBeenCalledWith({
      projectId: 'proj-1',
      name: 'Auth',
      code: null,
    });
  });
});

describe('moduleService.createMany', () => {
  it('trims name and code for every input', async () => {
    vi.mocked(moduleRepository.createMany).mockResolvedValue([] as never);

    await moduleService.createMany([
      { projectId: 'proj-1', name: '  Auth  ', code: '  AUTH  ' },
      { projectId: 'proj-1', name: ' Billing ', code: ' BILL ' },
    ]);

    expect(moduleRepository.createMany).toHaveBeenCalledWith([
      { projectId: 'proj-1', name: 'Auth', code: 'AUTH' },
      { projectId: 'proj-1', name: 'Billing', code: 'BILL' },
    ]);
  });

  it('defaults code to null for inputs that omit it', async () => {
    vi.mocked(moduleRepository.createMany).mockResolvedValue([] as never);

    await moduleService.createMany([{ projectId: 'proj-1', name: 'Auth' }]);

    expect(moduleRepository.createMany).toHaveBeenCalledWith([
      { projectId: 'proj-1', name: 'Auth', code: null },
    ]);
  });
});

describe('moduleService.update', () => {
  it('rejects an empty module name', async () => {
    await expect(moduleService.update('m1', { name: '  ', code: 'A' })).rejects.toThrow('Module name cannot be empty');
  });

  it('rejects an empty module code', async () => {
    await expect(moduleService.update('m1', { name: 'Auth', code: '  ' })).rejects.toThrow('Module code cannot be empty');
  });

  it('trims both fields before delegating', async () => {
    vi.mocked(moduleRepository.update).mockResolvedValue({ id: 'm1' } as never);

    await moduleService.update('m1', { name: '  Auth  ', code: '  AUTH  ' });

    expect(moduleRepository.update).toHaveBeenCalledWith('m1', { name: 'Auth', code: 'AUTH' });
  });
});

describe('moduleService passthrough ops', () => {
  it('delegates listByProject', async () => {
    vi.mocked(moduleRepository.findAllByProject).mockResolvedValue([{ id: 'm1' } as never]);
    const result = await moduleService.listByProject('proj-1');
    expect(moduleRepository.findAllByProject).toHaveBeenCalledWith('proj-1');
    expect(result).toHaveLength(1);
  });

  it('delegates remove', async () => {
    vi.mocked(moduleRepository.remove).mockResolvedValue(undefined);
    await moduleService.remove('m1');
    expect(moduleRepository.remove).toHaveBeenCalledWith('m1');
  });
});
