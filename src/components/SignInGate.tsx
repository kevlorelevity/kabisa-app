import type { ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';
import { isSupabaseConfigured } from '../lib/supabase';
import { Landing } from './Landing';

/**
 * App-wide auth gate. PRD §8.3: "Auth-gated routes. No localStorage fallback
 * for an unauthenticated state in v1."
 *
 * Exception: when Supabase isn't configured at all (no env vars — the
 * existing "offline dev" mode used by lib/api.ts and useModules), the gate
 * is skipped entirely so `npm run dev` keeps working without a Supabase
 * project.
 */
export function SignInGate({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();

  if (!isSupabaseConfigured()) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Loading…
      </div>
    );
  }

  if (!session) {
    return <Landing />;
  }

  return <>{children}</>;
}
