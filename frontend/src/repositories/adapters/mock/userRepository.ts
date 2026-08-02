import type { User, UserRole } from '../../../types/domain';
import type { UserRepository } from '../../interfaces/userRepository';

export function createMockUserRepository(seed: User[] = []): UserRepository {
  const store = new Map<string, User>(seed.map((u) => [u.id, u]));

  return {
    async findById(id: string) {
      const user = store.get(id);
      if (!user || user.deletedAt !== null) return null;
      return user;
    },

    async findAll() {
      return [...store.values()]
        .filter((u) => u.deletedAt === null)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },

    async findAllPaginated(params: {
      search?: string;
      roles?: string[];
      page: number;
      pageSize: number;
      sortField?: string;
      sortOrder?: 'asc' | 'desc';
    }) {
      let results = [...store.values()].filter((u) => u.deletedAt === null);

      if (params.search?.trim()) {
        const needle = params.search.trim().toLowerCase();
        results = results.filter((u) => u.email.toLowerCase().includes(needle));
      }

      if (params.roles?.length) {
        results = results.filter((u) => params.roles!.includes(u.role));
      }

      const sortField = (params.sortField ?? 'createdAt') as keyof User;
      const direction = params.sortOrder ?? 'desc';
      results.sort((a, b) => {
        const aVal = a[sortField] ?? '';
        const bVal = b[sortField] ?? '';
        const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        return direction === 'asc' ? cmp : -cmp;
      });

      const total = results.length;
      const from = (params.page - 1) * params.pageSize;
      return { data: results.slice(from, from + params.pageSize), total };
    },

    async updateRole(id: string, role: UserRole) {
      const existing = store.get(id);
      if (!existing) throw new Error(`mock user not found: ${id}`);
      const updated: User = { ...existing, role, updatedAt: new Date().toISOString() };
      store.set(id, updated);
      return updated;
    },

    async softDelete(id: string) {
      const existing = store.get(id);
      if (!existing) throw new Error(`mock user not found: ${id}`);
      existing.deletedAt = new Date().toISOString();
    },
  };
}
