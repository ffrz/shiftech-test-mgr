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
    vi.mocked(auditLogRepository.findAllByProject).mockResolvedValue({
      data: [{ id: 'log-1', actorName: 'Alice' } as never],
      total: 1,
    });

    const options = { entityTypes: ['test_case'], search: 'auth', page: 1, pageSize: 20 };
    const result = await auditLogService.listByProject('proj-1', options);

    expect(auditLogRepository.findAllByProject).toHaveBeenCalledWith('proj-1', options);
    expect(result.data).toHaveLength(1);
    expect(result.total).toBe(1);
  });
});
