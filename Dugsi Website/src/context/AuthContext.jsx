import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase, IS_CONFIGURED } from '../lib/supabase.js';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (uid) => {
    if (!uid) { setProfile(null); return; }
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', uid)
        .single();
      if (error) {
        console.error('profile fetch failed', error);
        setProfile(null);
      } else {
        setProfile(data);
      }
    } catch (e) {
      console.error('profile fetch threw', e);
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    if (!IS_CONFIGURED) {
      setLoading(false);
      return;
    }
    let active = true;
    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        if (!active) return;
        setSession(data.session);
        await loadProfile(data.session?.user?.id);
      })
      .catch((e) => console.error('getSession failed', e))
      .finally(() => { if (active) setLoading(false); });
    const { data: sub } = supabase.auth.onAuthStateChange(async (_evt, s) => {
      setSession(s);
      await loadProfile(s?.user?.id);
    });
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, [loadProfile]);

  const value = {
    session,
    user: session?.user ?? null,
    profile,
    loading,
    isTeacher: profile?.role === 'teacher',
    isStudent: profile?.role === 'student',
    refreshProfile: () => loadProfile(session?.user?.id),
    signIn: (email, password) => supabase.auth.signInWithPassword({ email, password }),
    signUp: (email, password, fullName) =>
      supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      }),
    signOut: () => supabase.auth.signOut(),
  };
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
