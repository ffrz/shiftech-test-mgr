import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('../repositories/auditLogRepository', () => ({
  auditLogRepository: { findAllByProject: vi.fn() },
}));

const { auditLogRepository } = await import('../repositories/auditLogRepository');
const { auditLogService } = await import('./auditLogService');

beforeEach(() => {
  vi.clearAllMocks();
});

describe('auditLogService.listByProject', () => {
  it('delegates to the repository with options unchanged', async () => {
    vi.mocked(auditLogRepository.findAllByProject).mockResolvedValue([{ id: 'log-1' } as never]);

    const options = { entityTypes: ['test_case'], search: 'auth', page: 1, pageSize: 20 };
    const result = await auditLogService.listByProject('proj-1', options);

    expect(auditLogRepository.findAllByProject).toHaveBeenCalledWith('proj-1', options);
    expect(result).toHaveLength(1);
  });
});
