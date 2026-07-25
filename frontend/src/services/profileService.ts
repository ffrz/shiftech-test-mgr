import { profileRepository } from '../repositories/profileRepository';

// Public-identity reads/updates (username, display name, avatar, bio). See userService
// for admin-facing account management (email, role).
export const profileService = {
  getOwnProfile(userId: string) {
    return profileRepository.findById(userId);
  },

  getById(id: string) {
    return profileRepository.findById(id);
  },

  getByUsername(username: string) {
    return profileRepository.findByUsername(username);
  },

  getByIds(ids: string[]) {
    return profileRepository.findByIds(ids);
  },

  search(query: string) {
    return profileRepository.search(query);
  },

  updateOwnProfile(userId: string, changes: Parameters<typeof profileRepository.update>[1]) {
    return profileRepository.update(userId, changes);
  },
};
