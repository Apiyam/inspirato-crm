import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabaseBrowser } from 'lib/supabase/client';
import type { Profile, UserRole } from 'types/crm';

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  profile: Profile | null;
  profileReady: boolean;
  role: UserRole | null;
  isSuperAdmin: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  loading: true,
  profile: null,
  profileReady: false,
  role: null,
  isSuperAdmin: false,
  signOut: async () => {},
  refreshProfile: async () => {},
});

async function loadProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabaseBrowser
    .from('profiles')
    .select('id, role, full_name, email, created_at, updated_at')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error('[auth] Error al cargar profiles:', error.message);
    return null;
  }
  if (!data) return null;

  const role: UserRole = data.role === 'superadmin' ? 'superadmin' : 'ejecutivo';
  return { ...data, role } as Profile;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileReady, setProfileReady] = useState(false);
  const [loading, setLoading] = useState(true);

  const applySession = useCallback(async (nextSession: Session | null) => {
    setSession(nextSession);
    setUser(nextSession?.user ?? null);

    if (!nextSession?.user) {
      setProfile(null);
      setProfileReady(true);
      setLoading(false);
      return;
    }

    setProfileReady(false);
    const next = await loadProfile(nextSession.user.id);
    setProfile(next);
    setProfileReady(true);
    setLoading(false);
  }, []);

  const refreshProfile = useCallback(async () => {
    const currentUser = (await supabaseBrowser.auth.getUser()).data.user;
    if (!currentUser) {
      setProfile(null);
      setProfileReady(true);
      return;
    }
    setProfileReady(false);
    const next = await loadProfile(currentUser.id);
    setProfile(next);
    setProfileReady(true);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      const { data } = await supabaseBrowser.auth.getSession();
      if (cancelled) return;
      await applySession(data.session);
    };

    void bootstrap();

    const { data: listener } = supabaseBrowser.auth.onAuthStateChange((_event, nextSession) => {
      if (cancelled) return;
      void applySession(nextSession);
    });

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, [applySession]);

  const signOut = async () => {
    await supabaseBrowser.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
    setProfileReady(true);
  };

  const role = profile?.role ?? null;
  const isSuperAdmin = role === 'superadmin';

  const value = useMemo(
    () => ({
      user,
      session,
      loading,
      profile,
      profileReady,
      role,
      isSuperAdmin,
      signOut,
      refreshProfile,
    }),
    [user, session, loading, profile, profileReady, role, isSuperAdmin, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
