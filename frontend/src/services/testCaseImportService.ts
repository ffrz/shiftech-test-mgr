import { testCaseService } from './testCaseService';
import { moduleService } from './moduleService';
import { testRoleService } from './testRoleService';
import type { ParsedTestCaseRow } from '../helpers/csvImport';

export const testCaseImportService = {
  // Commits already-validated rows into a project's test_cases — module/role names are
  // resolved find-or-create per project (cached per call so a batch sharing a value only
  // creates it once), same approach as testSuiteService.cloneItemsToProject.
  async importRows(projectId: string, rows: ParsedTestCaseRow[]): Promise<void> {
    if (rows.length === 0) return;

    const existingModules = await moduleService.listByProject(projectId);
    const moduleIdByName = new Map(existingModules.map((m) => [m.name.toLowerCase(), m.id]));

    async function resolveModuleId(moduleName: string | null): Promise<string | null> {
      if (!moduleName) return null;
      const key = moduleName.toLowerCase();
      const existing = moduleIdByName.get(key);
      if (existing) return existing;
      const created = await moduleService.create({ projectId, name: moduleName });
      moduleIdByName.set(key, created.id);
      return created.id;
    }

    const existingTestRoles = await testRoleService.listByProject(projectId);
    const testRoleIdByName = new Map(existingTestRoles.map((r) => [r.name.toLowerCase(), r.id]));

    async function resolveTestRoleId(roleName: string | null): Promise<string | null> {
      if (!roleName) return null;
      const key = roleName.toLowerCase();
      const existing = testRoleIdByName.get(key);
      if (existing) return existing;
      const created = await testRoleService.create({ projectId, name: roleName });
      testRoleIdByName.set(key, created.id);
      return created.id;
    }

    for (const row of rows) {
      const moduleId = await resolveModuleId(row.moduleName);
      const targetRoleId = await resolveTestRoleId(row.targetRole);
      await testCaseService.create({
        projectId,
        moduleId,
        title: row.title,
        objective: row.objective ?? undefined,
        preconditions: row.preconditions ?? undefined,
        steps: row.steps,
        expectedResult: row.expectedResult,
        priority: row.priority,
        targetRoleId,
        tagNames: row.tagNames,
        stepType: 'simple',
      });
    }
  },
};
