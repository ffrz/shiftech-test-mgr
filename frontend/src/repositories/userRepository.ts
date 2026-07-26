import { supabase } from '../config/supabaseClient';
import { mapUserRow } from '../helpers/mappers';
import type { User, UserRole } from '../types/domain';

// Auth-bound account data (email, role). Only touched by admin-facing flows
// (User Management) — everywhere else should read the `profiles` table via
// profileRepository for public display fields instead.
export const userRepository = {
  async findById(id: string): Promise<User | null> {
    const { data, error } = await supabase.from('users').select('*').eq('id', id).is('deleted_at', null).maybeSingle();
    if (error) throw error;
    return data ? mapUserRow(data) : null;
  },

  async findAll(): Promise<User[]> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapUserRow);
  },

  async findAllPaginated(params: {
    search?: string;
    roles?: string[];
    page: number;
    pageSize: number;
    sortField?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ data: any[]; total: number }> {
    const sortFieldMap: Record<string, [string, string?]> = {
      email: ['email'],
      role: ['role'],
      createdAt: ['created_at'],
      _displayName: ['display_name', 'profiles'],
      _username: ['username', 'profiles'],
    };

    let query = supabase
      .from('users')
      .select('*, profiles!inner(username, display_name)', { count: 'exact' })
      .is('deleted_at', null);

    if (params.search) {
      const q = params.search.replace(/%/g, '');
      const { data: matchingProfiles } = await supabase
        .from('profiles')
        .select('id')
        .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`);
      const pids = (matchingProfiles ?? []).map((p: any) => p.id);
      const conds: string[] = [`email.ilike.%${q}%`];
      if (pids.length) conds.push(`id.in.(${pids.join(',')})`);
      query = query.or(conds.join(','));
    }

    if (params.roles?.length) {
      query = query.in('role', params.roles);
    }

    const [col, fk] = sortFieldMap[params.sortField ?? 'createdAt'] ?? ['created_at'];
    if (fk) {
      query = query.order(col, { ascending: params.sortOrder !== 'desc', foreignTable: fk });
    } else {
      query = query.order(col, { ascending: params.sortOrder !== 'desc' });
    }

    const from = (params.page - 1) * params.pageSize;
    query = query.range(from, from + params.pageSize - 1);

    const { data, error, count } = await query;
    if (error) throw error;
    return { data: data ?? [], total: count ?? 0 };
  },

  async updateRole(id: string, role: UserRole): Promise<User> {
    const { data, error } = await supabase.from('users').update({ role }).eq('id', id).select('*').single();
    if (error) throw error;
    return mapUserRow(data);
  },

  async softDelete(id: string): Promise<void> {
    const { error } = await supabase.from('users').update({ deleted_at: new Date().toISOString() }).eq('id', id);
    if (error) throw error;
  },
};
