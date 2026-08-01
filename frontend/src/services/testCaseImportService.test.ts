import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { ParsedTestCaseRow } from '../helpers/csvImport';

vi.mock('../repositories/testCaseRepository', () => ({
  testCaseRepository: { createMany: vi.fn() },
}));
vi.mock('../repositories/testCaseStepRepository', () => ({
  testCaseStepRepository: { createMany: vi.fn() },
}));
vi.mock('./moduleService', () => ({
  moduleService: {
    listByProject: vi.fn(),
    createMany: vi.fn(),
  },
}));
vi.mock('./testRoleService', () => ({
  testRoleService: {
    listByProject: vi.fn(),
    createMany: vi.fn(),
  },
}));
vi.mock('./tagService', () => ({
  tagService: { saveTagsForTestCaseMany: vi.fn() },
}));

const { testCaseRepository } = await import('../repositories/testCaseRepository');
const { testCaseStepRepository } = await import('../repositories/testCaseStepRepository');
const { moduleService } = await import('./moduleService');
const { testRoleService } = await import('./testRoleService');
const { tagService } = await import('./tagService');
const { testCaseImportService } = await import('./testCaseImportService');

function makeRow(overrides: Partial<ParsedTestCaseRow> = {}): ParsedTestCaseRow {
  return {
    rowNumber: 1,
    moduleName: null,
    title: 'Login works',
    objective: null,
    preconditions: null,
    steps: 'Do the thing',
    stepType: 'simple',
    detailedSteps: [],
    expectedResult: 'It works',
    priority: 'medium',
    tagNames: [],
    targetRole: null,
    notes: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(moduleService.listByProject).mockResolvedValue([] as never);
  vi.mocked(testRoleService.listByProject).mockResolvedValue([] as never);
  vi.mocked(moduleService.createMany).mockResolvedValue([] as never);
  vi.mocked(testRoleService.createMany).mockResolvedValue([] as never);
  vi.mocked(tagService.saveTagsForTestCaseMany).mockResolvedValue(undefined);
});

describe('testCaseImportService.importRows', () => {
  it('returns early without any query when there are no rows', async () => {
    await testCaseImportService.importRows('proj-1', []);

    expect(moduleService.listByProject).not.toHaveBeenCalled();
    expect(testCaseRepository.createMany).not.toHaveBeenCalled();
  });

  it('resolves module names case-insensitively and reuses existing modules', async () => {
    vi.mocked(moduleService.listByProject).mockResolvedValue([{ id: 'm-auth', name: 'Auth' }] as never);
    vi.mocked(testCaseRepository.createMany).mockResolvedValue([
      { id: 'tc-0' },
      { id: 'tc-1' },
      { id: 'tc-2' },
    ] as never);

    await testCaseImportService.importRows('proj-1', [
      makeRow({ moduleName: 'Auth' }),
      makeRow({ moduleName: 'auth' }),
      makeRow({ moduleName: null }),
    ]);

    expect(moduleService.createMany).not.toHaveBeenCalled();
    expect(testCaseRepository.createMany).toHaveBeenCalledWith([
      expect.objectContaining({ moduleId: 'm-auth' }),
      expect.objectContaining({ moduleId: 'm-auth' }),
      expect.objectContaining({ moduleId: null }),
    ]);
  });

  it('batch-creates missing modules once, deduplicating exact trimmed names', async () => {
    vi.mocked(moduleService.createMany).mockResolvedValue([
      { id: 'm-billing', name: 'Billing' },
    ] as never);
    vi.mocked(testCaseRepository.createMany).mockResolvedValue([
      { id: 'tc-0' },
      { id: 'tc-1' },
    ] as never);

    await testCaseImportService.importRows('proj-1', [
      makeRow({ moduleName: 'Billing' }),
      makeRow({ moduleName: 'Billing' }),
    ]);

    expect(moduleService.createMany).toHaveBeenCalledTimes(1);
    expect(moduleService.createMany).toHaveBeenCalledWith([{ projectId: 'proj-1', name: 'Billing' }]);
    expect(testCaseRepository.createMany).toHaveBeenCalledWith([
      expect.objectContaining({ moduleId: 'm-billing' }),
      expect.objectContaining({ moduleId: 'm-billing' }),
    ]);
  });

  it('resolves roles case-insensitively and batch-creates missing ones', async () => {
    vi.mocked(testRoleService.createMany).mockResolvedValue([{ id: 'r-admin', name: 'Admin' }] as never);
    vi.mocked(testCaseRepository.createMany).mockResolvedValue([
      { id: 'tc-0' },
      { id: 'tc-1' },
    ] as never);

    await testCaseImportService.importRows('proj-1', [
      makeRow({ targetRole: 'Admin' }),
      makeRow({ targetRole: 'Admin' }),
    ]);

    expect(testRoleService.createMany).toHaveBeenCalledTimes(1);
    expect(testRoleService.createMany).toHaveBeenCalledWith([{ projectId: 'proj-1', name: 'Admin' }]);
    expect(testCaseRepository.createMany).toHaveBeenCalledWith([
      expect.objectContaining({ targetRoleId: 'r-admin' }),
      expect.objectContaining({ targetRoleId: 'r-admin' }),
    ]);
  });

  it('assigns tags index-aligned so row N tags attach to row N test case', async () => {
    vi.mocked(testCaseRepository.createMany).mockResolvedValue([
      { id: 'tc-0' },
      { id: 'tc-1' },
      { id: 'tc-2' },
    ] as never);

    await testCaseImportService.importRows('proj-1', [
      makeRow({ tagNames: ['smoke'] }),
      makeRow({ tagNames: ['auth', 'ui'] }),
      makeRow({ tagNames: [] }),
    ]);

    expect(tagService.saveTagsForTestCaseMany).toHaveBeenCalledWith('proj-1', [
      { testCaseId: 'tc-0', tagNames: ['smoke'] },
      { testCaseId: 'tc-1', tagNames: ['auth', 'ui'] },
      { testCaseId: 'tc-2', tagNames: [] },
    ]);
  });

  it('inserts detailed steps only for detailed rows, sequentially per row', async () => {
    vi.mocked(testCaseRepository.createMany).mockResolvedValue([
      { id: 'tc-0' },
      { id: 'tc-1' },
      { id: 'tc-2' },
      { id: 'tc-3' },
    ] as never);

    await testCaseImportService.importRows('proj-1', [
      makeRow({ title: 'simple-0', stepType: 'simple', steps: 's' }),
      makeRow({
        title: 'detailed-1',
        stepType: 'detailed',
        steps: '',
        detailedSteps: [
          { action: 'Open', expectedResult: 'Form shown' },
          { action: 'Submit', expectedResult: null },
        ],
      }),
      makeRow({ title: 'detailed-2', stepType: 'detailed', steps: '', detailedSteps: [{ action: 'Check', expectedResult: 'ok' }] }),
      makeRow({ title: 'simple-3', stepType: 'simple', steps: 's' }),
    ]);

    expect(testCaseStepRepository.createMany).toHaveBeenCalledTimes(2);
    expect(testCaseStepRepository.createMany).toHaveBeenNthCalledWith(1, [
      { testCaseId: 'tc-1', stepNumber: 1, action: 'Open', expectedResult: 'Form shown' },
      { testCaseId: 'tc-1', stepNumber: 2, action: 'Submit', expectedResult: null },
    ]);
    expect(testCaseStepRepository.createMany).toHaveBeenNthCalledWith(2, [
      { testCaseId: 'tc-2', stepNumber: 1, action: 'Check', expectedResult: 'ok' },
    ]);
  });

  it('falls back to null module/role ids when the create returns fewer rows than requested', async () => {
    // Defensive path: createMany returned a module/role row without the expected name,
    // so the lookup map never got the entry and each row resolves to null.
    vi.mocked(moduleService.createMany).mockResolvedValue([{ id: 'm-unknown', name: 'Other' }] as never);
    vi.mocked(testRoleService.createMany).mockResolvedValue([{ id: 'r-unknown', name: 'Other' }] as never);
    vi.mocked(testCaseRepository.createMany).mockResolvedValue([{ id: 'tc-0' }] as never);

    await testCaseImportService.importRows('proj-1', [
      makeRow({ moduleName: 'Billing', targetRole: 'Admin' }),
    ]);

    expect(testCaseRepository.createMany).toHaveBeenCalledWith([
      expect.objectContaining({ moduleId: null, targetRoleId: null }),
    ]);
  });
});
