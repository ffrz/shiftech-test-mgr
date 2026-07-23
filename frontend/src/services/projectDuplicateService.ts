import { projectService } from './projectService';
import { moduleService } from './moduleService';
import { tagService } from './tagService';
import { testRoleService } from './testRoleService';
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
  // Results are execution history, not structure — they are never copied. Sequential
  // (not Promise.all) at every stage so id-remapping stays correct and module/tag
  // creation can't race.
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

    // === Module & Tag & TestRole: clone by name into the new (empty) project ===
    const moduleIdMap = new Map<string, string>();
    const moduleNamesNeeded = new Set<string>();
    const tagNamesNeeded = new Set<string>();
    const testRoleNamesNeeded = new Set<string>();

    for (const tcId of selectedTestCaseIds) {
      const tc = testCasesById.get(tcId);
      if (!tc) continue;
      if (tc.module) moduleNamesNeeded.add(tc.module.name);
      if (tc.targetRole) testRoleNamesNeeded.add(tc.targetRole.name);
      for (const tag of tc.tags) tagNamesNeeded.add(tag.name);
    }
    for (const issueId of selection.issueIds) {
      const issue = sourceData.issues.find((i) => i.id === issueId);
      if (!issue) continue;
      if (issue.module) moduleNamesNeeded.add(issue.module.name);
      for (const tag of issue.tags) tagNamesNeeded.add(tag.name);
    }

    for (const name of moduleNamesNeeded) {
      const created = await moduleService.create({ projectId: newProject.id, name });
      moduleIdMap.set(name, created.id);
    }
    const testRoleIdMap = new Map<string, string>();
    for (const name of testRoleNamesNeeded) {
      const created = await testRoleService.create({ projectId: newProject.id, name });
      testRoleIdMap.set(name, created.id);
    }
    // tagService.create is find-or-create by name — safe to call per tag even though the
    // project is new, and it's what every other tag-creation path in the app already uses.
    for (const name of tagNamesNeeded) {
      await tagService.create(newProject.id, name);
    }

    // === Test Cases ===
    const testCaseIdMap = new Map<string, string>();
    for (const tcId of selectedTestCaseIds) {
      const tc = testCasesById.get(tcId);
      if (!tc) continue;
      const detailedSteps = tc.stepType === 'detailed' ? await testCaseService.listSteps(tc.id) : [];
      const created = await testCaseService.create({
        projectId: newProject.id,
        moduleId: tc.module ? moduleIdMap.get(tc.module.name) ?? null : null,
        title: tc.title,
        objective: tc.objective ?? undefined,
        preconditions: tc.preconditions ?? undefined,
        steps: tc.steps,
        expectedResult: tc.expectedResult,
        priority: tc.priority,
        notes: tc.notes ?? undefined,
        targetRoleId: tc.targetRole ? testRoleIdMap.get(tc.targetRole.name) ?? null : null,
        tagNames: tc.tags.map((t) => t.name),
        stepType: tc.stepType,
        detailedSteps: tc.stepType === 'detailed'
          ? detailedSteps.map((s) => ({ action: s.action, expectedResult: s.expectedResult ?? undefined }))
          : undefined,
      });
      testCaseIdMap.set(tc.id, created.id);
    }

    // === Test Plans + Test Plan Cases (re-attach by the NEW test case ids) ===
    for (const testPlanId of selection.testPlanIds) {
      const plan = sourceData.testPlans.find((tp) => tp.id === testPlanId);
      if (!plan) continue;
      const newPlan = await testPlanService.create({ projectId: newProject.id, name: plan.name, description: plan.description ?? undefined });
      const planCases = await testPlanService.listCases(testPlanId);
      for (let i = 0; i < planCases.length; i++) {
        const newTestCaseId = testCaseIdMap.get(planCases[i].testCaseId);
        if (!newTestCaseId) continue; // source test case wasn't selected/cloneable
        await testPlanService.addCase(newPlan.id, newTestCaseId, i);
      }
    }

    // === Issues — fresh (open, unassigned), no linked test results/run history copied ===
    for (const issueId of selection.issueIds) {
      const issue = sourceData.issues.find((i) => i.id === issueId);
      if (!issue) continue;
      await issueService.create({
        projectId: newProject.id,
        moduleId: issue.module ? moduleIdMap.get(issue.module.name) ?? null : null,
        type: issue.type,
        title: issue.title,
        description: issue.description ?? undefined,
        actualResult: issue.actualResult ?? undefined,
        expectedResult: issue.expectedResult ?? undefined,
        priority: issue.priority,
        githubLinks: issue.githubLinks,
        tagNames: issue.tags.map((t) => t.name),
      });
    }

    return newProject;
  },
};
