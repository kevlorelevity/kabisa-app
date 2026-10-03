import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { isSupabaseConfigured } from '../lib/supabase';
import {
  GOOGLE_CLIENT_ID,
  gisSupportedHere,
  loadGoogleIdentity,
  makeNonce,
  signInWithGoogleCredential,
} from '../lib/googleIdentity';

/**
 * Google's own "Sign in with Google" button (Google Identity Services), so the
 * account chooser is opened by kabisa.app and never mentions the Supabase host.
 * Until it's ready — or if Google's script can't load — our redirect button shows.
 */
export function SignInButton({ size = 'sm' }: { size?: 'sm' | 'lg' }) {
  const slotRef = useRef<HTMLDivElement>(null);
  const [gisReady, setGisReady] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured() || !gisSupportedHere()) return;
    let alive = true;
    (async () => {
      const [gis, nonce] = await Promise.all([loadGoogleIdentity(), makeNonce()]);
      if (!alive || !gis || !slotRef.current) return;
      gis.initialize({
        client_id: GOOGLE_CLIENT_ID,
        nonce: nonce.hashed,
        ux_mode: 'popup',
        context: 'signin',
        itp_support: true,
        use_fedcm_for_button: true,
        auto_select: false,
        callback: async ({ credential }) => {
          setError(false);
          const ok = await signInWithGoogleCredential(credential, nonce.raw);
          if (!ok && alive) setError(true);
        },
      });
      gis.renderButton(slotRef.current, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'signin_with',
        shape: size === 'lg' ? 'pill' : 'rectangular',
        logo_alignment: 'left',
        width: size === 'lg' ? 260 : 200,
      });
      setGisReady(true);
    })();
    return () => {
      alive = false;
    };
  }, [size]);

  return (
    <div className="flex flex-col items-start gap-2">
      <div ref={slotRef} className={gisReady ? 'min-h-[44px]' : 'hidden'} />
      {!gisReady && <RedirectSignInButton size={size} />}
      {error && (
        <p className="text-sm text-red-600">
          Sign-in didn’t go through.{' '}
          <RedirectSignInButton size="link" />
        </p>
      )}
    </div>
  );
}

/** The classic redirect flow — fallback when Google's button can't be used. */
function RedirectSignInButton({ size }: { size: 'sm' | 'lg' | 'link' }) {
  const { signInWithGoogle } = useAuth();
  if (size === 'link') {
    return (
      <button type="button" onClick={() => void signInWithGoogle()} className="underline hover:text-red-800">
        Try again
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => void signInWithGoogle()}
      className={`inline-flex items-center gap-2 border border-gray-300 bg-white font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors ${size === 'lg' ? 'rounded-full px-6 py-3 text-base' : 'rounded-md px-4 py-2 text-sm'}`}
    >
      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
        <path
          fill="#4285F4"
          d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.91c1.7-1.57 2.69-3.88 2.69-6.62z"
        />
        <path
          fill="#34A853"
          d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.26c-.81.54-1.84.86-3.05.86-2.34 0-4.33-1.58-5.04-3.7H.96v2.33A9 9 0 0 0 9 18z"
        />
        <path
          fill="#FBBC05"
          d="M3.96 10.72A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.18.28-1.72V4.95H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.05l3-2.33z"
        />
        <path
          fill="#EA4335"
          d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3 2.33C4.67 5.16 6.66 3.58 9 3.58z"
        />
      </svg>
      Sign in with Google
    </button>
  );
}
