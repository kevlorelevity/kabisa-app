import { useEffect, useState, type ReactNode } from 'react';
import { getSupabase } from '../lib/supabase';
import { signInWithGoogle, signOut } from '../lib/auth';
import { AuthContext, type AuthContextValue } from './authContext';
import type { Session } from '@supabase/supabase-js';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  // Only wait on the initial check when Supabase is actually configured —
  // computed synchronously so the "not configured" path never needs a
  // setState call inside the effect body below.
  const [loading, setLoading] = useState(() => Boolean(getSupabase()));

  useEffect(() => {
    const supa = getSupabase();
    if (!supa) return; // dev/offline mode — nothing to wait on

    let alive = true;

    supa.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setSession(data.session);
      setLoading(false);
    });

    const { data: subscription } = supa.auth.onAuthStateChange(
      (_event, nextSession) => {
        if (!alive) return;
        setSession(nextSession);
        setLoading(false);
      },
    );

    return () => {
      alive = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const value: AuthContextValue = {
    session,
    user: session?.user ?? null,
    loading,
    signInWithGoogle,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
