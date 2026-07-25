import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../config/supabaseClient';
import { userService } from '../services/userService';
import { profileService } from '../services/profileService';
import type { User, Profile } from '../types/domain';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  isAdmin: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  reloadProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Auth layer: wraps Supabase session + the `users` row (role) + `profiles` row (public
// identity) into one place. Components read role/approval status or display identity via
// useAuthContext() instead of querying Supabase directly.

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadProfile(userId: string) {
    const [u, p] = await Promise.all([userService.getOwn(userId), profileService.getOwnProfile(userId)]);
    setUser(u);
    setProfile(p);
  }

  useEffect(() => {
    // onAuthStateChange fires once immediately with the current session (INITIAL_SESSION)
    // and again after Supabase finishes exchanging the OAuth redirect code for a session.
    // Relying on it alone (instead of racing it against getSession()) avoids a redirect-to-login
    // flash: if getSession() resolved with session=null before the OAuth exchange completed,
    // `loading` would flip to false and ProtectedRoute would bounce the user to /login
    // right before the real session arrived.
    const { data: subscription } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session?.user) {
        await loadProfile(session.user.id);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    // Realtime: pick up role changes (e.g. promote/demote to admin) made by an admin
    // while this user is already logged in, instead of requiring logout/login to see it.
    const userId = session?.user?.id;
    if (!userId) return;

    const channel = supabase
      .channel(`profile-role-${userId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'users', filter: `id=eq.${userId}` },
        () => {
          loadProfile(userId);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.user?.id]);

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
  }

  async function signOut() {
    await supabase.auth.signOut();
    // Don't rely solely on onAuthStateChange to clear local state — force it here too,
    // then hard-reload so any stray Supabase client state/subscriptions are fully reset.
    setSession(null);
    setUser(null);
    setProfile(null);
    window.location.assign('/login');
  }

  async function reloadProfile() {
    if (session?.user) await loadProfile(session.user.id);
  }

  const role = user?.role ?? null;

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        loading,
        isAdmin: role === 'admin',
        signInWithGoogle,
        signOut,
        reloadProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider');
  return ctx;
}
