import { getSupabase } from './supabase';

export const FEEDBACK_EMAIL = 'feedback@kabisa.app';

export interface FeedbackInput {
  message: string;
  page: string;
  context?: string;
  displayName?: string;
}

export type FeedbackResult = { ok: true; emailed: boolean } | { ok: false; reason: 'offline' | 'error' };

/** Sends feedback to /api/feedback (stored in Supabase, emailed to the feedback inbox). */
export async function sendFeedback(input: FeedbackInput): Promise<FeedbackResult> {
  const supa = getSupabase();
  if (!supa) return { ok: false, reason: 'offline' };
  const { data } = await supa.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return { ok: false, reason: 'offline' };
  try {
    const res = await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify(input),
    });
    if (!res.ok) return { ok: false, reason: 'error' };
    const body = (await res.json()) as { emailed?: boolean };
    return { ok: true, emailed: Boolean(body.emailed) };
  } catch {
    return { ok: false, reason: 'error' };
  }
}

export function feedbackMailto(input: FeedbackInput): string {
  const subject = `Kabisa feedback${input.context ? ` · ${input.context}` : ''}`;
  const body = `${input.message}\n\n— Page: ${input.page}`;
  return `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
