import { supabase } from '../config/supabaseClient';
import { mapProfileRow } from '../helpers/mappers';
import type { Profile } from '../types/domain';

// Public identity data (username, display name, avatar, bio) — safe to join into any
// display (tester/assignee/member/owner names). For email/role, see userRepository.
export const profileRepository = {
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

  // Partial-match search for the invite-by-username typeahead — matches username or
  // display_name, case-insensitive, capped to keep the dropdown usable.
  async search(query: string, limit = 10): Promise<Profile[]> {
    // Strip characters PostgREST's .or() filter syntax treats as structural
    // (comma separates conditions, parens/percent have special meaning) — a raw
    // pass-through would let user input break or redirect the filter.
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
