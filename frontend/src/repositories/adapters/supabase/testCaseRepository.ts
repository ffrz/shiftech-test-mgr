import { supabase } from '../../../config/supabaseClient';
import { mapModuleRow, mapTagRow, mapTestCaseRow, mapTestPlanCaseRow, mapTestRoleRow } from '../../../helpers/mappers';
import type { TestCaseRepository } from '../../interfaces/testCaseRepository';

export const testCaseRepositoryAdapter: TestCaseRepository = {
  async searchByProject(projectId: string, query: string, limit = 5): Promise<Pick<any, 'id' | 'code' | 'title'>[]> {
    const sanitized = query.trim().replace(/^#/, '').replace(/[,()%*]/g, '');
    if (!sanitized) return [];
    const { data, error } = await supabase
      .from('test_cases')
      .select('id, code, title')
      .eq('project_id', projectId)
      .or(`code.ilike.%${sanitized}%,title.ilike.%${sanitized}%`)
      .limit(limit);
    if (error) throw error;
    return data ?? [];
  },

  async findByCode(projectId: string, code: string) {
    const { data, error } = await supabase
      .from('test_cases')
      .select('*')
      .eq('project_id', projectId)
      .eq('code', code)
      .maybeSingle();
    if (error) throw error;
    return data ? mapTestCaseRow(data) : null;
  },

  async findAllByProject(projectId: string) {
    const { data, error } = await supabase
      .from('test_cases')
      .select('*')
      .eq('project_id', projectId)
      .order('code');

    if (error) throw error;
    return (data ?? []).map(mapTestCaseRow);
  },

  async findAllByProjectWithDetails(
    projectId: string,
    options?: {
      search?: string;
      statuses?: any[];
      priorities?: any[];
      moduleIds?: string[];
      tagIds?: string[];
      testRoleIds?: string[];
    },
  ) {
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

  async findByIdsWithDetails(ids: string[]) {
    if (ids.length === 0) return [];
    const { data, error } = await supabase
      .from('test_cases')
      .select('*, module:modules(*), target_role:test_roles(*), test_case_tags(tag:tags(*))')
      .in('id', ids);
    if (error) throw error;
    return (data ?? []).map((row: any) => ({
      ...mapTestCaseRow(row),
      module: row.module ? mapModuleRow(row.module) : null,
      targetRole: row.target_role ? mapTestRoleRow(row.target_role) : null,
      tags: (row.test_case_tags ?? []).map((t: any) => mapTagRow(t.tag)),
    }));
  },

  async findById(id: string) {
    const { data, error } = await supabase.from('test_cases').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? mapTestCaseRow(data) : null;
  },

  async findByIdWithDetails(id: string) {
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

  async create(
    input: any,
  ) {
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
        external_links: input.externalLinks,
        created_by: input.createdBy ?? null,
      })
      .select('*')
      .single();

    if (error) throw error;
    return mapTestCaseRow(data);
  },

  async update(id: string, changes: any) {
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
    if (changes.externalLinks !== undefined) payload.external_links = changes.externalLinks;

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
    inputs: any[],
  ) {
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
          external_links: i.externalLinks,
          created_by: i.createdBy ?? null,
        })),
      )
      .select('*');
    if (error) throw error;
    return (data ?? []).map(mapTestCaseRow);
  },

  async remove(id: string) {
    const { error } = await supabase.from('test_cases').delete().eq('id', id);
    if (error) throw error;
  },

  async findCasesForPlan(testPlanId: string) {
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
    options: { search?: string; priorities?: string[]; moduleIds?: string[]; tagIds?: string[]; testRoleIds?: string[]; page: number; rowsPerPage: number },
  ) {
    let caseIdsFilter: string[] | undefined;
    // Tag and search filters are resolved to test_case ids first — PostgREST's `.or()`
    // filter string cannot reference dotted embedded-resource columns like `test_case.title`,
    // so the same id-lookup trick used for tags is used for the free-text search too.
    if (options.tagIds?.length || options.search?.trim()) {
      let ids = new Set<string>();
      if (options.tagIds?.length) {
        const { data: linked } = await supabase
          .from('test_case_tags')
          .select('test_case_id')
          .in('tag_id', options.tagIds);
        ids = new Set((linked ?? []).map((r: any) => r.test_case_id));
      }
      if (options.search?.trim()) {
        const q = options.search.trim();
        const { data: searched } = await supabase
          .from('test_cases')
          .select('id')
          .or(`title.ilike.%${q}%,code.ilike.%${q}%`);
        const searchIds = new Set((searched ?? []).map((r: any) => r.id));
        ids = ids.size > 0 ? new Set([...ids].filter((id) => searchIds.has(id))) : searchIds;
      }
      caseIdsFilter = [...ids];
      if (caseIdsFilter.length === 0) return { data: [], total: 0 };
    }

    let query = supabase
      .from('test_plan_cases')
      .select('*, test_case:test_cases!inner(*, module:modules(*), target_role:test_roles(*), test_case_tags(tag:tags(*)))', { count: 'exact' })
      .eq('test_plan_id', testPlanId);

    if (options.priorities?.length) {
      query = query.in('test_case.priority', options.priorities);
    }
    if (options.moduleIds?.length) {
      query = query.in('test_case.module_id', options.moduleIds);
    }
    if (options.testRoleIds?.length) {
      query = query.in('test_case.target_role_id', options.testRoleIds);
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

  async attachToPlanMany(
    inputs: { testPlanId: string; testCaseId: string; order: number }[],
  ) {
    if (inputs.length === 0) return [];
    const { data, error } = await supabase
      .from('test_plan_cases')
      .insert(inputs.map((i) => ({ test_plan_id: i.testPlanId, test_case_id: i.testCaseId, order: i.order })))
      .select('*');
    if (error) throw error;
    return (data ?? []).map(mapTestPlanCaseRow);
  },

  async attachToPlan(testPlanId: string, testCaseId: string, order: number) {
    const { data, error } = await supabase
      .from('test_plan_cases')
      .insert({ test_plan_id: testPlanId, test_case_id: testCaseId, order })
      .select('*')
      .single();

    if (error) throw error;
    return mapTestPlanCaseRow(data);
  },

  async findAdjacentPlanCase(testPlanId: string, order: number, direction: 'before' | 'after') {
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

  async swapCaseOrder(testPlanCaseIdA: string, orderA: number, testPlanCaseIdB: string, orderB: number) {
    const [a, b] = await Promise.all([
      supabase.from('test_plan_cases').update({ order: orderB }).eq('id', testPlanCaseIdA),
      supabase.from('test_plan_cases').update({ order: orderA }).eq('id', testPlanCaseIdB),
    ]);
    if (a.error) throw a.error;
    if (b.error) throw b.error;
  },

  async detachFromPlan(testPlanCaseId: string) {
    const { error } = await supabase.from('test_plan_cases').delete().eq('id', testPlanCaseId);
    if (error) throw error;
  },
};
