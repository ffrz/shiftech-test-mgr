import { projectService } from './projectService';
import { moduleService } from './moduleService';
import { tagService } from './tagService';
import { testRoleService } from './testRoleService';
import { testCaseRepository } from '../repositories/testCaseRepository';
import { testCaseStepRepository } from '../repositories/testCaseStepRepository';
import { testCaseService } from './testCaseService';
import { testPlanService } from './testPlanService';
import { issueService } from './issueService';
import type { IssueWithDetails, Project, TestCaseWithDetails, TestPlan } from '../types/domain';

export interface ProjectDuplicateSelection {
  testPlanIds: string[];
  testCaseIds: string[];
  issueIds: string[];
}

export const projectDuplicateService = {
  // Clones a subset of a project's structure into a brand-new project. Test Runs/Test
  // Results are execution history, not structure — they are never copied. All batchable
  // operations (modules, roles, tags, test cases, steps, plan cases, issues) use batch
  // repository calls instead of per-row loops.
  async duplicateProject(
    newName: string,
    selection: ProjectDuplicateSelection,
    sourceData: {
      testPlans: TestPlan[];
      testCases: TestCaseWithDetails[];
      issues: IssueWithDetails[];
    },
  ): Promise<Project> {
    const newProject = await projectService.create({ name: newName });

    // A Test Plan can't end up with an empty scope just because its cases weren't checked
    // explicitly — union the two so any selected plan always brings its own test cases along.
    const testCasesById = new Map(sourceData.testCases.map((tc) => [tc.id, tc]));
    const selectedTestCaseIds = new Set(selection.testCaseIds);
    for (const testPlanId of selection.testPlanIds) {
      const plan = sourceData.testPlans.find((tp) => tp.id === testPlanId);
      if (!plan) continue;
      const planCases = await testPlanService.listCases(testPlanId);
      for (const pc of planCases) selectedTestCaseIds.add(pc.testCaseId);
    }

    // === Module & Tag & TestRole: resolve names, then batch-create ===
    const moduleIdMap = new Map<string, string>();
    const moduleNamesNeeded = new Set<string>();
    const testRoleNamesNeeded = new Set<string>();

    const selectedTestCases = [...selectedTestCaseIds]
      .map((id) => testCasesById.get(id))
      .filter((tc): tc is TestCaseWithDetails => !!tc);
    const selectedIssues = selection.issueIds
      .map((id) => sourceData.issues.find((i) => i.id === id))
      .filter((i): i is IssueWithDetails => !!i);

    for (const tc of selectedTestCases) {
      if (tc.module) moduleNamesNeeded.add(tc.module.name);
      if (tc.targetRole) testRoleNamesNeeded.add(tc.targetRole.name);
    }
    for (const issue of selectedIssues) {
      if (issue.module) moduleNamesNeeded.add(issue.module.name);
    }

    if (moduleNamesNeeded.size > 0) {
      const createdModules = await moduleService.createMany(
        [...moduleNamesNeeded].map((name) => ({ projectId: newProject.id, name })),
      );
      for (const m of createdModules) moduleIdMap.set(m.name, m.id);
    }
    const testRoleIdMap = new Map<string, string>();
    if (testRoleNamesNeeded.size > 0) {
      const createdRoles = await testRoleService.createMany(
        [...testRoleNamesNeeded].map((name) => ({ projectId: newProject.id, name })),
      );
      for (const r of createdRoles) testRoleIdMap.set(r.name, r.id);
    }

    // === Test Cases: batch insert ===
    const testCaseIdMap = new Map<string, string>();

    // Pre-fetch detailed steps for all detailed test cases in parallel
    const stepPromises = selectedTestCases
      .filter((tc) => tc.stepType === 'detailed')
      .map(async (tc) => ({ tcId: tc.id, steps: await testCaseService.listSteps(tc.id) }));
    const stepResults = await Promise.all(stepPromises);
    const stepsByTcId = new Map(stepResults.map((r) => [r.tcId, r.steps]));

    const createdTestCases = await testCaseRepository.createMany(
      selectedTestCases.map((tc) => ({
        projectId: newProject.id,
        moduleId: tc.module ? moduleIdMap.get(tc.module.name) ?? null : null,
        title: tc.title,
        objective: tc.objective ?? null,
        preconditions: tc.preconditions ?? null,
        steps: tc.steps,
        expectedResult: tc.expectedResult,
        priority: tc.priority,
        status: 'active' as const,
        notes: tc.notes ?? null,
        stepType: tc.stepType,
        targetRoleId: tc.targetRole ? testRoleIdMap.get(tc.targetRole.name) ?? null : null,
        externalLinks: tc.externalLinks,
      })),
    );

    for (let i = 0; i < createdTestCases.length; i++) {
      testCaseIdMap.set(selectedTestCases[i].id, createdTestCases[i].id);
    }

    // Batch insert detailed steps
    const stepRows = createdTestCases.flatMap((tc, i) => {
      const sourceTc = selectedTestCases[i];
      if (sourceTc.stepType !== 'detailed') return [];
      const steps = stepsByTcId.get(sourceTc.id) ?? [];
      return steps.map((s, si) => ({
        testCaseId: tc.id,
        action: s.action,
        expectedResult: s.expectedResult ?? null,
        stepNumber: si + 1,
      }));
    });
    if (stepRows.length > 0) {
      await testCaseStepRepository.createMany(stepRows);
    }

    // Batch assign tags to test cases
    await tagService.saveTagsForTestCaseMany(
      newProject.id,
      createdTestCases.map((tc, i) => ({
        testCaseId: tc.id,
        tagNames: selectedTestCases[i].tags.map((t) => t.name),
      })),
    );

    // === Test Plans + Test Plan Cases: batch insert ===
    const selectedPlans = selection.testPlanIds
      .map((id) => sourceData.testPlans.find((tp) => tp.id === id))
      .filter((tp): tp is TestPlan => !!tp);

    const createdPlans = await Promise.all(
      selectedPlans.map((plan) =>
        testPlanService.create({ projectId: newProject.id, name: plan.name, description: plan.description ?? undefined }),
      ),
    );

    const planCasesPromises = selectedPlans.map(async (plan, i) => {
      const cases = await testPlanService.listCases(plan.id);
      return { planIndex: i, cases };
    });
    const planCasesResults = await Promise.all(planCasesPromises);

    const attachInputs = planCasesResults.flatMap(({ planIndex, cases }) =>
      cases
        .map((pc, order) => ({
          testPlanId: createdPlans[planIndex].id,
          testCaseId: testCaseIdMap.get(pc.testCaseId),
          order,
        }))
        .filter((input): input is { testPlanId: string; testCaseId: string; order: number } => !!input.testCaseId),
    );

    if (attachInputs.length > 0) {
      await testPlanService.addCasesMany(attachInputs);
    }

    // === Issues: batch insert ===
    await issueService.createMany(
      selectedIssues.map((issue) => ({
        projectId: newProject.id,
        moduleId: issue.module ? moduleIdMap.get(issue.module.name) ?? null : null,
        type: issue.type,
        title: issue.title,
        description: issue.description ?? undefined,
        actualResult: issue.actualResult ?? undefined,
        expectedResult: issue.expectedResult ?? undefined,
        priority: issue.priority,
        externalLinks: issue.externalLinks,
        tagNames: issue.tags.map((t) => t.name),
      })),
    );

    return newProject;
  },
};
