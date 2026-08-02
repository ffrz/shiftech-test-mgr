import type { TestRun, TestRunStatus } from '../../../types/domain';
import type { TestRunRepository, TestRunWithPlan } from '../../interfaces/testRunRepository';

let seq = 0;
function nextId(): string {
  seq += 1;
  return `mock-testrun-${seq}`;
}

export interface TestRunSeed extends TestRun {
  testPlanName?: string | null;
  testPlanCode?: string | null;
}

export function createMockTestRunRepository(seed: TestRun[] = []): TestRunRepository {
  const store = new Map<string, TestRun>(seed.map((r) => [r.id, r]));
  const planStore = new Map<string, { name: string | null; code: string | null }>();

  return {
    async findAllByPlan(testPlanId: string): Promise<TestRun[]> {
      return [...store.values()]
        .filter((r) => r.testPlanId === testPlanId)
        .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
    },

    async findAllByPlanPaginated(
      testPlanId: string,
      options: { search?: string; statuses?: TestRunStatus[]; page: number; rowsPerPage: number },
    ): Promise<{ data: TestRun[]; total: number }> {
      let filtered = [...store.values()]
        .filter((r) => r.testPlanId === testPlanId)
        .sort((a, b) => b.startedAt.localeCompare(a.startedAt));

      if (options.search?.trim()) {
        const q = options.search.trim().toLowerCase();
        filtered = filtered.filter((r) => r.name.toLowerCase().includes(q) || r.code.toLowerCase().includes(q));
      }
      if (options.statuses?.length) {
        filtered = filtered.filter((r) => options.statuses!.includes(r.status));
      }

      const total = filtered.length;
      if (options.rowsPerPage > 0) {
        const from = (options.page - 1) * options.rowsPerPage;
        filtered = filtered.slice(from, from + options.rowsPerPage);
      }

      return { data: filtered, total };
    },

    async findAllByProject(
      projectId: string,
      options?: { search?: string; statuses?: TestRunStatus[] },
    ): Promise<TestRunWithPlan[]> {
      let filtered = [...store.values()]
        .filter((r) => r.projectId === projectId)
        .sort((a, b) => b.startedAt.localeCompare(a.startedAt));

      if (options?.search?.trim()) {
        const q = options.search.trim().toLowerCase();
        filtered = filtered.filter((r) => r.name.toLowerCase().includes(q) || r.code.toLowerCase().includes(q));
      }
      if (options?.statuses?.length) {
        filtered = filtered.filter((r) => options.statuses!.includes(r.status));
      }

      return filtered.map((r) => ({
        ...r,
        testPlanName: planStore.get(r.testPlanId ?? '')?.name ?? null,
        testPlanCode: planStore.get(r.testPlanId ?? '')?.code ?? null,
      }));
    },

    async findById(id: string): Promise<TestRun | null> {
      return store.get(id) ?? null;
    },

    async create(input: { projectId: string; testPlanId?: string | null; name: string; code?: string | null; startedBy?: string | null }): Promise<TestRun> {
      const now = new Date().toISOString();
      const testRun: TestRun = {
        id: nextId(),
        projectId: input.projectId,
        testPlanId: input.testPlanId ?? null,
        code: input.code ?? `TR-${String(seq).padStart(4, '0')}`,
        name: input.name,
        status: 'in_progress' as TestRunStatus,
        startedAt: now,
        completedAt: null,
        notes: null,
        startedBy: input.startedBy ?? null,
        createdAt: now,
        updatedAt: now,
      };
      store.set(testRun.id, testRun);
      return testRun;
    },

    async update(id: string, changes: { name?: string; code?: string }): Promise<TestRun> {
      const existing = store.get(id);
      if (!existing) throw new Error(`mock test run not found: ${id}`);
      const updated: TestRun = { ...existing, ...changes, updatedAt: new Date().toISOString() };
      store.set(id, updated);
      return updated;
    },

    async updateStatus(id: string, status: TestRunStatus, notes?: string | null): Promise<TestRun> {
      const existing = store.get(id);
      if (!existing) throw new Error(`mock test run not found: ${id}`);
      const updated: TestRun = {
        ...existing,
        status,
        completedAt: status === 'completed' ? new Date().toISOString() : existing.completedAt,
        notes: notes !== undefined ? notes : existing.notes,
        updatedAt: new Date().toISOString(),
      };
      store.set(id, updated);
      return updated;
    },

    async remove(id: string): Promise<void> {
      store.delete(id);
    },
  };
}
