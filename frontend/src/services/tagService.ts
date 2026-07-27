import { tagRepository } from '../repositories/tagRepository';
import { issueRepository } from '../repositories/issueRepository';

export const tagService = {
  listByProject(projectId: string) {
    return tagRepository.findAllByProject(projectId);
  },

  listForTestCase(testCaseId: string) {
    return tagRepository.findTagsForTestCase(testCaseId);
  },

  create(projectId: string, name: string) {
    if (!name.trim()) throw new Error('Tag name cannot be empty');
    return tagRepository.findOrCreate(projectId, name.trim());
  },

  rename(id: string, name: string) {
    if (!name.trim()) throw new Error('Tag name cannot be empty');
    return tagRepository.update(id, name.trim());
  },

  remove(id: string) {
    return tagRepository.remove(id);
  },

  // Creatable dropdown: resolves each name to an existing tag or creates it,
  // then replaces the test case's tag set with the resolved ids.
  async saveTagsForTestCase(projectId: string, testCaseId: string, tagNames: string[]) {
    const uniqueNames = [...new Set(tagNames.map((name) => name.trim()).filter(Boolean))];
    const tags = await Promise.all(uniqueNames.map((name) => tagRepository.findOrCreate(projectId, name)));
    await tagRepository.setTagsForTestCase(testCaseId, tags.map((tag) => tag.id));
    return tags;
  },

  // Batch: resolve all tags for multiple test cases at once, then batch-insert junction rows.
  async saveTagsForTestCaseMany(
    projectId: string,
    items: { testCaseId: string; tagNames: string[] }[],
  ): Promise<void> {
    const nonEmpty = items.filter((i) => i.tagNames.length > 0);
    if (nonEmpty.length === 0) return;

    const allNames = [...new Set(nonEmpty.flatMap((i) => i.tagNames.map((n) => n.trim()).filter(Boolean)))];
    if (allNames.length === 0) return;

    const tagMap = await tagRepository.findOrCreateMany(projectId, allNames);
    const junctionRows = nonEmpty.flatMap((i) =>
      i.tagNames.map((name) => ({ testCaseId: i.testCaseId, tagId: tagMap.get(name.trim())!.id })),
    );
    await tagRepository.insertTestCaseTags(junctionRows);
  },

  // Same creatable-tag pattern as saveTagsForTestCase, but for Issues — issues reuse the
  // same per-project `tags` master, just a different junction table (issue_tags).
  async saveTagsForIssue(projectId: string, issueId: string, tagNames: string[]) {
    const uniqueNames = [...new Set(tagNames.map((name) => name.trim()).filter(Boolean))];
    const tags = await Promise.all(uniqueNames.map((name) => tagRepository.findOrCreate(projectId, name)));
    await issueRepository.replaceTags(issueId, tags.map((tag) => tag.id));
    return tags;
  },
};
