import { describe, expect, it, vi } from 'vitest';

vi.stubEnv('VITE_DATA_SOURCE', 'mock');

const { auditLogRepository } = await import('./auditLogRepository');

describe('auditLogRepository (VITE_DATA_SOURCE=mock)', () => {
  it('findAllByProject returns the empty shape on the empty store', async () => {
    const result = await auditLogRepository.findAllByProject('audit-empty-1', { page: 1, pageSize: 20 });
    expect(result).toEqual({ data: [], total: 0 });
  });

  it('findAllByProject with entityTypes filter returns the empty shape', async () => {
    const result = await auditLogRepository.findAllByProject('audit-empty-2', {
      entityTypes: ['issue', 'test_case'],
      page: 1,
      pageSize: 20,
    });
    expect(result).toEqual({ data: [], total: 0 });
  });

  it('findAllByProject with search filter returns the empty shape', async () => {
    const result = await auditLogRepository.findAllByProject('audit-empty-3', {
      search: 'nothing',
      page: 1,
      pageSize: 20,
    });
    expect(result).toEqual({ data: [], total: 0 });
  });

  it('findAllByProject with an out-of-range page returns the empty shape', async () => {
    const result = await auditLogRepository.findAllByProject('audit-empty-4', { page: 5, pageSize: 20 });
    expect(result).toEqual({ data: [], total: 0 });
  });
});
