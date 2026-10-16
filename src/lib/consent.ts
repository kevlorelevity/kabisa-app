import { getSupabase } from './supabase';

// -------- Terms consent + email opt-in (migration 021) --------
//
// Every learner accepts the Terms before using Kabisa: new learners at sign-up, existing
// learners on their next visit. The email opt-in is pre-ticked and can be unticked here or
// later on the profile page. Offline dev mode (no Supabase env) keeps it in localStorage.

/** Bump when the Terms change materially: everyone is asked again. */
export const TERMS_VERSION = '2026-10-16';

export interface Consent {
  /** Accepted the current Terms. */
  accepted: boolean;
  /** Opted in to email summaries / nudges / key updates (null = never asked). */
  emailUpdates: boolean | null;
}

const LOCAL_KEY = 'ksa_consent';

function readLocal(): Consent {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (raw) {
      const c = JSON.parse(raw) as { version?: string; emailUpdates?: boolean | null };
      return { accepted: c.version === TERMS_VERSION, emailUpdates: c.emailUpdates ?? null };
    }
  } catch {
    // Storage unavailable.
  }
  return { accepted: false, emailUpdates: null };
}

function writeLocal(emailUpdates: boolean | null, version: string | null = TERMS_VERSION): void {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify({ version, emailUpdates }));
  } catch {
    // Storage unavailable — asked again next visit.
  }
}

export async function loadConsent(userId: string | null): Promise<Consent> {
  const supa = getSupabase();
  if (!supa || !userId) return readLocal();
  const { data, error } = await supa
    .from('profile')
    .select('terms_accepted_at, terms_version, email_updates')
    .eq('account_id', userId)
    .maybeSingle();
  if (error) throw error;
  return {
    accepted: Boolean(data?.terms_accepted_at) && data?.terms_version === TERMS_VERSION,
    emailUpdates: (data?.email_updates as boolean | null | undefined) ?? null,
  };
}

/** Records acceptance of the current Terms plus the email choice. */
export async function acceptTerms(userId: string | null, emailUpdates: boolean): Promise<void> {
  writeLocal(emailUpdates);
  const supa = getSupabase();
  if (!supa || !userId) return;
  const now = new Date().toISOString();
  const row = { terms_accepted_at: now, terms_version: TERMS_VERSION, email_updates: emailUpdates, email_updates_at: now, updated_at: now };
  const { data, error } = await supa.from('profile').update(row).eq('account_id', userId).select('account_id');
  if (error) throw error;
  if (!data?.length) {
    const ins = await supa.from('profile').insert({ account_id: userId, ...row });
    if (ins.error) throw ins.error;
  }
}

export async function setEmailUpdates(userId: string | null, emailUpdates: boolean): Promise<void> {
  writeLocal(emailUpdates, readLocal().accepted ? TERMS_VERSION : null);
  const supa = getSupabase();
  if (!supa || !userId) return;
  const now = new Date().toISOString();
  const { error } = await supa.from('profile').update({ email_updates: emailUpdates, email_updates_at: now, updated_at: now }).eq('account_id', userId);
  if (error) throw error;
}

/** Deletes the signed-in learner's account and everything stored about them, then signs out. */
export async function deleteMyAccount(): Promise<void> {
  const supa = getSupabase();
  if (supa) {
    const { error } = await supa.rpc('delete_my_account');
    if (error) throw error;
  }
  try {
    for (const k of Object.keys(localStorage)) if (k.startsWith('ksa_')) localStorage.removeItem(k);
    sessionStorage.setItem('ksa_account_deleted', '1');
  } catch {
    // Storage unavailable — nothing to clear.
  }
  if (supa) await supa.auth.signOut();
}

/** True once, right after an account was deleted (for a goodbye line on the sign-in page). */
export function takeDeletedFlag(): boolean {
  try {
    const v = sessionStorage.getItem('ksa_account_deleted') === '1';
    sessionStorage.removeItem('ksa_account_deleted');
    return v;
  } catch {
    return false;
  }
}
