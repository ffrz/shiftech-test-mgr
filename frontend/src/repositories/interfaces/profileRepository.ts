import type { Profile } from '../../types/domain';

export interface ProfileRepository {
  findById(id: string): Promise<Profile | null>;
  findByUsername(username: string): Promise<Profile | null>;
  findByIds(ids: string[]): Promise<Profile[]>;
  search(query: string, limit?: number): Promise<Profile[]>;
  update(id: string, changes: Partial<Pick<Profile, 'username' | 'displayName' | 'avatarUrl' | 'bio'>>): Promise<Profile>;
}
