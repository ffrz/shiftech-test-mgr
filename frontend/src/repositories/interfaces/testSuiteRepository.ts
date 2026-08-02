import type { TestSuite, TestSuiteItem, TestSuiteItemStep, TestSuiteVisibility } from '../../types/domain';

export interface TestSuiteRepository {
  findAllPaginated(params: {
    search?: string;
    ownership?: 'mine' | 'all';
    visibilityFilter?: string[];
    userId?: string;
    page: number;
    pageSize: number;
    sortField?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ data: any[]; total: number }>;

  findAll(): Promise<TestSuite[]>;

  findByOwner(ownerId: string, visibilityFilter?: string[]): Promise<TestSuite[]>;

  findById(id: string): Promise<TestSuite | null>;

  create(input: { name: string; description: string | null; visibility?: TestSuiteVisibility }): Promise<TestSuite>;

  update(id: string, changes: { name?: string; description?: string | null; visibility?: TestSuiteVisibility }): Promise<TestSuite>;

  remove(id: string): Promise<void>;

  findItemsBySuite(suiteId: string): Promise<TestSuiteItem[]>;

  findItemsByIds(itemIds: string[]): Promise<TestSuiteItem[]>;

  findItemById(itemId: string): Promise<TestSuiteItem | null>;

  createItem(input: Omit<TestSuiteItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<TestSuiteItem>;

  updateItem(id: string, changes: Partial<Omit<TestSuiteItem, 'id' | 'suiteId' | 'createdAt' | 'updatedAt'>>): Promise<TestSuiteItem>;

  removeItem(id: string): Promise<void>;

  removeItemsMany(ids: string[]): Promise<void>;

  createItemsMany(inputs: Omit<TestSuiteItem, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<TestSuiteItem[]>;

  findStepsByItems(suiteItemIds: string[]): Promise<TestSuiteItemStep[]>;

  createStepsMany(steps: { suiteItemId: string; action: string; expectedResult: string | null; stepNumber: number }[]): Promise<TestSuiteItemStep[]>;

  findStepsByItem(suiteItemId: string): Promise<TestSuiteItemStep[]>;

  replaceStepsForItem(suiteItemId: string, steps: { action: string; expectedResult: string | null }[]): Promise<TestSuiteItemStep[]>;
}
