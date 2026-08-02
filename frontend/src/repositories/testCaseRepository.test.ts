import { describe, expect, it, vi } from 'vitest';

vi.stubEnv('VITE_DATA_SOURCE', 'mock');

const { testCaseRepository } = await import('./testCaseRepository');

const tcInput = (overrides: { projectId: string; code?: string; title: string; steps: string; expectedResult: string }) => ({
  projectId: overrides.projectId,
  moduleId: null,
  code: overrides.code ?? undefined,
  title: overrides.title,
  objective: null,
  preconditions: null,
  steps: overrides.steps,
  expectedResult: overrides.expectedResult,
  priority: 'medium' as const,
  status: 'active' as const,
  notes: null,
  stepType: 'simple' as const,
  targetRoleId: null,
  externalLinks: [],
  createdBy: null,
});

describe('testCaseRepository (VITE_DATA_SOURCE=mock)', () => {
  it('create -> findAllByProject routes through the mock adapter', async () => {
    const created = await testCaseRepository.create(
      tcInput({ projectId: 'tc-p1', title: 'Login with valid credentials', steps: 'Open app, submit credentials', expectedResult: 'User is logged in' }),
    );
    await expect(testCaseRepository.findAllByProject('tc-p1')).resolves.toMatchObject([
      { id: created.id, title: 'Login with valid credentials', status: 'active' },
    ]);
  });

  it('create -> update -> remove round-trips', async () => {
    const created = await testCaseRepository.create(
      tcInput({ projectId: 'tc-p2', title: 'Original title', steps: 'Step', expectedResult: 'Result' }),
    );
    const updated = await testCaseRepository.update(created.id, { title: 'Updated title', priority: 'high' });
    expect(updated.title).toBe('Updated title');
    expect(updated.priority).toBe('high');

    await testCaseRepository.remove(created.id);
    await expect(testCaseRepository.findAllByProject('tc-p2')).resolves.toEqual([]);
  });

  it('create with explicit code -> findByCode returns it', async () => {
    const created = await testCaseRepository.create(
      tcInput({ projectId: 'tc-p4', code: 'TC-XYZ', title: 'Code lookup', steps: 'Step', expectedResult: 'Result' }),
    );
    await expect(testCaseRepository.findByCode('tc-p4', 'TC-XYZ')).resolves.toMatchObject({ id: created.id });
  });

  it('attachToPlan -> findCasesForPlan round-trips the plan case with its test case', async () => {
    const created = await testCaseRepository.create(
      tcInput({ projectId: 'tc-p3', title: 'Case in plan', steps: 'Step', expectedResult: 'Result' }),
    );
    const attached = await testCaseRepository.attachToPlan('tc-plan-1', created.id, 1);
    const found = await testCaseRepository.findCasesForPlan('tc-plan-1');
    expect(found).toHaveLength(1);
    expect(found[0].id).toBe(attached.id);
    expect(found[0].order).toBe(1);
    expect(found[0].testCase.id).toBe(created.id);
  });
});
