import { useEffect, useState } from 'react';
import { getSupabase } from './supabase';

// -------- Invite a friend (migration 022) --------
//
// Each learner has a personal link: https://kabisa.app/?ref=<code>. The code is remembered
// when someone opens the link (it survives the Google sign-in redirect); once that person has
// signed up and finished onboarding, the app claims it, and the inviter earns REFERRAL_POINTS
// gonga points. The server only credits accounts created in the last day, so people who were
// already learners don't count. Friends' email addresses are never stored — invites go out
// from the learner's own email app.

export const REFERRAL_POINTS = 100;
const REF_KEY = 'ksa_ref';
export const REFERRALS_CHANGED_EVENT = 'ksa-referrals-changed';

/** On app start: remember ?ref=<code> and tidy it out of the address bar. */
export function captureReferralFromUrl(): void {
  try {
    const url = new URL(window.location.href);
    const ref = url.searchParams.get('ref')?.trim().toLowerCase();
    if (!ref || !/^[a-z0-9]{4,16}$/.test(ref)) return;
    localStorage.setItem(REF_KEY, ref);
    url.searchParams.delete('ref');
    window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
  } catch {
    // Storage unavailable — the invite just isn't credited.
  }
}

export function pendingReferral(): string | null {
  try {
    return localStorage.getItem(REF_KEY);
  } catch {
    return null;
  }
}

function clearPendingReferral(): void {
  try {
    localStorage.removeItem(REF_KEY);
  } catch {
    // ignore
  }
}

/** After sign-up + onboarding: credit whoever invited this learner (once; the server decides). */
export async function claimPendingReferral(): Promise<boolean> {
  const code = pendingReferral();
  const supa = getSupabase();
  if (!code || !supa) return false;
  const { data, error } = await supa.rpc('claim_referral', { p_code: code });
  if (error) {
    console.error('[referral] claim failed:', error);
    return false;
  }
  clearPendingReferral();
  return data === true;
}

/** "Amani" for the landing page's "Amani invited you" line. */
export async function referrerName(code: string): Promise<string | null> {
  const supa = getSupabase();
  if (!supa) return null;
  const { data, error } = await supa.rpc('referrer_first_name', { p_code: code });
  if (error) return null;
  return (data as string | null) ?? null;
}

export function inviteLink(code: string): string {
  return `${window.location.origin}/?ref=${code}`;
}

export interface ReferralStats {
  code: string | null;
  friends: number;
  points: number;
}

let cache: ReferralStats | null = null;
let inflight: Promise<ReferralStats> | null = null;

/** Bonus gonga points from invites, as last loaded (0 until then). */
export function referralBonus(): number {
  return cache?.points ?? 0;
}

export async function loadReferralStats(force = false): Promise<ReferralStats> {
  if (cache && !force) return cache;
  if (inflight && !force) return inflight;
  const supa = getSupabase();
  if (!supa) return (cache = { code: null, friends: 0, points: 0 });
  inflight = (async () => {
    const [code, stats] = await Promise.all([supa.rpc('my_referral_code'), supa.rpc('my_referral_stats')]);
    if (code.error) console.error('[referral] code failed:', code.error);
    if (stats.error) console.error('[referral] stats failed:', stats.error);
    const row = (Array.isArray(stats.data) ? stats.data[0] : stats.data) as { friends?: number; points?: number } | null;
    const next = { code: (code.data as string | null) ?? null, friends: row?.friends ?? 0, points: row?.points ?? 0 };
    const changed = !cache || cache.points !== next.points || cache.code !== next.code;
    cache = next;
    inflight = null;
    if (changed) window.dispatchEvent(new Event(REFERRALS_CHANGED_EVENT));
    return next;
  })();
  return inflight;
}

/** Invite stats for the signed-in learner (loads once per page, shared by every caller). */
export function useReferralStats(): ReferralStats {
  const [stats, setStats] = useState<ReferralStats>(cache ?? { code: null, friends: 0, points: 0 });
  useEffect(() => {
    let alive = true;
    const sync = () => alive && cache && setStats(cache);
    window.addEventListener(REFERRALS_CHANGED_EVENT, sync);
    void loadReferralStats().then((s) => alive && setStats(s));
    return () => {
      alive = false;
      window.removeEventListener(REFERRALS_CHANGED_EVENT, sync);
    };
  }, []);
  return stats;
}

/** The invite email (opened in the learner's own email app). */
export function inviteMailto(to: string, fromName: string | undefined, link: string, note: string): string {
  const subject = `${fromName ? `${fromName} thinks you` : 'You'}’d like Kabisa — learn Kenyan Swahili`;
  const body = [
    note.trim(),
    '',
    'Kabisa teaches the Swahili people really speak in Nairobi — matatus, the market, the office — by playing real conversations. It’s free while in beta.',
    '',
    `Join me here: ${link}`,
    '',
    fromName ? `— ${fromName}` : '',
  ]
    .filter((l, i, a) => !(l === '' && a[i - 1] === ''))
    .join('\n')
    .trim();
  const recipients = to
    .split(/[,;\s]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .join(',');
  return `mailto:${encodeURIComponent(recipients).replace(/%2C/g, ',').replace(/%40/g, '@')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function validEmails(to: string): boolean {
  const list = to.split(/[,;\s]+/).filter(Boolean);
  return list.length > 0 && list.every((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
}
