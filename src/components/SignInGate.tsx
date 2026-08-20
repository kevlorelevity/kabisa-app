import type { ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';
import { isSupabaseConfigured } from '../lib/supabase';
import { SignInButton } from './SignInButton';

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
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-4 text-center">
        <div>
          <h1 className="text-2xl font-bold text-green-800">Swahili ya Kenya</h1>
          <p className="mt-2 text-gray-600">
            Learn Swahili as it&apos;s actually spoken in Kenya.
          </p>
        </div>
        <SignInButton />
      </div>
    );
  }

  return <>{children}</>;
}
