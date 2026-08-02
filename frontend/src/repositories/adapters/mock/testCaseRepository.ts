import type { TestCase, TestCaseWithDetails, TestPlanCase, TestPlanCaseWithDetails, Tag } from "../../../types/domain";
import type { TestCaseRepository } from "../../interfaces/testCaseRepository";

let seq = 0;
function nextId(): string {
  seq += 1;
  return "mock-tc-" + seq;
}

let planSeq = 0;
function nextPlanCaseId(): string {
  planSeq += 1;
  return "mock-tpc-" + planSeq;
}

function makeTestCase(overrides: Partial<TestCase> & { projectId: string; title: string; steps: string; expectedResult: string }): TestCase {
  const now = new Date().toISOString();
  return {
    id: nextId(),
    projectId: overrides.projectId,
    moduleId: overrides.moduleId ?? null,
    code: overrides.code ?? "TC-001",
    title: overrides.title,
    objective: overrides.objective ?? null,
    preconditions: overrides.preconditions ?? null,
    steps: overrides.steps,
    expectedResult: overrides.expectedResult,
    priority: overrides.priority ?? "medium",
    status: overrides.status ?? "active",
    notes: overrides.notes ?? null,
    stepType: overrides.stepType ?? "simple",
    targetRoleId: overrides.targetRoleId ?? null,
    externalLinks: overrides.externalLinks ?? [],
    createdBy: overrides.createdBy ?? null,
    createdAt: now,
    updatedAt: now,
  };
}

export function createMockTestCaseRepository(seed?: {
  testCases?: TestCase[];
  testPlanCases?: TestPlanCase[];
  tags?: Tag[];
}): TestCaseRepository {
  const testCases = new Map<string, TestCase>((seed?.testCases ?? []).map((tc) => [tc.id, tc]));
  const testPlanCases = new Map<string, TestPlanCase>((seed?.testPlanCases ?? []).map((tpc) => [tpc.id, tpc]));

  function toWithDetails(tc: TestCase): TestCaseWithDetails {
    return {
      ...tc,
      module: null,
      tags: [],
      targetRole: null,
    };
  }

  function filterInMemory(options: {
    search?: string;
    statuses?: TestCase["status"][];
    priorities?: TestCase["priority"][];
    moduleIds?: string[];
    tagIds?: string[];
    testRoleIds?: string[];
  }, tcs: TestCase[]): TestCase[] {
    let filtered = [...tcs];
    if (options.search?.trim()) {
      const q = options.search.trim().toLowerCase();
      filtered = filtered.filter((tc) => tc.title.toLowerCase().includes(q) || tc.code.toLowerCase().includes(q));
    }
    if (options.statuses?.length) {
      filtered = filtered.filter((tc) => options.statuses!.includes(tc.status));
    }
    if (options.priorities?.length) {
      filtered = filtered.filter((tc) => options.priorities!.includes(tc.priority));
    }
    if (options.moduleIds?.length) {
      filtered = filtered.filter((tc) => tc.moduleId !== null && options.moduleIds!.includes(tc.moduleId));
    }
    if (options.testRoleIds?.length) {
      filtered = filtered.filter((tc) => tc.targetRoleId !== null && options.testRoleIds!.includes(tc.targetRoleId));
    }
    if (options.tagIds?.length) {
      filtered = [];
    }
    return filtered;
  }

  return {
    async searchByProject(projectId: string, query: string, limit = 5) {
      const sanitized = query.trim().replace(/^#/, "").replace(/[,()%*]/g, "");
      if (!sanitized) return [];
      const matched = [...testCases.values()]
        .filter((tc) => tc.projectId === projectId)
        .filter((tc) => tc.code.toLowerCase().includes(sanitized.toLowerCase()) || tc.title.toLowerCase().includes(sanitized.toLowerCase()))
        .slice(0, limit)
        .map((tc) => ({ id: tc.id, code: tc.code, title: tc.title }));
      return matched;
    },

    async findByCode(projectId: string, code: string) {
      for (const tc of testCases.values()) {
        if (tc.projectId === projectId && tc.code === code) return tc;
      }
      return null;
    },

    async findAllByProject(projectId: string) {
      return [...testCases.values()]
        .filter((tc) => tc.projectId === projectId)
        .sort((a, b) => a.code.localeCompare(b.code));
    },

    async findAllByProjectWithDetails(
      projectId: string,
      options?: {
        search?: string;
        statuses?: TestCase["status"][];
        priorities?: TestCase["priority"][];
        moduleIds?: string[];
        tagIds?: string[];
        testRoleIds?: string[];
      },
    ) {
      const projectCases = [...testCases.values()].filter((tc) => tc.projectId === projectId);
      const filtered = options ? filterInMemory(options, projectCases) : projectCases;
      filtered.sort((a, b) => a.code.localeCompare(b.code));
      return filtered.map(toWithDetails);
    },

    async findByIdsWithDetails(ids: string[]) {
      if (ids.length === 0) return [];
      return ids.map((id) => testCases.get(id)).filter(Boolean).map((tc) => toWithDetails(tc!));
    },

    async findById(id: string) {
      return testCases.get(id) ?? null;
    },

    async findByIdWithDetails(id: string) {
      const tc = testCases.get(id);
      if (!tc) return null;
      return {
        ...toWithDetails(tc),
        project: { id: tc.projectId, name: "Mock Project" },
      };
    },

    async create(
      input: Omit<TestCase, "id" | "createdAt" | "updatedAt" | "code" | "createdBy"> & { code?: string | null; createdBy?: string | null },
    ) {
      const tc = makeTestCase({
        ...input,
        code: input.code ?? undefined,
        createdBy: input.createdBy ?? undefined,
      });
      testCases.set(tc.id, tc);
      return tc;
    },

    async update(id: string, changes: Partial<Omit<TestCase, "id" | "projectId" | "createdAt" | "updatedAt">>) {
      const existing = testCases.get(id);
      if (!existing) throw new Error("mock test case not found: " + id);
      const updated: TestCase = { ...existing, ...changes, updatedAt: new Date().toISOString() };
      testCases.set(id, updated);
      return updated;
    },

    async createMany(
      inputs: (Omit<TestCase, "id" | "createdAt" | "updatedAt" | "code" | "createdBy"> & { code?: string | null; createdBy?: string | null })[],
    ) {
      if (inputs.length === 0) return [];
      return inputs.map((input) => {
        const tc = makeTestCase({
          ...input,
          code: input.code ?? undefined,
          createdBy: input.createdBy ?? undefined,
        });
        testCases.set(tc.id, tc);
        return tc;
      });
    },

    async remove(id: string) {
      testCases.delete(id);
    },

    async findCasesForPlan(testPlanId: string) {
      const planCases = [...testPlanCases.values()]
        .filter((tpc) => tpc.testPlanId === testPlanId)
        .sort((a, b) => a.order - b.order);
      return planCases.map((tpc) => {
        const tc = testCases.get(tpc.testCaseId);
        if (!tc) return null;
        return {
          ...tpc,
          testCase: toWithDetails(tc),
        } as TestPlanCaseWithDetails;
      }).filter(Boolean) as TestPlanCaseWithDetails[];
    },

    async findCasesForPlanPaginated(
      testPlanId: string,
      options: { search?: string; priorities?: string[]; moduleIds?: string[]; tagIds?: string[]; testRoleIds?: string[]; page: number; rowsPerPage: number },
    ) {
      const all = [...testPlanCases.values()]
        .filter((tpc) => tpc.testPlanId === testPlanId);

      let matched = all
        .map((tpc) => {
          const tc = testCases.get(tpc.testCaseId);
          if (!tc) return null;
          return { ...tpc, testCase: toWithDetails(tc) } as TestPlanCaseWithDetails;
        })
        .filter(Boolean) as TestPlanCaseWithDetails[];

      if (options.search?.trim()) {
        const q = options.search.trim().toLowerCase();
        matched = matched.filter((m) => m.testCase.title.toLowerCase().includes(q) || m.testCase.code.toLowerCase().includes(q));
      }
      if (options.priorities?.length) {
        matched = matched.filter((m) => options.priorities!.includes(m.testCase.priority));
      }
      if (options.moduleIds?.length) {
        matched = matched.filter((m) => m.testCase.moduleId !== null && options.moduleIds!.includes(m.testCase.moduleId));
      }
      if (options.testRoleIds?.length) {
        matched = matched.filter((m) => m.testCase.targetRoleId !== null && options.testRoleIds!.includes(m.testCase.targetRoleId));
      }
      if (options.tagIds?.length) {
        matched = [];
      }

      matched.sort((a, b) => a.order - b.order);
      const total = matched.length;
      if (options.rowsPerPage > 0) {
        const from = (options.page - 1) * options.rowsPerPage;
        matched = matched.slice(from, from + options.rowsPerPage);
      }
      return { data: matched, total };
    },

    async attachToPlanMany(
      inputs: { testPlanId: string; testCaseId: string; order: number }[],
    ) {
      if (inputs.length === 0) return [];
      const created: TestPlanCase[] = inputs.map((i) => {
        const tpc: TestPlanCase = { id: nextPlanCaseId(), testPlanId: i.testPlanId, testCaseId: i.testCaseId, order: i.order };
        testPlanCases.set(tpc.id, tpc);
        return tpc;
      });
      return created;
    },

    async attachToPlan(testPlanId: string, testCaseId: string, order: number) {
      const tpc: TestPlanCase = { id: nextPlanCaseId(), testPlanId, testCaseId, order };
      testPlanCases.set(tpc.id, tpc);
      return tpc;
    },

    async findAdjacentPlanCase(testPlanId: string, order: number, direction: "before" | "after") {
      const planCases = [...testPlanCases.values()].filter((tpc) => tpc.testPlanId === testPlanId);
      if (direction === "before") {
        const candidates = planCases.filter((tpc) => tpc.order < order);
        if (candidates.length === 0) return null;
        return candidates.reduce((max, r) => (r.order > max.order ? r : max));
      } else {
        const candidates = planCases.filter((tpc) => tpc.order > order);
        if (candidates.length === 0) return null;
        return candidates.reduce((min, r) => (r.order < min.order ? r : min));
      }
    },

    async swapCaseOrder(testPlanCaseIdA: string, orderA: number, testPlanCaseIdB: string, orderB: number) {
      const a = testPlanCases.get(testPlanCaseIdA);
      const b = testPlanCases.get(testPlanCaseIdB);
      if (a) testPlanCases.set(testPlanCaseIdA, { ...a, order: orderB });
      if (b) testPlanCases.set(testPlanCaseIdB, { ...b, order: orderA });
    },

    async detachFromPlan(testPlanCaseId: string) {
      testPlanCases.delete(testPlanCaseId);
    },
  };
}
