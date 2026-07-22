import { supabase } from '../config/supabaseClient';
import { mapAttachmentRow, mapIssueRow, mapModuleRow, mapProfileRow, mapTagRow } from '../helpers/mappers';
import type { Attachment, GithubLink, Issue, IssueStatus, IssueType, IssueWithDetails } from '../types/domain';

const ISSUE_DETAIL_SELECT =
  '*, assignee:profiles(*), module:modules(*), issue_tags(tag:tags(*)), issue_test_results(test_result:test_results(id, test_run_id, test_case_code, test_case_title, test_run:test_runs(id, code, name)))';

// Same shape as ISSUE_DETAIL_SELECT but the issue_test_results relation is forced to an
// inner join — required by findAllByTestRun/findAllByTestResult, which filter on columns
// inside that nested relation. Defining issue_test_results twice in one select string (once
// plain, once with !inner) confuses PostgREST's join planner and produces malformed SQL
// (Postgres error 42803, aggregate functions not allowed in FROM) — so this is a full
// separate select string, not ISSUE_DETAIL_SELECT with an extra relation appended.
const ISSUE_DETAIL_SELECT_INNER_LINK =
  '*, assignee:profiles(*), module:modules(*), issue_tags(tag:tags(*)), issue_test_results!inner(test_result:test_results!inner(id, test_run_id, test_case_code, test_case_title, test_run:test_runs(id, code, name)))';

function mapIssueWithDetailsRow(row: any): IssueWithDetails {
  return {
    ...mapIssueRow(row),
    assignee: row.assignee ? mapProfileRow(row.assignee) : null,
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
  async findById(id: string): Promise<IssueWithDetails | null> {
    const { data, error } = await supabase.from('issues').select(ISSUE_DETAIL_SELECT).eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? mapIssueWithDetailsRow(data) : null;
  },

  async findAllByProject(projectId: string): Promise<IssueWithDetails[]> {
    const { data, error } = await supabase
      .from('issues')
      .select(ISSUE_DETAIL_SELECT)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

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

  async create(input: {
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
    githubLinks: GithubLink[];
  }): Promise<Issue> {
    const { data, error } = await supabase
      .from('issues')
      .insert({
        project_id: input.projectId,
        module_id: input.moduleId,
        type: input.type,
        title: input.title,
        description: input.description,
        actual_result: input.actualResult,
        expected_result: input.expectedResult,
        priority: input.priority,
        status: input.status,
        assigned_to: input.assignedTo,
        github_links: input.githubLinks,
      })
      .select('*')
      .single();

    if (error) throw error;
    return mapIssueRow(data);
  },

  async update(
    id: string,
    changes: Partial<
      Pick<Issue, 'title' | 'description' | 'actualResult' | 'expectedResult' | 'priority' | 'type' | 'moduleId' | 'githubLinks'>
    >,
  ): Promise<Issue> {
    const payload: Record<string, unknown> = {};
    if (changes.title !== undefined) payload.title = changes.title;
    if (changes.description !== undefined) payload.description = changes.description;
    if (changes.actualResult !== undefined) payload.actual_result = changes.actualResult;
    if (changes.expectedResult !== undefined) payload.expected_result = changes.expectedResult;
    if (changes.priority !== undefined) payload.priority = changes.priority;
    if (changes.type !== undefined) payload.type = changes.type;
    if (changes.moduleId !== undefined) payload.module_id = changes.moduleId;
    if (changes.githubLinks !== undefined) payload.github_links = changes.githubLinks;

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
      .from('attachments')
      .select('*')
      .eq('issue_id', issueId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data ?? []).map(mapAttachmentRow);
  },

  async addAttachment(input: Omit<Attachment, 'id' | 'createdAt'>): Promise<Attachment> {
    const { data, error } = await supabase
      .from('attachments')
      .insert({
        issue_id: input.issueId,
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
    const { error } = await supabase.from('attachments').delete().eq('id', id);
    if (error) throw error;
  },
};
