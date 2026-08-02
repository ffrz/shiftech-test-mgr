import { describe, expect, it, vi } from 'vitest';
import type { TestSuiteItem } from '../types/domain';

vi.stubEnv('VITE_DATA_SOURCE', 'mock');

const { testSuiteRepository } = await import('./testSuiteRepository');

const itemInput = (
  suiteId: string,
  overrides: Partial<Omit<TestSuiteItem, 'id' | 'createdAt' | 'updatedAt'>> = {},
): Omit<TestSuiteItem, 'id' | 'createdAt' | 'updatedAt'> => ({
  suiteId,
  moduleName: null,
  title: 'Login test',
  objective: null,
  preconditions: null,
  steps: '',
  expectedResult: 'success',
  priority: 'medium',
  stepType: 'simple',
  targetRole: null,
  tagNames: [],
  notes: null,
  orderIndex: 0,
  ...overrides,
});

describe('testSuiteRepository (VITE_DATA_SOURCE=mock)', () => {
  it('create -> findById -> findAll round-trip', async () => {
    const created = await testSuiteRepository.create({
      name: 'Auth Suite',
      description: 'Authentication coverage',
      visibility: 'private',
    });
    expect(created.id).toBeTruthy();
    expect(created.ownerId).toBe('mock-user');

    await expect(testSuiteRepository.findById(created.id)).resolves.toMatchObject({
      name: 'Auth Suite',
      description: 'Authentication coverage',
      visibility: 'private',
    });
    await expect(testSuiteRepository.findAll()).resolves.toContainEqual(
      expect.objectContaining({ id: created.id, name: 'Auth Suite' }),
    );
  });

  it('createItem -> findItemsBySuite returns it in orderIndex order', async () => {
    const suite = await testSuiteRepository.create({ name: 'Item Suite', description: null });
    const first = await testSuiteRepository.createItem(itemInput(suite.id, { title: 'B', orderIndex: 1 }));
    const second = await testSuiteRepository.createItem(itemInput(suite.id, { title: 'A', orderIndex: 0 }));

    const items = await testSuiteRepository.findItemsBySuite(suite.id);
    expect(items.map((i) => i.id)).toEqual([second.id, first.id]);
    expect(items[0]).toMatchObject({ title: 'A', priority: 'medium' });
  });

  it('updateItem / removeItem reflect in reads', async () => {
    const suite = await testSuiteRepository.create({ name: 'Edit Suite', description: null });
    const item = await testSuiteRepository.createItem(itemInput(suite.id, { title: 'Before' }));

    const updated = await testSuiteRepository.updateItem(item.id, { title: 'After', expectedResult: 'denied' });
    expect(updated.title).toBe('After');
    await expect(testSuiteRepository.findItemById(item.id)).resolves.toMatchObject({
      title: 'After',
      expectedResult: 'denied',
    });

    await testSuiteRepository.removeItem(item.id);
    await expect(testSuiteRepository.findItemById(item.id)).resolves.toBeNull();
  });

  it('replaceStepsForItem round-trips with renumbered steps', async () => {
    const suite = await testSuiteRepository.create({ name: 'Step Suite', description: null });
    const item = await testSuiteRepository.createItem(itemInput(suite.id, { stepType: 'detailed' }));

    await testSuiteRepository.replaceStepsForItem(item.id, [
      { action: 'step one', expectedResult: 'ok' },
      { action: 'step two', expectedResult: 'ok' },
    ]);

    let steps = await testSuiteRepository.findStepsByItem(item.id);
    expect(steps).toHaveLength(2);
    expect(steps.map((s) => [s.stepNumber, s.action])).toEqual([
      [1, 'step one'],
      [2, 'step two'],
    ]);

    await testSuiteRepository.replaceStepsForItem(item.id, [{ action: 'replacement', expectedResult: 'ok' }]);
    steps = await testSuiteRepository.findStepsByItem(item.id);
    expect(steps).toHaveLength(1);
    expect(steps[0]).toMatchObject({ stepNumber: 1, action: 'replacement' });
  });

  it('replaceStepsForItem with empty steps clears them', async () => {
    const suite = await testSuiteRepository.create({ name: 'Clear Suite', description: null });
    const item = await testSuiteRepository.createItem(itemInput(suite.id, { stepType: 'detailed' }));
    await testSuiteRepository.replaceStepsForItem(item.id, [{ action: 'only step', expectedResult: null }]);

    const cleared = await testSuiteRepository.replaceStepsForItem(item.id, []);
    expect(cleared).toEqual([]);
    await expect(testSuiteRepository.findStepsByItem(item.id)).resolves.toEqual([]);
  });
});
