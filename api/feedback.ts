// Vercel serverless function: POST /api/feedback
//
// Body: { message, page?, context? } with header `Authorization: Bearer <Supabase access token>`.
// 1. Verifies the signed-in learner with Supabase Auth.
// 2. Stores the feedback in public.feedback (as that user, through RLS — no service key needed).
// 3. Emails it to the feedback inbox via Resend, if configured.
//
// Env vars (Vercel → Project → Settings → Environment Variables):
//   VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY  — already set for the frontend
//   RESEND_API_KEY   — from resend.com (domain kabisa.app verified there)
//   FEEDBACK_TO      — optional, defaults to feedback@kabisa.app
//   FEEDBACK_FROM    — optional, defaults to "Kabisa Feedback <feedback@kabisa.app>"
//
// Without RESEND_API_KEY the feedback is still stored; the response says emailed: false.

const MAX_LEN = 4000;

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}

function escapeHtml(s: string): string {
  return s.replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' })[c]!);
}

interface SupaUser {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
}

export async function POST(request: Request): Promise<Response> {
  const supaUrl = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;
  if (!supaUrl || !anonKey) return json(503, { error: 'supabase_not_configured' });

  const token = (request.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!token) return json(401, { error: 'not_signed_in' });

  let body: { message?: unknown; page?: unknown; context?: unknown; displayName?: unknown };
  try {
    body = await request.json();
  } catch {
    return json(400, { error: 'bad_json' });
  }
  const message = typeof body.message === 'string' ? body.message.trim().slice(0, MAX_LEN) : '';
  if (!message) return json(400, { error: 'empty_message' });
  const page = typeof body.page === 'string' ? body.page.slice(0, 300) : null;
  const context = typeof body.context === 'string' ? body.context.slice(0, 300) : null;
  const displayName = typeof body.displayName === 'string' ? body.displayName.slice(0, 60) : null;

  // 1. Who is this?
  const userRes = await fetch(`${supaUrl}/auth/v1/user`, {
    headers: { apikey: anonKey, authorization: `Bearer ${token}` },
  });
  if (!userRes.ok) return json(401, { error: 'invalid_session' });
  const user = (await userRes.json()) as SupaUser;

  // 2. Store it (RLS: account_id must equal auth.uid()).
  const userAgent = request.headers.get('user-agent')?.slice(0, 300) ?? null;
  const row = { account_id: user.id, email: user.email ?? null, display_name: displayName, page, context, message, user_agent: userAgent };
  const ins = await fetch(`${supaUrl}/rest/v1/feedback`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      prefer: 'return=minimal',
    },
    body: JSON.stringify(row),
  });
  if (!ins.ok) {
    console.error('[feedback] insert failed', ins.status, await ins.text().catch(() => ''));
    return json(502, { error: 'store_failed' });
  }

  // 3. Email it.
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return json(200, { stored: true, emailed: false });
  const to = process.env.FEEDBACK_TO ?? 'feedback@kabisa.app';
  const from = process.env.FEEDBACK_FROM ?? 'Kabisa Feedback <feedback@kabisa.app>';
  const who = displayName || user.email || user.id;
  const subject = `Feedback from ${who}${context ? ` · ${context}` : ''}`;
  const html =
    `<p style="white-space:pre-wrap;font-size:15px">${escapeHtml(message)}</p><hr>` +
    `<p style="color:#666;font-size:13px">From: ${escapeHtml(who)}${user.email ? ` &lt;${escapeHtml(user.email)}&gt;` : ''}<br>` +
    `Page: ${escapeHtml(page ?? '—')}${context ? `<br>Context: ${escapeHtml(context)}` : ''}<br>` +
    `Browser: ${escapeHtml(userAgent ?? '—')}</p>`;
  const mail = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${resendKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from, to: [to], subject, html, text: `${message}\n\n— ${who}\nPage: ${page ?? '—'}`, reply_to: user.email || undefined }),
  });
  if (!mail.ok) {
    console.error('[feedback] email failed', mail.status, await mail.text().catch(() => ''));
    return json(200, { stored: true, emailed: false });
  }
  return json(200, { stored: true, emailed: true });
}
