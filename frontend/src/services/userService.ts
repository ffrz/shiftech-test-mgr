import { userRepository } from '../repositories/userRepository';

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
