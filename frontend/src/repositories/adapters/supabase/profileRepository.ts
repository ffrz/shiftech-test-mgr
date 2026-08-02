import { supabase } from '../../../config/supabaseClient';
import { mapProfileRow } from '../../../helpers/mappers';
import type { Profile } from '../../../types/domain';
import type { ProfileRepository } from '../../interfaces/profileRepository';

export const profileRepositoryAdapter: ProfileRepository = {
  async findById(id: string): Promise<Profile | null> {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? mapProfileRow(data) : null;
  },

  async findByUsername(username: string): Promise<Profile | null> {
    const { data, error } = await supabase.from('profiles').select('*').eq('username', username).maybeSingle();
    if (error) throw error;
    return data ? mapProfileRow(data) : null;
  },

  async findByIds(ids: string[]): Promise<Profile[]> {
    if (ids.length === 0) return [];
    const { data, error } = await supabase.from('profiles').select('*').in('id', ids);
    if (error) throw error;
    return (data ?? []).map(mapProfileRow);
  },

  async search(query: string, limit = 10): Promise<Profile[]> {
    const sanitized = query.trim().replace(/^@/, '').replace(/[,()%*]/g, '');
    if (!sanitized) return [];
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .or(`username.ilike.%${sanitized}%,display_name.ilike.%${sanitized}%`)
      .limit(limit);
    if (error) throw error;
    return (data ?? []).map(mapProfileRow);
  },

  async update(id: string, changes: Partial<Pick<Profile, 'username' | 'displayName' | 'avatarUrl' | 'bio'>>): Promise<Profile> {
    const payload: Record<string, unknown> = {};
    if ('username' in changes) payload.username = changes.username;
    if ('displayName' in changes) payload.display_name = changes.displayName;
    if ('avatarUrl' in changes) payload.avatar_url = changes.avatarUrl;
    if ('bio' in changes) payload.bio = changes.bio;

    const { data, error } = await supabase.from('profiles').update(payload).eq('id', id).select('*').single();
    if (error) throw error;
    return mapProfileRow(data);
  },
};
