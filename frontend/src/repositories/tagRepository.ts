import { supabase } from '../config/supabaseClient';
import { mapTagRow } from '../helpers/mappers';
import type { Tag } from '../types/domain';

export const tagRepository = {
  async findAllByProject(projectId: string): Promise<Tag[]> {
    const { data, error } = await supabase.from('tags').select('*').eq('project_id', projectId).order('name');
    if (error) throw error;
    return (data ?? []).map(mapTagRow);
  },

  async findOrCreate(projectId: string, name: string): Promise<Tag> {
    const { data: existing, error: findError } = await supabase
      .from('tags')
      .select('*')
      .eq('project_id', projectId)
      .ilike('name', name)
      .maybeSingle();
    if (findError) throw findError;
    if (existing) return mapTagRow(existing);

    const { data, error } = await supabase
      .from('tags')
      .insert({ project_id: projectId, name })
      .select('*')
      .single();
    if (error) throw error;
    return mapTagRow(data);
  },

  async update(id: string, name: string): Promise<Tag> {
    const { data, error } = await supabase.from('tags').update({ name }).eq('id', id).select('*').single();
    if (error) throw error;
    return mapTagRow(data);
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('tags').delete().eq('id', id);
    if (error) throw error;
  },

  async findTagsForTestCase(testCaseId: string): Promise<Tag[]> {
    const { data, error } = await supabase
      .from('test_case_tags')
      .select('tag:tags(*)')
      .eq('test_case_id', testCaseId);
    if (error) throw error;
    return (data ?? []).map((row: any) => mapTagRow(row.tag));
  },

  async setTagsForTestCase(testCaseId: string, tagIds: string[]): Promise<void> {
    const { error: deleteError } = await supabase.from('test_case_tags').delete().eq('test_case_id', testCaseId);
    if (deleteError) throw deleteError;

    if (tagIds.length === 0) return;
    const { error: insertError } = await supabase
      .from('test_case_tags')
      .insert(tagIds.map((tagId) => ({ test_case_id: testCaseId, tag_id: tagId })));
    if (insertError) throw insertError;
  },

  // Batch: ensure all names exist (case-insensitive), return Map<originalName, Tag>.
  // Using `existingTags` (pre-fetched for the project) avoids one query.
  async findOrCreateMany(
    projectId: string,
    names: string[],
    existingTags?: Tag[],
  ): Promise<Map<string, Tag>> {
    const uniqueNames = [...new Set(names.map((n) => n.trim()).filter(Boolean))];
    if (uniqueNames.length === 0) return new Map();

    let byLower: Map<string, Tag>;
    if (existingTags) {
      byLower = new Map(existingTags.map((t) => [t.name.toLowerCase(), t]));
    } else {
      const { data: all } = await supabase.from('tags').select('*').eq('project_id', projectId);
      if (!all) throw new Error('Failed to fetch tags');
      byLower = new Map(all.map(mapTagRow).map((t) => [t.name.toLowerCase(), t]));
    }

    const toCreate = uniqueNames.filter((n) => !byLower.has(n.toLowerCase()));
    if (toCreate.length > 0) {
      const { data: created, error } = await supabase
        .from('tags')
        .insert(toCreate.map((n) => ({ project_id: projectId, name: n })))
        .select('*');
      if (error) throw error;
      for (const row of created ?? []) {
        byLower.set(row.name.toLowerCase(), mapTagRow(row));
      }
    }

    const result = new Map<string, Tag>();
    for (const name of uniqueNames) {
      const tag = byLower.get(name.toLowerCase());
      if (tag) result.set(name, tag);
    }
    return result;
  },

  // Batch insert junction rows for issues (no delete needed — fresh inserts only).
  async insertIssueTags(rows: { issueId: string; tagId: string }[]): Promise<void> {
    if (rows.length === 0) return;
    const { error } = await supabase
      .from('issue_tags')
      .insert(rows.map((r) => ({ issue_id: r.issueId, tag_id: r.tagId })));
    if (error) throw error;
  },

  // Batch insert junction rows for newly created test cases (no delete needed).
  async insertTestCaseTags(rows: { testCaseId: string; tagId: string }[]): Promise<void> {
    if (rows.length === 0) return;
    const { error } = await supabase
      .from('test_case_tags')
      .insert(rows.map((r) => ({ test_case_id: r.testCaseId, tag_id: r.tagId })));
    if (error) throw error;
  },
};
