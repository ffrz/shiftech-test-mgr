import type { Tag } from '../../../types/domain';
import type { TagRepository } from '../../interfaces/tagRepository';

let seq = 0;
function nextId(): string {
  seq += 1;
  return `mock-tag-${seq}`;
}

export function createMockTagRepository(seed: Tag[] = []): TagRepository {
  const tagStore = new Map<string, Tag>(seed.map((t) => [t.id, t]));
  const testCaseTagStore = new Map<string, Set<string>>();
  const issueTagStore = new Map<string, Set<string>>();

  return {
    async findAllByProject(projectId: string): Promise<Tag[]> {
      return [...tagStore.values()]
        .filter((t) => t.projectId === projectId)
        .sort((a, b) => a.name.localeCompare(b.name));
    },

    async findOrCreate(projectId: string, name: string): Promise<Tag> {
      const existing = [...tagStore.values()].find(
        (t) => t.projectId === projectId && t.name.toLowerCase() === name.toLowerCase(),
      );
      if (existing) return existing;
      const tag: Tag = { id: nextId(), projectId, name, createdAt: new Date().toISOString() };
      tagStore.set(tag.id, tag);
      return tag;
    },

    async update(id: string, name: string): Promise<Tag> {
      const existing = tagStore.get(id);
      if (!existing) throw new Error(`mock tag not found: ${id}`);
      const updated: Tag = { ...existing, name };
      tagStore.set(id, updated);
      return updated;
    },

    async remove(id: string): Promise<void> {
      tagStore.delete(id);
      for (const set of testCaseTagStore.values()) set.delete(id);
      for (const set of issueTagStore.values()) set.delete(id);
    },

    async findTagsForTestCase(testCaseId: string): Promise<Tag[]> {
      const tagIds = testCaseTagStore.get(testCaseId);
      if (!tagIds) return [];
      return [...tagIds].map((tid) => tagStore.get(tid)).filter(Boolean) as Tag[];
    },

    async setTagsForTestCase(testCaseId: string, tagIds: string[]): Promise<void> {
      testCaseTagStore.set(testCaseId, new Set(tagIds));
    },

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
        const all = [...tagStore.values()].filter((t) => t.projectId === projectId);
        byLower = new Map(all.map((t) => [t.name.toLowerCase(), t]));
      }

      for (const name of uniqueNames) {
        if (!byLower.has(name.toLowerCase())) {
          const tag: Tag = { id: nextId(), projectId, name, createdAt: new Date().toISOString() };
          tagStore.set(tag.id, tag);
          byLower.set(name.toLowerCase(), tag);
        }
      }

      const result = new Map<string, Tag>();
      for (const name of uniqueNames) {
        const tag = byLower.get(name.toLowerCase());
        if (tag) result.set(name, tag);
      }
      return result;
    },

    async insertIssueTags(rows: { issueId: string; tagId: string }[]): Promise<void> {
      if (rows.length === 0) return;
      for (const row of rows) {
        if (!issueTagStore.has(row.issueId)) {
          issueTagStore.set(row.issueId, new Set());
        }
        issueTagStore.get(row.issueId)!.add(row.tagId);
      }
    },

    async insertTestCaseTags(rows: { testCaseId: string; tagId: string }[]): Promise<void> {
      if (rows.length === 0) return;
      for (const row of rows) {
        if (!testCaseTagStore.has(row.testCaseId)) {
          testCaseTagStore.set(row.testCaseId, new Set());
        }
        testCaseTagStore.get(row.testCaseId)!.add(row.tagId);
      }
    },
  };
}
