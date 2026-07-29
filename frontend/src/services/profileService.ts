import { profileRepository } from '../repositories/profileRepository';

// Public-identity reads/updates (username, display name, avatar, bio). See userService
// for admin-facing account management (email, role).
export const profileService = {
  async getOwnProfile(userId: string) {
    return profileRepository.findById(userId);
  },

  async getById(id: string) {
    return profileRepository.findById(id);
  },

  async getByUsername(username: string) {
    return profileRepository.findByUsername(username);
  },

  async getByIds(ids: string[]) {
    return profileRepository.findByIds(ids);
  },

  async search(query: string) {
    return profileRepository.search(query);
  },

  async updateOwnProfile(userId: string, changes: Parameters<typeof profileRepository.update>[1]) {
    if ('username' in changes && changes.username !== undefined) {
      const current = await profileRepository.findById(userId);
      if (current?.usernameChanged && changes.username !== current.username) {
        throw new Error('Username can only be changed once.');
      }
    }
    return profileRepository.update(userId, changes);
  },
};
