import { supabase } from '../config/supabaseClient';
import { mapProjectRow, mapTestPlanRow, mapIssueRow, mapActivityEntryRow } from '../helpers/mappers';
import type { Project, TestPlan, Issue, ActivityEntry } from '../types/domain';

export interface MyWorkIssue extends Issue {
  projectName: string;
  projectOwnerId: string | null;
}

export interface DashboardCounts {
  projectCount: number;
  testPlanCount: number;
  testCaseCount: number;
  issueCount: number;
  openIssueCount: number;
  testSuiteOwnedCount: number;
  runningTestRunCount: number;
}

export interface ContinueWorkingItem {
  project: Project;
  testPlan: TestPlan | null;
  testRunName: string;
  updatedAt: string;
}

export const dashboardRepository = {
  async getCounts(userId: string): Promise<DashboardCounts> {
    const [projects, testPlans, testCases, issues, openIssues, testSuitesOwned, runningTestRuns] = await Promise.all([
      supabase.from('projects').select('*', { count: 'exact', head: true }),
      supabase.from('test_plans').select('*', { count: 'exact', head: true }),
      supabase.from('test_cases').select('*', { count: 'exact', head: true }),
      supabase.from('issues').select('*', { count: 'exact', head: true }),
      supabase.from('issues').select('*', { count: 'exact', head: true }).not('status', 'in', '(closed,rejected,duplicate)'),
      supabase.from('test_suites').select('*', { count: 'exact', head: true }).eq('owner_id', userId),
      supabase.from('test_runs').select('*', { count: 'exact', head: true }).eq('status', 'in_progress'),
    ]);

    if (projects.error) throw projects.error;
    if (testPlans.error) throw testPlans.error;
    if (testCases.error) throw testCases.error;
    if (issues.error) throw issues.error;
    if (openIssues.error) throw openIssues.error;
    if (testSuitesOwned.error) throw testSuitesOwned.error;
    if (runningTestRuns.error) throw runningTestRuns.error;

    return {
      projectCount: projects.count ?? 0,
      testPlanCount: testPlans.count ?? 0,
      testCaseCount: testCases.count ?? 0,
      issueCount: issues.count ?? 0,
      openIssueCount: openIssues.count ?? 0,
      testSuiteOwnedCount: testSuitesOwned.count ?? 0,
      runningTestRunCount: runningTestRuns.count ?? 0,
    };
  },

  async findRecentProjects(limit: number): Promise<Project[]> {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data ?? []).map(mapProjectRow);
  },

  // "Continue Working" = most recently updated test runs, in_progress first, joined
  // back to their project (and test plan, if any — custom runs have none).
  async findContinueWorking(limit: number): Promise<ContinueWorkingItem[]> {
    const { data, error } = await supabase
      .from('test_runs')
      .select('name, updated_at, project:projects(*), test_plan:test_plans(*)')
      .eq('status', 'in_progress')
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data ?? [])
      .filter((row: any) => row.project)
      .map((row: any) => ({
        project: mapProjectRow(row.project),
        testPlan: row.test_plan ? mapTestPlanRow(row.test_plan) : null,
        testRunName: row.name,
        updatedAt: row.updated_at,
      }));
  },

  // Issues assigned to the current user, not yet closed, across every project they have
  // access to — RLS (has_project_access via issues.project_id) does the cross-project
  // scoping for free, same as findRecentProjects/findContinueWorking above.
  async findMyWorkIssues(userId: string, limit: number): Promise<MyWorkIssue[]> {
    const { data, error } = await supabase
      .from('issues')
      .select('*, project:projects(name, owner_id)')
      .eq('assigned_to', userId)
      .not('status', 'in', '(closed,rejected,duplicate)')
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data ?? []).map((row: any) => ({
      ...mapIssueRow(row),
      projectName: row.project?.name ?? '',
      projectOwnerId: row.project?.owner_id ?? null,
    }));
  },

  // Latest comment/system-event activity across every project the user has access to —
  // entity_activity RLS (has_project_access via project_id) scopes this the same way.
  async findRecentActivity(limit: number): Promise<ActivityEntry[]> {
    const { data, error } = await supabase
      .from('entity_activity')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data ?? []).map(mapActivityEntryRow);
  },
};
