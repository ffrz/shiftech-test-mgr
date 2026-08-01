import { testCaseRepository } from '../repositories/testCaseRepository';
import { testCaseStepRepository } from '../repositories/testCaseStepRepository';
import { moduleService } from './moduleService';
import { testRoleService } from './testRoleService';
import { tagService } from './tagService';
import type { ParsedTestCaseRow } from '../helpers/csvImport';

export const testCaseImportService = {
  async importRows(projectId: string, rows: ParsedTestCaseRow[]): Promise<void> {
    if (rows.length === 0) return;

    // 1. Resolve all module/role IDs upfront (batch-create missing ones)
    const existingModules = await moduleService.listByProject(projectId);
    const moduleIdByName = new Map(existingModules.map((m) => [m.name.toLowerCase(), m.id]));
    const newModuleNames = [
      ...new Set(
        rows
          .map((r) => r.moduleName?.trim())
          .filter((n): n is string => !!n && !moduleIdByName.has(n.toLowerCase())),
      ),
    ];
    if (newModuleNames.length > 0) {
      const created = await moduleService.createMany(newModuleNames.map((n) => ({ projectId, name: n })));
      for (const m of created) moduleIdByName.set(m.name.toLowerCase(), m.id);
    }

    const existingRoles = await testRoleService.listByProject(projectId);
    const roleIdByName = new Map(existingRoles.map((r) => [r.name.toLowerCase(), r.id]));
    const newRoleNames = [
      ...new Set(
        rows
          .map((r) => r.targetRole?.trim())
          .filter((n): n is string => !!n && !roleIdByName.has(n.toLowerCase())),
      ),
    ];
    if (newRoleNames.length > 0) {
      const created = await testRoleService.createMany(newRoleNames.map((n) => ({ projectId, name: n })));
      for (const r of created) roleIdByName.set(r.name.toLowerCase(), r.id);
    }

    // 2. Batch insert all test cases
    const testCases = await testCaseRepository.createMany(
      rows.map((row) => ({
        projectId,
        moduleId: row.moduleName ? moduleIdByName.get(row.moduleName.toLowerCase()) ?? null : null,
        title: row.title,
        objective: row.objective ?? null,
        preconditions: row.preconditions ?? null,
        steps: row.steps,
        expectedResult: row.expectedResult,
        priority: row.priority,
        status: 'active' as const,
        notes: row.notes ?? null,
        stepType: row.stepType,
        targetRoleId: row.targetRole ? roleIdByName.get(row.targetRole.toLowerCase()) ?? null : null,
        externalLinks: [],
      })),
    );

    // 3. Batch process tags (same index as rows — createMany preserves order)
    await tagService.saveTagsForTestCaseMany(
      projectId,
      testCases.map((tc, i) => ({
        testCaseId: tc.id,
        tagNames: rows[i]?.tagNames ?? [],
      })),
    );

    // 4. Detailed-step rows: create test_case_steps for each (sequential per test case, since
    // testCaseStepRepository has no batch-across-multiple-test-cases variant — row counts here
    // are small, this isn't the batch-optimization path createMany above is).
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const testCase = testCases[i];
      if (row.stepType === 'detailed' && row.detailedSteps.length > 0 && testCase) {
        await testCaseStepRepository.createMany(
          row.detailedSteps.map((step, index) => ({
            testCaseId: testCase.id,
            action: step.action,
            expectedResult: step.expectedResult,
            stepNumber: index + 1,
          })),
        );
      }
    }
  },
};
