/**
 * "Sign in with Google" via Google Identity Services (GIS), on our own origin.
 *
 * The classic Supabase OAuth redirect sends people through
 * <project>.supabase.co, so Google's screens say "continue to
 * jqfr….supabase.co". With GIS, Google's popup/FedCM dialog is opened by
 * kabisa.app itself and returns an ID token, which we hand to Supabase with
 * signInWithIdToken — the Supabase host never appears.
 *
 * The client ID is public (it ships in every Google sign-in page). It must be
 * listed under "Client IDs" in Supabase → Auth → Providers → Google, and each
 * origin below must be an "Authorised JavaScript origin" on the Google client.
 */
import { getSupabase } from './supabase';

export const GOOGLE_CLIENT_ID: string =
  (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined) ??
  '607281137537-5rbuqkolttsa5nmss1pj9tnq2iaed8eg.apps.googleusercontent.com';

/** Origins registered with Google. Elsewhere (Vercel previews) we fall back to the redirect flow. */
export const GIS_ORIGINS = [
  'https://kabisa.app',
  'https://www.kabisa.app',
  'https://kabisa-seven.vercel.app',
  'http://localhost:5173',
];

export function gisSupportedHere(origin = typeof window !== 'undefined' ? window.location.origin : ''): boolean {
  return GIS_ORIGINS.includes(origin);
}

// Minimal typings for the bits of GIS we use.
interface CredentialResponse {
  credential: string;
}
interface GsiButtonOptions {
  type?: 'standard' | 'icon';
  theme?: 'outline' | 'filled_blue' | 'filled_black';
  size?: 'large' | 'medium' | 'small';
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
  shape?: 'rectangular' | 'pill' | 'circle' | 'square';
  logo_alignment?: 'left' | 'center';
  width?: number;
}
interface GoogleAccountsId {
  initialize(config: {
    client_id: string;
    callback: (r: CredentialResponse) => void;
    nonce?: string;
    ux_mode?: 'popup' | 'redirect';
    context?: 'signin' | 'signup' | 'use';
    itp_support?: boolean;
    use_fedcm_for_button?: boolean;
    auto_select?: boolean;
  }): void;
  renderButton(parent: HTMLElement, options: GsiButtonOptions): void;
  disableAutoSelect(): void;
}
declare global {
  interface Window {
    google?: { accounts: { id: GoogleAccountsId } };
  }
}

const SCRIPT_SRC = 'https://accounts.google.com/gsi/client';
let loading: Promise<GoogleAccountsId | null> | null = null;

/** Loads the GIS script once. Resolves null if it can't load (offline, blocked by an extension…). */
export function loadGoogleIdentity(timeoutMs = 8000): Promise<GoogleAccountsId | null> {
  if (typeof window === 'undefined') return Promise.resolve(null);
  if (window.google?.accounts?.id) return Promise.resolve(window.google.accounts.id);
  if (loading) return loading;
  loading = new Promise((resolve) => {
    const done = (v: GoogleAccountsId | null) => {
      clearTimeout(timer);
      if (!v) loading = null; // allow a retry later
      resolve(v);
    };
    const timer = setTimeout(() => done(null), timeoutMs);
    const s = document.createElement('script');
    s.src = SCRIPT_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => done(window.google?.accounts?.id ?? null);
    s.onerror = () => done(null);
    document.head.appendChild(s);
  });
  return loading;
}

/** A fresh nonce pair: Google gets the SHA-256 hash, Supabase the raw value (it hashes and compares). */
export async function makeNonce(): Promise<{ raw: string; hashed: string }> {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const raw = btoa(String.fromCharCode(...bytes)).replace(/[^a-zA-Z0-9]/g, '');
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
  const hashed = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return { raw, hashed };
}

/** Exchanges Google's ID token for a Supabase session. */
export async function signInWithGoogleCredential(idToken: string, rawNonce: string): Promise<boolean> {
  const supa = getSupabase();
  if (!supa) return false;
  const { error } = await supa.auth.signInWithIdToken({ provider: 'google', token: idToken, nonce: rawNonce });
  if (error) {
    console.error('[auth] signInWithIdToken failed:', error);
    return false;
  }
  return true;
}

/** After sign-out, stop Google from silently picking the same account next time. */
export function forgetGoogleAccountChoice(): void {
  window.google?.accounts?.id?.disableAutoSelect();
}
