import { supabase } from '../config/supabaseClient';
import { mapAttachmentRow, mapIssueRow, mapModuleRow, mapProfileRow, mapTagRow } from '../helpers/mappers';
import type { Attachment, ExternalLink, Issue, IssueStatus, IssueType, IssueWithDetails } from '../types/domain';

const ISSUE_DETAIL_SELECT =
  '*, assignee:users!issues_assigned_to_fkey(profile:profiles(*)), module:modules(*), issue_tags(tag:tags(*)), issue_test_results(test_result:test_results(id, test_run_id, test_case_code, test_case_title, test_run:test_runs(id, code, name)))';

// Same shape as ISSUE_DETAIL_SELECT but the issue_test_results relation is forced to an
// inner join — required by findAllByTestRun/findAllByTestResult, which filter on columns
// inside that nested relation. Defining issue_test_results twice in one select string (once
// plain, once with !inner) confuses PostgREST's join planner and produces malformed SQL
// (Postgres error 42803, aggregate functions not allowed in FROM) — so this is a full
// separate select string, not ISSUE_DETAIL_SELECT with an extra relation appended.
const ISSUE_DETAIL_SELECT_INNER_LINK =
  '*, assignee:users!issues_assigned_to_fkey(profile:profiles(*)), module:modules(*), issue_tags(tag:tags(*)), issue_test_results!inner(test_result:test_results!inner(id, test_run_id, test_case_code, test_case_title, test_run:test_runs(id, code, name)))';

function mapIssueWithDetailsRow(row: any): IssueWithDetails {
  return {
    ...mapIssueRow(row),
    assignee: row.assignee?.profile ? mapProfileRow(row.assignee.profile) : null,
    module: row.module ? mapModuleRow(row.module) : null,
    tags: (row.issue_tags ?? []).map((t: any) => mapTagRow(t.tag)),
    linkedTestResults: (row.issue_test_results ?? [])
      .filter((link: any) => link.test_result)
      .map((link: any) => ({
        id: link.test_result.id,
        testRunId: link.test_result.test_run_id,
        testCaseCode: link.test_result.test_case_code,
        testCaseTitle: link.test_result.test_case_title,
        testRun: link.test_result.test_run ?? null,
      })),
  };
}

export const issueRepository = {
  // Lightweight code/title lookup for the !code mention typeahead in comments — avoids
  // pulling assignee/module/tags/linked results like findById/findAllByProjectPaginated do.
  async searchByProject(projectId: string, query: string, limit = 5): Promise<Pick<Issue, 'id' | 'code' | 'title'>[]> {
    const sanitized = query.trim().replace(/^!/, '').replace(/[,()%*]/g, '');
    if (!sanitized) return [];
    const { data, error } = await supabase
      .from('issues')
      .select('id, code, title')
      .eq('project_id', projectId)
      .or(`code.ilike.%${sanitized}%,title.ilike.%${sanitized}%`)
      .limit(limit);
    if (error) throw error;
    return data ?? [];
  },

  async findByCode(projectId: string, code: string): Promise<Issue | null> {
    const { data, error } = await supabase.from('issues').select('*').eq('project_id', projectId).eq('code', code).maybeSingle();
    if (error) throw error;
    return data ? mapIssueRow(data) : null;
  },

  async findById(id: string): Promise<IssueWithDetails | null> {
    const { data, error } = await supabase.from('issues').select(ISSUE_DETAIL_SELECT).eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? mapIssueWithDetailsRow(data) : null;
  },

  async findAllByProjectPaginated(
    projectId: string,
    options: {
      search?: string;
      statuses?: IssueStatus[];
      priorities?: Issue['priority'][];
      moduleIds?: string[];
      tagIds?: string[];
      types?: IssueType[];
      page: number;
      pageSize: number;
      sortField?: string;
      sortOrder?: 'asc' | 'desc';
    },
  ): Promise<{ data: IssueWithDetails[]; total: number }> {
    const selectStr = options.tagIds?.length
      ? '*, assignee:users!issues_assigned_to_fkey(profile:profiles(*)), module:modules(*), issue_tags!inner(tag:tags(*)), issue_test_results(test_result:test_results(id, test_run_id, test_case_code, test_case_title, test_run:test_runs(id, code, name)))'
      : ISSUE_DETAIL_SELECT;

    let query = supabase.from('issues').select(selectStr, { count: 'exact' }).eq('project_id', projectId);

    if (options.search?.trim()) {
      const q = options.search.trim();
      query = query.or(`title.ilike.%${q}%,code.ilike.%${q}%`);
    }
    if (options.statuses?.length) {
      query = query.in('status', options.statuses);
    }
    if (options.priorities?.length) {
      query = query.in('priority', options.priorities);
    }
    if (options.moduleIds?.length) {
      query = query.in('module_id', options.moduleIds);
    }
    if (options.tagIds?.length) {
      query = query.in('issue_tags.tag_id', options.tagIds);
    }
    if (options.types?.length) {
      query = query.in('type', options.types);
    }

    const sortColumn: Record<string, string> = { code: 'code', title: 'title', priority: 'priority', status: 'status', type: 'type', assignedTo: 'assigned_to', createdAt: 'created_at', updatedAt: 'updated_at' };
    const sortCol = sortColumn[options.sortField ?? ''];
    if (options.sortField === 'moduleName') {
      query = query.order('module(name)', { ascending: (options.sortOrder ?? 'desc') === 'asc' });
    } else {
      query = query.order(sortCol ?? 'created_at', { ascending: (options.sortOrder ?? 'desc') === 'asc' });
    }

    const from = (options.page - 1) * options.pageSize;
    query = query.range(from, from + options.pageSize - 1);

    const { data, error, count } = await query;
    if (error) throw error;
    return { data: (data ?? []).map(mapIssueWithDetailsRow), total: count ?? 0 };
  },

  async findAllByProject(
    projectId: string,
    options?: { search?: string; statuses?: IssueStatus[]; priorities?: Issue['priority'][]; moduleIds?: string[]; limit?: number },
  ): Promise<IssueWithDetails[]> {
    let query = supabase
      .from('issues')
      .select(ISSUE_DETAIL_SELECT)
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
    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapIssueWithDetailsRow);
  },

  // Issues linked to any test_result within a single test run — used by the run-level
  // issue view (joins through issue_test_results, not a direct FK anymore).
  async findAllByTestRun(testRunId: string): Promise<IssueWithDetails[]> {
    const { data, error } = await supabase
      .from('issues')
      .select(ISSUE_DETAIL_SELECT_INNER_LINK)
      .eq('issue_test_results.test_result.test_run_id', testRunId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data ?? []).map(mapIssueWithDetailsRow);
  },

  // Issues linked to one specific test_result — used to show "already linked" state when
  // opening the Link Issue dialog for a row.
  async findAllByTestResult(testResultId: string): Promise<IssueWithDetails[]> {
    const { data, error } = await supabase
      .from('issues')
      .select(ISSUE_DETAIL_SELECT_INNER_LINK)
      .eq('issue_test_results.test_result_id', testResultId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data ?? []).map(mapIssueWithDetailsRow);
  },

  // `code` optional — omit/empty lets the `set_issue_code` DB trigger auto-generate ISS-####.
  async create(input: {
    projectId: string;
    moduleId: string | null;
    type: IssueType;
    code?: string | null;
    title: string;
    description: string | null;
    actualResult: string | null;
    expectedResult: string | null;
    priority: Issue['priority'];
    status: IssueStatus;
    assignedTo: string | null;
    externalLinks: ExternalLink[];
    createdBy?: string | null;
  }): Promise<Issue> {
    const { data, error } = await supabase
      .from('issues')
      .insert({
        project_id: input.projectId,
        module_id: input.moduleId,
        type: input.type,
        code: input.code || undefined,
        title: input.title,
        description: input.description,
        actual_result: input.actualResult,
        expected_result: input.expectedResult,
        priority: input.priority,
        status: input.status,
        assigned_to: input.assignedTo,
        external_links: input.externalLinks,
        created_by: input.createdBy ?? null,
      })
      .select('*')
      .single();

    if (error) throw error;
    return mapIssueRow(data);
  },

  async createMany(
    inputs: {
      projectId: string;
      moduleId: string | null;
      type: IssueType;
      title: string;
      description: string | null;
      actualResult: string | null;
      expectedResult: string | null;
      priority: Issue['priority'];
      status: IssueStatus;
      assignedTo: string | null;
      externalLinks: ExternalLink[];
      createdBy?: string | null;
    }[],
  ): Promise<Issue[]> {
    if (inputs.length === 0) return [];
    const { data, error } = await supabase
      .from('issues')
      .insert(inputs.map((i) => ({
        project_id: i.projectId,
        module_id: i.moduleId,
        type: i.type,
        title: i.title,
        description: i.description,
        actual_result: i.actualResult,
        expected_result: i.expectedResult,
        priority: i.priority,
        status: i.status,
        assigned_to: i.assignedTo,
        external_links: i.externalLinks,
        created_by: i.createdBy ?? null,
      })))
      .select('*');
    if (error) throw error;
    return (data ?? []).map(mapIssueRow);
  },

  async update(
    id: string,
    changes: Partial<
      Pick<Issue, 'code' | 'title' | 'description' | 'actualResult' | 'expectedResult' | 'priority' | 'type' | 'moduleId' | 'externalLinks'>
    >,
  ): Promise<Issue> {
    const payload: Record<string, unknown> = {};
    if (changes.code !== undefined) payload.code = changes.code;
    if (changes.title !== undefined) payload.title = changes.title;
    if (changes.description !== undefined) payload.description = changes.description;
    if (changes.actualResult !== undefined) payload.actual_result = changes.actualResult;
    if (changes.expectedResult !== undefined) payload.expected_result = changes.expectedResult;
    if (changes.priority !== undefined) payload.priority = changes.priority;
    if (changes.type !== undefined) payload.type = changes.type;
    if (changes.moduleId !== undefined) payload.module_id = changes.moduleId;
    if (changes.externalLinks !== undefined) payload.external_links = changes.externalLinks;

    const { data, error } = await supabase.from('issues').update(payload).eq('id', id).select('*').single();
    if (error) throw error;
    return mapIssueRow(data);
  },

  async updateStatus(id: string, status: IssueStatus): Promise<Issue> {
    const { data, error } = await supabase.from('issues').update({ status }).eq('id', id).select('*').single();
    if (error) throw error;
    return mapIssueRow(data);
  },

  async assign(id: string, assignedTo: string | null): Promise<Issue> {
    const { data, error } = await supabase.from('issues').update({ assigned_to: assignedTo }).eq('id', id).select('*').single();
    if (error) throw error;
    return mapIssueRow(data);
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('issues').delete().eq('id', id);
    if (error) throw error;
  },

  // --- issue_test_results junction (N:M) ---

  async linkToTestResult(issueId: string, testResultId: string): Promise<void> {
    const { error } = await supabase
      .from('issue_test_results')
      .upsert({ issue_id: issueId, test_result_id: testResultId }, { onConflict: 'issue_id,test_result_id', ignoreDuplicates: true });
    if (error) throw error;
  },

  async unlinkFromTestResult(issueId: string, testResultId: string): Promise<void> {
    const { error } = await supabase
      .from('issue_test_results')
      .delete()
      .eq('issue_id', issueId)
      .eq('test_result_id', testResultId);
    if (error) throw error;
  },

  // --- issue_tags junction (N:M, full-replace on save — same pattern as test_case_tags) ---

  async replaceTags(issueId: string, tagIds: string[]): Promise<void> {
    const { error: deleteError } = await supabase.from('issue_tags').delete().eq('issue_id', issueId);
    if (deleteError) throw deleteError;
    if (tagIds.length === 0) return;
    const { error: insertError } = await supabase.from('issue_tags').insert(tagIds.map((tagId) => ({ issue_id: issueId, tag_id: tagId })));
    if (insertError) throw insertError;
  },

  // --- attachments ---

  async findAttachments(issueId: string): Promise<Attachment[]> {
    const { data, error } = await supabase
      .from('entity_attachments')
      .select('*')
      .eq('entity_type', 'issue')
      .eq('entity_id', issueId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data ?? []).map(mapAttachmentRow);
  },

  async addAttachment(input: {
    issueId: string;
    projectId: string;
    storageProvider: string;
    url: string;
    fileName: string;
    fileSize: number | null;
    contentType: string | null;
  }): Promise<Attachment> {
    const { data, error } = await supabase
      .from('entity_attachments')
      .insert({
        entity_type: 'issue',
        entity_id: input.issueId,
        project_id: input.projectId,
        storage_provider: input.storageProvider,
        url: input.url,
        file_name: input.fileName,
        file_size: input.fileSize,
        content_type: input.contentType,
      })
      .select('*')
      .single();
    if (error) throw error;
    return mapAttachmentRow(data);
  },

  async removeAttachment(id: string): Promise<void> {
    const { error } = await supabase.from('entity_attachments').delete().eq('id', id);
    if (error) throw error;
  },
};
