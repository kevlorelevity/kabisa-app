import { getSupabase } from './supabase';

// -------- Learner profile (first name + nationality) --------
//
// Captured on the welcome screen after sign-up. Stored on the Supabase
// `profile` row (migration 004) when signed in; in offline dev mode (no
// Supabase env) it lives in localStorage so `npm run dev` still works.

export interface LearnerProfile {
  displayName: string;
  /** ISO 3166-1 alpha-2, e.g. 'DE'. */
  nationality: string;
}

const LOCAL_KEY = 'ksa_profile';

export function cleanName(raw: string): string {
  const t = raw.trim().replace(/\s+/g, ' ').slice(0, 30);
  return t ? t[0].toUpperCase() + t.slice(1) : '';
}

function readLocal(): LearnerProfile | null {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw ? (JSON.parse(raw) as LearnerProfile) : null;
  } catch {
    return null;
  }
}

function writeLocal(p: LearnerProfile): void {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(p));
  } catch {
    // Storage unavailable — profile lasts for this session only.
  }
}

/** Loads the profile; null means the learner hasn't filled in the welcome form yet. */
export async function loadProfile(userId: string | null): Promise<LearnerProfile | null> {
  const supa = getSupabase();
  if (!supa || !userId) return readLocal();
  const { data, error } = await supa
    .from('profile')
    .select('display_name, nationality, onboarded_at')
    .eq('account_id', userId)
    .maybeSingle();
  if (error) {
    console.error('[profile] load failed:', error);
    return readLocal();
  }
  if (!data?.onboarded_at || !data.display_name || !data.nationality) return null;
  const p = { displayName: data.display_name as string, nationality: data.nationality as string };
  writeLocal(p);
  return p;
}

export async function saveProfile(userId: string | null, p: LearnerProfile): Promise<void> {
  const clean = { displayName: cleanName(p.displayName), nationality: p.nationality };
  writeLocal(clean);
  const supa = getSupabase();
  if (!supa || !userId) return;
  const row = {
    display_name: clean.displayName,
    nationality: clean.nationality,
    onboarded_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supa.from('profile').update(row).eq('account_id', userId).select('account_id');
  if (error) throw error;
  if (!data?.length) {
    const ins = await supa.from('profile').insert({ account_id: userId, ...row });
    if (ins.error) throw ins.error;
  }
}
