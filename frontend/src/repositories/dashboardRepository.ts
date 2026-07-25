import { supabase } from '../config/supabaseClient';
import { mapProjectRow, mapTestPlanRow } from '../helpers/mappers';
import type { Project, TestPlan } from '../types/domain';

export interface DashboardCounts {
  projectCount: number;
  testPlanCount: number;
  testCaseCount: number;
}

export interface ContinueWorkingItem {
  project: Project;
  testPlan: TestPlan | null;
  testRunName: string;
  updatedAt: string;
}

export const dashboardRepository = {
  async getCounts(): Promise<DashboardCounts> {
    const [projects, testPlans, testCases] = await Promise.all([
      supabase.from('projects').select('*', { count: 'exact', head: true }),
      supabase.from('test_plans').select('*', { count: 'exact', head: true }),
      supabase.from('test_cases').select('*', { count: 'exact', head: true }),
    ]);

    if (projects.error) throw projects.error;
    if (testPlans.error) throw testPlans.error;
    if (testCases.error) throw testCases.error;

    return {
      projectCount: projects.count ?? 0,
      testPlanCount: testPlans.count ?? 0,
      testCaseCount: testCases.count ?? 0,
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
};
