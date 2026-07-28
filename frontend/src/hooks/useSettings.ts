import { useState } from 'react';
import { useAuthContext } from './useAuth';
import { profileService } from '../services/profileService';

const USERNAME_CHANGED_ONCE = 'Username can only be changed once.';

export function useSettings() {
  const { profile, reloadProfile } = useAuthContext();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function updateProfile(changes: {
    username?: string;
    displayName?: string | null;
    avatarUrl?: string | null;
    bio?: string | null;
  }) {
    if (!profile) return;
    setSaving(true);
    setError(null);
    try {
      await profileService.updateOwnProfile(profile.id, changes);
      await reloadProfile();
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string };
      if (e?.code === '23505' || (typeof e?.message === 'string' && e.message.includes('duplicate key'))) {
        setError('Username is already taken. Please choose another one.');
      } else if (e instanceof Error && e.message === USERNAME_CHANGED_ONCE) {
        setError(USERNAME_CHANGED_ONCE);
      } else {
        setError(e instanceof Error ? e.message : 'Failed to update profile');
      }
      throw err;
    } finally {
      setSaving(false);
    }
  }

  return { profile, updateProfile, saving, error, clearError: () => setError(null) };
}
