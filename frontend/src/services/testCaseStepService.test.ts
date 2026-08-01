import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('../repositories/testCaseStepRepository', () => ({
  testCaseStepRepository: {
    findAllByTestCase: vi.fn(),
    replaceForTestCase: vi.fn(),
  },
}));

const { testCaseStepRepository } = await import('../repositories/testCaseStepRepository');
const { testCaseStepService } = await import('./testCaseStepService');

beforeEach(() => {
  vi.clearAllMocks();
});

describe('testCaseStepService.listByTestCase', () => {
  it('delegates to the repository', async () => {
    vi.mocked(testCaseStepRepository.findAllByTestCase).mockResolvedValue([{ id: 's1' } as never]);
    const result = await testCaseStepService.listByTestCase('tc-1');
    expect(testCaseStepRepository.findAllByTestCase).toHaveBeenCalledWith('tc-1');
    expect(result).toHaveLength(1);
  });
});

describe('testCaseStepService.replaceForTestCase', () => {
  it('trims action and expectedResult, drops steps with an empty action, before delegating', async () => {
    vi.mocked(testCaseStepRepository.replaceForTestCase).mockResolvedValue(undefined as never);

    testCaseStepService.replaceForTestCase('tc-1', [
      { action: '  Click login  ', expectedResult: '  Dashboard shown  ' },
      { action: '   ', expectedResult: 'ignored' },
      { action: '  ', expectedResult: ' also ignored ' },
    ]);

    expect(testCaseStepRepository.replaceForTestCase).toHaveBeenCalledWith('tc-1', [
      { action: 'Click login', expectedResult: 'Dashboard shown' },
    ]);
  });

  it('maps a missing expectedResult to null', async () => {
    vi.mocked(testCaseStepRepository.replaceForTestCase).mockResolvedValue(undefined as never);

    testCaseStepService.replaceForTestCase('tc-1', [{ action: 'Click login' }]);

    expect(testCaseStepRepository.replaceForTestCase).toHaveBeenCalledWith('tc-1', [
      { action: 'Click login', expectedResult: null },
    ]);
  });
});
