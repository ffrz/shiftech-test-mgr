import { describe, expect, it } from "vitest";
import type { TestCasePriority, TestCaseStatus } from "../../../types/domain";
import { createMockTestCaseRepository } from "./testCaseRepository";

type TestCaseCreateInput = Parameters<ReturnType<typeof createMockTestCaseRepository>["create"]>[0];

const tcInput = (
  overrides: Partial<TestCaseCreateInput> & Pick<TestCaseCreateInput, "projectId" | "title" | "steps" | "expectedResult">,
): TestCaseCreateInput => ({
  projectId: overrides.projectId,
  moduleId: overrides.moduleId ?? null,
  code: overrides.code ?? undefined,
  title: overrides.title,
  objective: overrides.objective ?? null,
  preconditions: overrides.preconditions ?? null,
  steps: overrides.steps,
  expectedResult: overrides.expectedResult,
  priority: (overrides.priority ?? "medium") as TestCasePriority,
  status: (overrides.status ?? "active") as TestCaseStatus,
  notes: overrides.notes ?? null,
  stepType: overrides.stepType ?? "simple",
  targetRoleId: overrides.targetRoleId ?? null,
  externalLinks: overrides.externalLinks ?? [],
  createdBy: overrides.createdBy ?? null,
});

describe("createMockTestCaseRepository", () => {
  it("starts empty when no seed is given", async () => {
    const repo = createMockTestCaseRepository();
    await expect(repo.findAllByProject("p1")).resolves.toEqual([]);
  });

  it("create() is immediately visible to findById()/findAllByProject()", async () => {
    const repo = createMockTestCaseRepository();
    const tc = await repo.create(
      tcInput({ projectId: "p1", title: "Test Login", steps: "1. Open app", expectedResult: "Logged in", priority: "high" }),
    );
    await expect(repo.findById(tc.id)).resolves.toMatchObject({ title: "Test Login" });
    await expect(repo.findAllByProject("p1")).resolves.toHaveLength(1);
  });

  it("findAllByProject() filters by project", async () => {
    const repo = createMockTestCaseRepository();
    await repo.create(tcInput({ projectId: "p1", title: "A", steps: "1", expectedResult: "ok" }));
    await repo.create(tcInput({ projectId: "p2", title: "B", steps: "1", expectedResult: "ok" }));
    const results = await repo.findAllByProject("p1");
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe("A");
  });

  it("searchByProject() filters by code/title", async () => {
    const repo = createMockTestCaseRepository();
    await repo.create(tcInput({ projectId: "p1", code: "TC-001", title: "Login", steps: "1", expectedResult: "ok" }));
    await repo.create(tcInput({ projectId: "p1", code: "TC-002", title: "Logout", steps: "1", expectedResult: "ok" }));
    const results = await repo.searchByProject("p1", "login");
    expect(results).toHaveLength(1);
    expect(results[0].code).toBe("TC-001");
  });

  it("findAllByProjectWithDetails() returns joined shape", async () => {
    const repo = createMockTestCaseRepository();
    await repo.create(tcInput({ projectId: "p1", title: "Login", steps: "1", expectedResult: "ok" }));
    const results = await repo.findAllByProjectWithDetails("p1");
    expect(results).toHaveLength(1);
    expect(results[0].module).toBeNull();
    expect(results[0].tags).toEqual([]);
    expect(results[0].targetRole).toBeNull();
  });

  it("attachToPlan() and findCasesForPlan() round-trip", async () => {
    const repo = createMockTestCaseRepository();
    const tc = await repo.create(tcInput({ projectId: "p1", title: "Login", steps: "1", expectedResult: "ok" }));
    const tpc = await repo.attachToPlan("plan-1", tc.id, 1);
    expect(tpc.testPlanId).toBe("plan-1");
    expect(tpc.testCaseId).toBe(tc.id);
    const planCases = await repo.findCasesForPlan("plan-1");
    expect(planCases).toHaveLength(1);
    expect(planCases[0].testCase.title).toBe("Login");
  });

  it("detachFromPlan() removes from plan", async () => {
    const repo = createMockTestCaseRepository();
    const tc = await repo.create(tcInput({ projectId: "p1", title: "Login", steps: "1", expectedResult: "ok" }));
    const tpc = await repo.attachToPlan("plan-1", tc.id, 1);
    await repo.detachFromPlan(tpc.id);
    const planCases = await repo.findCasesForPlan("plan-1");
    expect(planCases).toHaveLength(0);
  });

  it("swapCaseOrder() swaps two plan case orders", async () => {
    const repo = createMockTestCaseRepository();
    const tc1 = await repo.create(tcInput({ projectId: "p1", title: "A", steps: "1", expectedResult: "ok" }));
    const tc2 = await repo.create(tcInput({ projectId: "p1", title: "B", steps: "1", expectedResult: "ok" }));
    const a = await repo.attachToPlan("plan-1", tc1.id, 1);
    const b = await repo.attachToPlan("plan-1", tc2.id, 2);
    await repo.swapCaseOrder(a.id, 1, b.id, 2);
    const planCases = await repo.findCasesForPlan("plan-1");
    const updatedA = planCases.find((p) => p.id === a.id)!;
    const updatedB = planCases.find((p) => p.id === b.id)!;
    expect(updatedA.order).toBe(2);
    expect(updatedB.order).toBe(1);
  });

  it("two instances do not share state", async () => {
    const repoA = createMockTestCaseRepository();
    const repoB = createMockTestCaseRepository();
    await repoA.create(tcInput({ projectId: "p1", title: "Only in A", steps: "1", expectedResult: "ok" }));
    await expect(repoB.findAllByProject("p1")).resolves.toEqual([]);
  });

  it("findCasesForPlanPaginated() filters by test role ids", async () => {
    const repo = createMockTestCaseRepository();
    const admin = await repo.create(tcInput({ projectId: "p1", title: "Admin flow", steps: "1", expectedResult: "ok", targetRoleId: "role-admin" }));
    const manager = await repo.create(tcInput({ projectId: "p1", title: "Manager flow", steps: "1", expectedResult: "ok", targetRoleId: "role-manager" }));
    await repo.attachToPlan("plan-1", admin.id, 1);
    await repo.attachToPlan("plan-1", manager.id, 2);

    const all = await repo.findCasesForPlanPaginated("plan-1", { page: 1, rowsPerPage: 10 });
    expect(all.total).toBe(2);

    const filtered = await repo.findCasesForPlanPaginated("plan-1", { testRoleIds: ["role-admin"], page: 1, rowsPerPage: 10 });
    expect(filtered.total).toBe(1);
    expect(filtered.data[0].testCase.title).toBe("Admin flow");
  });
});
