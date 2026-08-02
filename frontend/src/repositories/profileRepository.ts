import { profileRepositoryAdapter } from './adapters/profileResolver';
import type { Profile } from '../types/domain';

export const profileRepository = {
  findById(id: string): Promise<Profile | null> {
    return profileRepositoryAdapter.findById(id);
  },

  findByUsername(username: string): Promise<Profile | null> {
    return profileRepositoryAdapter.findByUsername(username);
  },

  findByIds(ids: string[]): Promise<Profile[]> {
    return profileRepositoryAdapter.findByIds(ids);
  },

  search(query: string, limit?: number): Promise<Profile[]> {
    return profileRepositoryAdapter.search(query, limit);
  },

  update(id: string, changes: Partial<Pick<Profile, 'username' | 'displayName' | 'avatarUrl' | 'bio'>>): Promise<Profile> {
    return profileRepositoryAdapter.update(id, changes);
  },
};
