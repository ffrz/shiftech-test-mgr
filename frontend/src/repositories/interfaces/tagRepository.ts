import type { Tag } from '../../types/domain';

export interface TagRepository {
  findAllByProject(projectId: string): Promise<Tag[]>;
  findOrCreate(projectId: string, name: string): Promise<Tag>;
  update(id: string, name: string): Promise<Tag>;
  remove(id: string): Promise<void>;
  findTagsForTestCase(testCaseId: string): Promise<Tag[]>;
  setTagsForTestCase(testCaseId: string, tagIds: string[]): Promise<void>;
  findOrCreateMany(projectId: string, names: string[], existingTags?: Tag[]): Promise<Map<string, Tag>>;
  insertIssueTags(rows: { issueId: string; tagId: string }[]): Promise<void>;
  insertTestCaseTags(rows: { testCaseId: string; tagId: string }[]): Promise<void>;
}
