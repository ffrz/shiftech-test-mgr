import { supabase } from '../config/supabaseClient';
import { mapProjectRow } from '../helpers/mappers';
import type { Project, ProjectSortField, ProjectStatus, ProjectVisibility, SortDirection } from '../types/domain';

const SORT_COLUMN: Record<ProjectSortField, string> = {
  name: 'name',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
};

export interface ProjectQuery {
  search?: string;
  status?: ProjectStatus | 'all';
  sortField?: ProjectSortField;
  sortDirection?: SortDirection;
}

export interface ProjectPaginatedQuery {
  search?: string;
  statuses?: string[];
  page: number;
  pageSize: number;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
}

export const projectRepository = {
  async findAll(query: ProjectQuery = {}): Promise<Project[]> {
    let builder = supabase.from('projects').select('*');

    if (query.search?.trim()) {
      builder = builder.ilike('name', `%${query.search.trim()}%`);
    }
    if (query.status && query.status !== 'all') {
      builder = builder.eq('status', query.status);
    }

    const sortField = query.sortField ?? 'name';
    const { data, error } = await builder.order(SORT_COLUMN[sortField], {
      ascending: (query.sortDirection ?? 'asc') === 'asc',
    });

    if (error) throw error;
    return (data ?? []).map(mapProjectRow);
  },

  async findAllPaginated(query: ProjectPaginatedQuery): Promise<{ data: Project[]; total: number }> {
    const sortCol = SORT_COLUMN[query.sortField as ProjectSortField] ?? 'name';
    let builder = supabase.from('projects').select('*', { count: 'exact' });

    if (query.search?.trim()) {
      builder = builder.ilike('name', `%${query.search.trim()}%`);
    }
    if (query.statuses?.length) {
      builder = builder.in('status', query.statuses);
    }

    builder = builder.order(sortCol, { ascending: (query.sortOrder ?? 'asc') === 'asc' });

    const from = (query.page - 1) * query.pageSize;
    builder = builder.range(from, from + query.pageSize - 1);

    const { data, error, count } = await builder;
    if (error) throw error;
    return { data: (data ?? []).map(mapProjectRow), total: count ?? 0 };
  },

  async findById(id: string): Promise<Project | null> {
    const { data, error } = await supabase.from('projects').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? mapProjectRow(data) : null;
  },

  async create(input: { name: string; description: string | null; visibility?: ProjectVisibility }): Promise<Project> {
    const { data, error } = await supabase.from('projects').insert(input).select('*').single();
    if (error) throw error;
    return mapProjectRow(data);
  },

  async update(id: string, changes: Partial<Pick<Project, 'name' | 'description' | 'visibility'>>): Promise<Project> {
    const { data, error } = await supabase.from('projects').update(changes).eq('id', id).select('*').single();
    if (error) throw error;
    return mapProjectRow(data);
  },

  async updateStatus(id: string, status: ProjectStatus): Promise<Project> {
    const { data, error } = await supabase.from('projects').update({ status }).eq('id', id).select('*').single();
    if (error) throw error;
    return mapProjectRow(data);
  },

  async deletePermanently(id: string): Promise<void> {
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) throw error;
  },
};
