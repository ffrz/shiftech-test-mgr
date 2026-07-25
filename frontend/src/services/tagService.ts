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

  // Same creatable-tag pattern as saveTagsForTestCase, but for Issues — issues reuse the
  // same per-project `tags` master, just a different junction table (issue_tags).
  async saveTagsForIssue(projectId: string, issueId: string, tagNames: string[]) {
    const uniqueNames = [...new Set(tagNames.map((name) => name.trim()).filter(Boolean))];
    const tags = await Promise.all(uniqueNames.map((name) => tagRepository.findOrCreate(projectId, name)));
    await issueRepository.replaceTags(issueId, tags.map((tag) => tag.id));
    return tags;
  },
};
