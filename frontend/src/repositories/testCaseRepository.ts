import { supabase } from '../config/supabaseClient';
import { mapModuleRow, mapTagRow, mapTestCaseRow, mapTestPlanCaseRow, mapTestRoleRow } from '../helpers/mappers';
import type { TestCase, TestCaseWithDetails, TestPlanCase, TestPlanCaseWithDetails } from '../types/domain';

export const testCaseRepository = {
  async findAllByProject(projectId: string): Promise<TestCase[]> {
    const { data, error } = await supabase
      .from('test_cases')
      .select('*')
      .eq('project_id', projectId)
      .order('code');

    if (error) throw error;
    return (data ?? []).map(mapTestCaseRow);
  },

  // Includes module + tags in one round trip — used by the list page so the
  // Module column and tag chips don't need N+1 queries.
  async findAllByProjectWithDetails(
    projectId: string,
    options?: {
      search?: string;
      statuses?: TestCase['status'][];
      priorities?: TestCase['priority'][];
      moduleIds?: string[];
      tagIds?: string[];
      testRoleIds?: string[];
    },
  ): Promise<TestCaseWithDetails[]> {
    let query = supabase
      .from('test_cases')
      .select('*, module:modules(*), target_role:test_roles(*), test_case_tags(tag:tags(*))')
      .eq('project_id', projectId);

    if (options?.search?.trim()) {
      const q = options.search.trim();
      query = query.or(`title.ilike.%${q}%,code.ilike.%${q}%`);
    }
    if (options?.statuses?.length) {
      query = query.in('status', options.statuses);
    }
    if (options?.priorities?.length) {
      query = query.in('priority', options.priorities);
    }
    if (options?.moduleIds?.length) {
      query = query.in('module_id', options.moduleIds);
    }
    if (options?.testRoleIds?.length) {
      query = query.in('target_role_id', options.testRoleIds);
    }
    if (options?.tagIds?.length) {
      const { data: linked } = await supabase
        .from('test_case_tags')
        .select('test_case_id')
        .in('tag_id', options.tagIds);
      const caseIds = [...new Set((linked ?? []).map((r: any) => r.test_case_id))];
      if (caseIds.length) {
        query = query.in('id', caseIds);
      } else {
        return [];
      }
    }

    const { data, error } = await query.order('code');

    if (error) throw error;
    return (data ?? []).map((row: any) => ({
      ...mapTestCaseRow(row),
      module: row.module ? mapModuleRow(row.module) : null,
      targetRole: row.target_role ? mapTestRoleRow(row.target_role) : null,
      tags: (row.test_case_tags ?? []).map((t: any) => mapTagRow(t.tag)),
    }));
  },

  async findById(id: string): Promise<TestCase | null> {
    const { data, error } = await supabase.from('test_cases').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? mapTestCaseRow(data) : null;
  },

  async findByIdWithDetails(id: string): Promise<(TestCaseWithDetails & { project: { id: string; name: string } }) | null> {
    const { data, error } = await supabase
      .from('test_cases')
      .select('*, module:modules(*), target_role:test_roles(*), test_case_tags(tag:tags(*)), project:projects(id, name)')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return {
      ...mapTestCaseRow(data),
      module: data.module ? mapModuleRow(data.module) : null,
      targetRole: data.target_role ? mapTestRoleRow(data.target_role) : null,
      tags: (data.test_case_tags ?? []).map((t: any) => mapTagRow(t.tag)),
      project: data.project,
    };
  },

  // `code` optional — omit/empty lets the `set_test_case_code` DB trigger auto-generate TC-####.
  async create(input: Omit<TestCase, 'id' | 'createdAt' | 'updatedAt' | 'code'> & { code?: string | null }): Promise<TestCase> {
    const { data, error } = await supabase
      .from('test_cases')
      .insert({
        project_id: input.projectId,
        module_id: input.moduleId,
        code: input.code || undefined,
        title: input.title,
        objective: input.objective,
        preconditions: input.preconditions,
        steps: input.steps,
        expected_result: input.expectedResult,
        priority: input.priority,
        status: input.status,
        notes: input.notes,
        step_type: input.stepType,
        target_role_id: input.targetRoleId,
      })
      .select('*')
      .single();

    if (error) throw error;
    return mapTestCaseRow(data);
  },

  async update(id: string, changes: Partial<Omit<TestCase, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>>): Promise<TestCase> {
    const payload: Record<string, unknown> = {};
    if (changes.moduleId !== undefined) payload.module_id = changes.moduleId;
    if (changes.code !== undefined) payload.code = changes.code;
    if (changes.title !== undefined) payload.title = changes.title;
    if (changes.objective !== undefined) payload.objective = changes.objective;
    if (changes.preconditions !== undefined) payload.preconditions = changes.preconditions;
    if (changes.steps !== undefined) payload.steps = changes.steps;
    if (changes.expectedResult !== undefined) payload.expected_result = changes.expectedResult;
    if (changes.priority !== undefined) payload.priority = changes.priority;
    if (changes.status !== undefined) payload.status = changes.status;
    if (changes.notes !== undefined) payload.notes = changes.notes;
    if (changes.stepType !== undefined) payload.step_type = changes.stepType;
    if (changes.targetRoleId !== undefined) payload.target_role_id = changes.targetRoleId;

    const { data, error } = await supabase
      .from('test_cases')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    return mapTestCaseRow(data);
  },

  async createMany(
    inputs: (Omit<TestCase, 'id' | 'createdAt' | 'updatedAt' | 'code'> & { code?: string | null })[],
  ): Promise<TestCase[]> {
    if (inputs.length === 0) return [];
    const { data, error } = await supabase
      .from('test_cases')
      .insert(
        inputs.map((i) => ({
          project_id: i.projectId,
          module_id: i.moduleId,
          code: i.code || undefined,
          title: i.title,
          objective: i.objective,
          preconditions: i.preconditions,
          steps: i.steps,
          expected_result: i.expectedResult,
          priority: i.priority,
          status: i.status,
          notes: i.notes,
          step_type: i.stepType,
          target_role_id: i.targetRoleId,
        })),
      )
      .select('*');
    if (error) throw error;
    return (data ?? []).map(mapTestCaseRow);
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('test_cases').delete().eq('id', id);
    if (error) throw error;
  },

  // --- Junction: which test cases are in scope for a test plan (no result columns) ---

  async findCasesForPlan(testPlanId: string): Promise<TestPlanCaseWithDetails[]> {
    const { data, error } = await supabase
      .from('test_plan_cases')
      .select('*, test_case:test_cases(*, module:modules(*), target_role:test_roles(*), test_case_tags(tag:tags(*)))')
      .eq('test_plan_id', testPlanId)
      .order('order', { ascending: true });

    if (error) throw error;
    return (data ?? []).map((row: any) => ({
      ...mapTestPlanCaseRow(row),
      testCase: {
        ...mapTestCaseRow(row.test_case),
        module: row.test_case.module ? mapModuleRow(row.test_case.module) : null,
        targetRole: row.test_case.target_role ? mapTestRoleRow(row.test_case.target_role) : null,
        tags: (row.test_case.test_case_tags ?? []).map((t: any) => mapTagRow(t.tag)),
      },
    }));
  },

  async findCasesForPlanPaginated(
    testPlanId: string,
    options: { search?: string; priorities?: string[]; moduleIds?: string[]; tagIds?: string[]; page: number; rowsPerPage: number },
  ): Promise<{ data: TestPlanCaseWithDetails[]; total: number }> {
    let caseIdsFilter: string[] | undefined;
    if (options.tagIds?.length) {
      const { data: linked } = await supabase
        .from('test_case_tags')
        .select('test_case_id')
        .in('tag_id', options.tagIds);
      caseIdsFilter = [...new Set((linked ?? []).map((r: any) => r.test_case_id))];
      if (caseIdsFilter.length === 0) return { data: [], total: 0 };
    }

    let query = supabase
      .from('test_plan_cases')
      .select('*, test_case:test_cases!inner(*, module:modules(*), target_role:test_roles(*), test_case_tags(tag:tags(*)))', { count: 'exact' })
      .eq('test_plan_id', testPlanId);

    if (options.search?.trim()) {
      const q = options.search.trim();
      query = query.or(`test_case.title.ilike.%${q}%,test_case.code.ilike.%${q}%`);
    }
    if (options.priorities?.length) {
      query = query.in('test_case.priority', options.priorities);
    }
    if (options.moduleIds?.length) {
      query = query.in('test_case.module_id', options.moduleIds);
    }
    if (caseIdsFilter) {
      query = query.in('test_case_id', caseIdsFilter);
    }

    if (options.rowsPerPage > 0) {
      const from = (options.page - 1) * options.rowsPerPage;
      query = query.range(from, from + options.rowsPerPage - 1);
    }

    const { data, error, count } = await query.order('order', { ascending: true });

    if (error) throw error;
    return {
      data: (data ?? []).map((row: any) => ({
        ...mapTestPlanCaseRow(row),
        testCase: {
          ...mapTestCaseRow(row.test_case),
          module: row.test_case.module ? mapModuleRow(row.test_case.module) : null,
          targetRole: row.test_case.target_role ? mapTestRoleRow(row.test_case.target_role) : null,
          tags: (row.test_case.test_case_tags ?? []).map((t: any) => mapTagRow(t.tag)),
        },
      })),
      total: count ?? 0,
    };
  },

  async attachToPlan(testPlanId: string, testCaseId: string, order: number): Promise<TestPlanCase> {
    const { data, error } = await supabase
      .from('test_plan_cases')
      .insert({ test_plan_id: testPlanId, test_case_id: testCaseId, order })
      .select('*')
      .single();

    if (error) throw error;
    return mapTestPlanCaseRow(data);
  },

  // Finds the row immediately before/after a given `order` within a plan -- used so Up/Down
  // at a page boundary can swap across into the neighboring page without loading it.
  // Always resolved against the plan's full order sequence (ignores list filters), since the
  // sequence itself is a plan-wide concept, not a property of the current filtered view.
  async findAdjacentPlanCase(testPlanId: string, order: number, direction: 'before' | 'after'): Promise<TestPlanCase | null> {
    // `order` is both the sequence column name and PostgREST's reserved sort query key --
    // .order('order', ...) and .gt('order', ...)/.lt('order', ...) both serialize to an
    // `order=` query param, and having both present breaks PostgREST's sort parser. Filter via
    // .or() (raw filter string, doesn't touch the `order=` key) instead and pick the nearest
    // match client-side, since we can't ask PostgREST to sort+limit for us here.
    const { data, error } = await supabase
      .from('test_plan_cases')
      .select('*')
      .eq('test_plan_id', testPlanId)
      .or(direction === 'after' ? `order.gt.${order}` : `order.lt.${order}`);

    if (error) throw error;
    if (!data || data.length === 0) return null;
    const rows = data.map(mapTestPlanCaseRow);
    const nearest = direction === 'after'
      ? rows.reduce((min, r) => (r.order < min.order ? r : min))
      : rows.reduce((max, r) => (r.order > max.order ? r : max));
    return nearest;
  },

  // Swaps two rows' `order` directly instead of rewriting a whole page's sequence --
  // reordering is paginated now (Up/Down only), so we can't assume the caller holds every
  // test_plan_cases row for this plan the way a full-list drag-reorder would.
  async swapCaseOrder(testPlanCaseIdA: string, orderA: number, testPlanCaseIdB: string, orderB: number): Promise<void> {
    const [a, b] = await Promise.all([
      supabase.from('test_plan_cases').update({ order: orderB }).eq('id', testPlanCaseIdA),
      supabase.from('test_plan_cases').update({ order: orderA }).eq('id', testPlanCaseIdB),
    ]);
    if (a.error) throw a.error;
    if (b.error) throw b.error;
  },

  async detachFromPlan(testPlanCaseId: string): Promise<void> {
    const { error } = await supabase.from('test_plan_cases').delete().eq('id', testPlanCaseId);
    if (error) throw error;
  },
};
