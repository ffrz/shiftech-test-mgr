import type { Profile } from '../../../types/domain';
import type { ProfileRepository } from '../../interfaces/profileRepository';

export function createMockProfileRepository(seed: Profile[] = []): ProfileRepository {
  const store = new Map<string, Profile>(seed.map((p) => [p.id, p]));

  return {
    async findById(id: string): Promise<Profile | null> {
      return store.get(id) ?? null;
    },

    async findByUsername(username: string): Promise<Profile | null> {
      for (const p of store.values()) {
        if (p.username === username) return p;
      }
      return null;
    },

    async findByIds(ids: string[]): Promise<Profile[]> {
      return ids.map((id) => store.get(id)).filter((p): p is Profile => p !== undefined);
    },

    async search(query: string, limit = 10): Promise<Profile[]> {
      const sanitized = query.trim().replace(/^@/, '').replace(/[,()%*]/g, '');
      if (!sanitized) return [];
      const needle = sanitized.toLowerCase();
      const results: Profile[] = [];
      for (const p of store.values()) {
        if (results.length >= limit) break;
        if (
          p.username.toLowerCase().includes(needle) ||
          (p.displayName ?? '').toLowerCase().includes(needle)
        ) {
          results.push(p);
        }
      }
      return results;
    },

    async update(id: string, changes: Partial<Pick<Profile, 'username' | 'displayName' | 'avatarUrl' | 'bio'>>): Promise<Profile> {
      const existing = store.get(id);
      if (!existing) throw new Error(`mock profile not found: ${id}`);
      const updated: Profile = { ...existing, ...changes, updatedAt: new Date().toISOString() };
      store.set(id, updated);
      return updated;
    },
  };
}
