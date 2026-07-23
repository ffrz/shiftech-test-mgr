// Central query key registry for React Query. Every hook/page that reads or invalidates
// server data goes through these factories, so a mutation in one page (e.g. completing a
// Test Run) invalidates the exact same key a different page (e.g. ProjectDetailPage's Test
// Runs tab) is subscribed to — no more page-local caches going stale after a cross-page edit.
export const queryKeys = {
  project: (id: string) => ['project', id] as const,
  projects: (query?: { search?: string; status?: string | null; sortField?: string; sortDirection?: string }) =>
    query ? (['projects', query.search, query.status, query.sortField, query.sortDirection] as const) : (['projects'] as const),

  modules: (projectId: string) => ['modules', projectId] as const,
  tags: (projectId: string) => ['tags', projectId] as const,

  testPlan: (id: string) => ['testPlan', id] as const,
  testPlans: (projectId: string) => ['testPlans', projectId] as const,
  testPlanCases: (testPlanId: string) => ['testPlanCases', testPlanId] as const,

  testCase: (id: string) => ['testCase', id] as const,
  testCaseSteps: (testCaseId: string) => ['testCaseSteps', testCaseId] as const,
  testCases: (projectId: string) => ['testCases', projectId] as const,
  testCasesWithDetails: (projectId: string) => ['testCases', 'withDetails', projectId] as const,

  testRun: (id: string) => ['testRun', id] as const,
  testRunResults: (id: string) => ['testRunResults', id] as const,
  testRunsByPlan: (testPlanId: string) => ['testRuns', 'byPlan', testPlanId] as const,
  testRunsByProject: (projectId: string) => ['testRuns', 'byProject', projectId] as const,

  issue: (id: string) => ['issue', id] as const,
  issuesByProject: (projectId: string) => ['issues', 'byProject', projectId] as const,
  issuesByTestRun: (testRunId: string) => ['issues', 'byTestRun', testRunId] as const,
  issuesByTestResult: (testResultId: string) => ['issues', 'byTestResult', testResultId] as const,
  attachmentsByIssue: (issueId: string) => ['attachments', 'byIssue', issueId] as const,

  profiles: () => ['profiles'] as const,
  projectMembers: (projectId: string) => ['projectMembers', projectId] as const,
} as const;
