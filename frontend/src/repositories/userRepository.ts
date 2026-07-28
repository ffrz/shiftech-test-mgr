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
    const { data, error } = await supabase.rpc('list_users', {
      p_search: params.search || null,
      p_roles: params.roles?.length ? params.roles : null,
      p_sort_field: params.sortField || 'createdAt',
      p_sort_order: params.sortOrder || 'desc',
      p_page: params.page,
      p_page_size: params.pageSize,
    });
    if (error) throw error;
    const result = (data ?? {}) as { data?: any[]; total?: number };
    return { data: result.data ?? [], total: result.total ?? 0 };
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
