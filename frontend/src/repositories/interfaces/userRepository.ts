import type { User, UserRole } from '../../types/domain';

export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findAll(): Promise<User[]>;
  findAllPaginated(params: {
    search?: string;
    roles?: string[];
    page: number;
    pageSize: number;
    sortField?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ data: any[]; total: number }>;
  updateRole(id: string, role: UserRole): Promise<User>;
  softDelete(id: string): Promise<void>;
}
