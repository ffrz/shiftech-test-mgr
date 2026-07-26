import { userRepository } from '../repositories/userRepository';
import { mapUserRow } from '../helpers/mappers';

// Admin-facing account management (User Management page). See profileService for
// public-identity reads/updates (username, display name, avatar, bio).
export const userService = {
  getOwn(userId: string) {
    return userRepository.findById(userId);
  },

  getById(id: string) {
    return userRepository.findById(id);
  },

  listAll() {
    return userRepository.findAll();
  },

  async listPaginated(params: {
    search?: string;
    roles?: string[];
    page: number;
    pageSize: number;
    sortField?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const result = await userRepository.findAllPaginated(params);
    return {
      data: result.data.map((row: any) => ({
        ...mapUserRow(row),
        _displayName: row.profiles?.display_name ?? '—',
        _username: row.profiles?.username ?? '—',
      })),
      total: result.total,
    };
  },

  promoteToAdmin(id: string) {
    return userRepository.updateRole(id, 'admin');
  },

  demoteToUser(id: string) {
    return userRepository.updateRole(id, 'user');
  },

  remove(id: string) {
    return userRepository.softDelete(id);
  },
};
