import { testSuiteRepositoryAdapter } from './adapters/testSuiteResolver';

export const testSuiteRepository = {
  async findAllPaginated(params: Parameters<typeof testSuiteRepositoryAdapter.findAllPaginated>[0]) {
    return testSuiteRepositoryAdapter.findAllPaginated(params);
  },
  async findAll() {
    return testSuiteRepositoryAdapter.findAll();
  },
  async findByOwner(ownerId: string, visibilityFilter?: string[]) {
    return testSuiteRepositoryAdapter.findByOwner(ownerId, visibilityFilter);
  },
  async findById(id: string) {
    return testSuiteRepositoryAdapter.findById(id);
  },
  async create(input: Parameters<typeof testSuiteRepositoryAdapter.create>[0]) {
    return testSuiteRepositoryAdapter.create(input);
  },
  async update(id: string, changes: Parameters<typeof testSuiteRepositoryAdapter.update>[1]) {
    return testSuiteRepositoryAdapter.update(id, changes);
  },
  async remove(id: string) {
    return testSuiteRepositoryAdapter.remove(id);
  },
  async findItemsBySuite(suiteId: string) {
    return testSuiteRepositoryAdapter.findItemsBySuite(suiteId);
  },
  async findItemsByIds(itemIds: string[]) {
    return testSuiteRepositoryAdapter.findItemsByIds(itemIds);
  },
  async findItemById(itemId: string) {
    return testSuiteRepositoryAdapter.findItemById(itemId);
  },
  async createItem(input: Parameters<typeof testSuiteRepositoryAdapter.createItem>[0]) {
    return testSuiteRepositoryAdapter.createItem(input);
  },
  async updateItem(id: string, changes: Parameters<typeof testSuiteRepositoryAdapter.updateItem>[1]) {
    return testSuiteRepositoryAdapter.updateItem(id, changes);
  },
  async removeItem(id: string) {
    return testSuiteRepositoryAdapter.removeItem(id);
  },
  async removeItemsMany(ids: string[]) {
    return testSuiteRepositoryAdapter.removeItemsMany(ids);
  },
  async createItemsMany(inputs: Parameters<typeof testSuiteRepositoryAdapter.createItemsMany>[0]) {
    return testSuiteRepositoryAdapter.createItemsMany(inputs);
  },
  async findStepsByItems(suiteItemIds: string[]) {
    return testSuiteRepositoryAdapter.findStepsByItems(suiteItemIds);
  },
  async createStepsMany(steps: Parameters<typeof testSuiteRepositoryAdapter.createStepsMany>[0]) {
    return testSuiteRepositoryAdapter.createStepsMany(steps);
  },
  async findStepsByItem(suiteItemId: string) {
    return testSuiteRepositoryAdapter.findStepsByItem(suiteItemId);
  },
  async replaceStepsForItem(suiteItemId: string, steps: Parameters<typeof testSuiteRepositoryAdapter.replaceStepsForItem>[1]) {
    return testSuiteRepositoryAdapter.replaceStepsForItem(suiteItemId, steps);
  },
};
