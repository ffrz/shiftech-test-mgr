import { describe, expect, it } from 'vitest';
import { createMockTestSuiteRepository } from './testSuiteRepository';

describe('createMockTestSuiteRepository', () => {
  it('starts empty when no seed is given', async () => {
    const repo = createMockTestSuiteRepository();
    await expect(repo.findAll()).resolves.toEqual([]);
  });

  it('create() suite is immediately visible to findById()', async () => {
    const repo = createMockTestSuiteRepository();
    const created = await repo.create({ name: 'E2E Suite', description: 'desc', visibility: 'public' });

    const found = await repo.findById(created.id);
    expect(found).toEqual(created);
  });

  it('createItem() is immediately visible to findItemsBySuite()', async () => {
    const repo = createMockTestSuiteRepository();
    await repo.createItem({
      suiteId: 'suite-1',
      moduleName: 'Auth',
      title: 'Login flow',
      objective: null,
      preconditions: null,
      steps: 'Open browser',
      expectedResult: 'Logged in',
      priority: 'high',
      stepType: 'simple',
      targetRole: null,
      tagNames: [],
      notes: null,
      orderIndex: 0,
    });

    const items = await repo.findItemsBySuite('suite-1');
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe('Login flow');
  });

  it('replaceStepsForItem() removes old steps and inserts new ones', async () => {
    const repo = createMockTestSuiteRepository();
    const steps = await repo.replaceStepsForItem('item-1', [
      { action: 'Click login', expectedResult: 'Form appears' },
      { action: 'Enter credentials', expectedResult: null },
    ]);

    expect(steps).toHaveLength(2);
    expect(steps[0].stepNumber).toBe(1);
    expect(steps[1].stepNumber).toBe(2);

    const found = await repo.findStepsByItem('item-1');
    expect(found).toHaveLength(2);

    const replaced = await repo.replaceStepsForItem('item-1', [
      { action: 'New step', expectedResult: 'Done' },
    ]);
    expect(replaced).toHaveLength(1);
    const foundAfter = await repo.findStepsByItem('item-1');
    expect(foundAfter).toHaveLength(1);
  });

  it('findAllPaginated() respects pagination', async () => {
    const repo = createMockTestSuiteRepository();
    for (let i = 1; i <= 5; i++) {
      await repo.create({ name: `Suite ${i}`, description: null });
    }

    const page1 = await repo.findAllPaginated({ page: 1, pageSize: 2 });
    expect(page1.data).toHaveLength(2);
    expect(page1.total).toBe(5);

    const page3 = await repo.findAllPaginated({ page: 3, pageSize: 2 });
    expect(page3.data).toHaveLength(1);
    expect(page3.total).toBe(5);
  });

  it('two instances do not share state', async () => {
    const repoA = createMockTestSuiteRepository();
    const repoB = createMockTestSuiteRepository();

    await repoA.create({ name: 'Only in A', description: null });

    await expect(repoB.findAll()).resolves.toEqual([]);
  });
});
