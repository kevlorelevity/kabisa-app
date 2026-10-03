// Vercel serverless function: POST /api/suggestion
//
// Admin-only. Called from the pencil icons: stores a content suggestion in
// public.content_suggestion (through RLS — only admins can write) and appends
// it to the reviewers' Google Sheet via an Apps Script web app.
//
// Env vars:
//   VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY — already set for the frontend
//   SUGGESTIONS_SHEET_WEBHOOK  — the Apps Script web-app URL (see docs/admin-suggestions.md)
//   SUGGESTIONS_SHEET_SECRET   — shared secret, must match SECRET in the Apps Script
//
// Without the webhook the suggestion is still stored; the response says synced: false.

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}

const str = (v: unknown, max: number): string | null => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);
const KINDS = new Set(['phrasing', 'translation', 'grammar', 'layout', 'other']);

export async function POST(request: Request): Promise<Response> {
  const supaUrl = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;
  if (!supaUrl || !anonKey) return json(503, { error: 'supabase_not_configured' });
  const token = (request.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!token) return json(401, { error: 'not_signed_in' });

  let b: Record<string, unknown>;
  try {
    b = await request.json();
  } catch {
    return json(400, { error: 'bad_json' });
  }
  const suggestion = str(b.suggestion, 4000);
  const targetType = str(b.targetType, 80);
  if (!suggestion || !targetType) return json(400, { error: 'missing_fields' });

  const auth = { apikey: anonKey, authorization: `Bearer ${token}` };
  const userRes = await fetch(`${supaUrl}/auth/v1/user`, { headers: auth });
  if (!userRes.ok) return json(401, { error: 'invalid_session' });
  const user = (await userRes.json()) as { id: string; email?: string };

  const accRes = await fetch(`${supaUrl}/rest/v1/account?select=role,first_name&id=eq.${user.id}`, { headers: auth });
  const acc = accRes.ok ? ((await accRes.json()) as Array<{ role: string; first_name: string }>)[0] : undefined;
  if (acc?.role !== 'admin') return json(403, { error: 'not_admin' });

  const kind = typeof b.kind === 'string' && KINDS.has(b.kind) ? b.kind : 'other';
  const row = {
    account_id: user.id,
    reviewer_email: user.email ?? null,
    reviewer_name: str(b.reviewerName, 60) ?? acc.first_name ?? null,
    kind,
    target_type: targetType,
    target_label: str(b.targetLabel, 300),
    lesson_id: str(b.lessonId, 120),
    item_id: str(b.itemId, 120),
    current_text: str(b.currentText, 4000),
    suggestion,
    proposed_text: str(b.proposedText, 4000),
    page: str(b.page, 300),
  };
  const ins = await fetch(`${supaUrl}/rest/v1/content_suggestion`, {
    method: 'POST',
    headers: { ...auth, 'content-type': 'application/json', prefer: 'return=representation' },
    body: JSON.stringify(row),
  });
  if (!ins.ok) {
    console.error('[suggestion] insert failed', ins.status, await ins.text().catch(() => ''));
    return json(502, { error: 'store_failed' });
  }
  const saved = ((await ins.json()) as Array<{ id: string; created_at: string }>)[0];

  const hook = process.env.SUGGESTIONS_SHEET_WEBHOOK;
  const secret = process.env.SUGGESTIONS_SHEET_SECRET;
  if (!hook || !secret) return json(200, { stored: true, synced: false, id: saved?.id });
  try {
    const res = await fetch(hook, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ secret, id: saved?.id, createdAt: saved?.created_at, ...row }),
      redirect: 'follow',
    });
    const ok = res.ok && /"ok"\s*:\s*true/.test(await res.text());
    if (ok && saved?.id) {
      await fetch(`${supaUrl}/rest/v1/content_suggestion?id=eq.${saved.id}`, {
        method: 'PATCH',
        headers: { ...auth, 'content-type': 'application/json', prefer: 'return=minimal' },
        body: JSON.stringify({ sheet_synced: true }),
      });
    }
    return json(200, { stored: true, synced: ok, id: saved?.id });
  } catch (e) {
    console.error('[suggestion] sheet sync failed', e);
    return json(200, { stored: true, synced: false, id: saved?.id });
  }
}
