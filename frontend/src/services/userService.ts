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

  approve(id: string) {
    return userRepository.updateRole(id, 'user');
  },

  // "Revoke access" is the OAuth-world equivalent of amanah-pos's "reset" action:
  // there is no password to reset (login is Google-only), so instead we pull the user
  // back to 'pending' — access is cut immediately and they must be re-approved.
  revokeAccess(id: string) {
    return userRepository.updateRole(id, 'pending');
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
