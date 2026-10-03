// Vercel serverless function: POST /api/suggestion
//
// Admin-only. Called from the pencil icons: stores a content suggestion in
// public.content_suggestion (through RLS — only admins can write) and appends
// it to the reviewers' Google Sheet via an Apps Script web app.
//
// Env vars:
//   VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY — already set for the frontend
//   KABISA_WEBHOOK_URL — the Apps Script web-app URL (docs/apps-script/kabisa-webhook.gs).
//     The script re-reads the row with the admin's own token, so no shared secret is needed.
//
// Without the webhook the suggestion is still stored; the response says synced: false.

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}

// Duplicated from api/feedback.ts on purpose: each Vercel function is compiled on its own (ESM).
/** POSTs to the Apps Script web app (which answers via a redirect) and checks for {"ok":true}. */
async function callWebhook(url: string, payload: Record<string, unknown>): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      redirect: 'follow',
    });
    const text = await res.text();
    if (!res.ok || !/"ok"\s*:\s*true/.test(text)) {
      console.error('[webhook] failed', res.status, text.slice(0, 300));
      return false;
    }
    return true;
  } catch (e) {
    console.error('[webhook] error', e);
    return false;
  }
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
  const proposedText = str(b.proposedText, 4000);
  // Either an explanation or new text (edit in place) is required.
  if ((!suggestion && !proposedText) || !targetType) return json(400, { error: 'missing_fields' });
  const ov = (b.override && typeof b.override === 'object' ? b.override : null) as Record<string, unknown> | null;
  const override =
    ov && ['lesson', 'grammar', 'level'].includes(String(ov.scope_type)) && str(ov.scope_id, 120) && str(ov.find_text, 4000)
      ? {
          scope_type: String(ov.scope_type),
          scope_id: str(ov.scope_id, 120),
          item_id: str(ov.item_id, 120),
          find_text: String(ov.find_text).slice(0, 4000),
          replace_text: typeof ov.replace_text === 'string' ? ov.replace_text.slice(0, 4000) : '',
        }
      : null;

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
    target_label: str(b.targetLabel, 300) ?? str(b.label, 300),
    lesson_id: str(b.lessonId, 120),
    item_id: str(b.itemId, 120),
    current_text: str(b.currentText, 4000),
    suggestion,
    proposed_text: proposedText,
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

  // Live edit: store the override (admins only, via RLS) and mark the suggestion applied.
  let applied = false;
  let overrideId: string | undefined;
  if (override && saved?.id) {
    const oRes = await fetch(`${supaUrl}/rest/v1/content_override`, {
      method: 'POST',
      headers: { ...auth, 'content-type': 'application/json', prefer: 'return=representation' },
      body: JSON.stringify({ ...override, created_by: user.id, suggestion_id: saved.id }),
    });
    if (oRes.ok) {
      overrideId = ((await oRes.json()) as Array<{ id: string }>)[0]?.id;
      applied = Boolean(overrideId);
      await fetch(`${supaUrl}/rest/v1/content_suggestion?id=eq.${saved.id}`, {
        method: 'PATCH',
        headers: { ...auth, 'content-type': 'application/json', prefer: 'return=minimal' },
        body: JSON.stringify({ status: 'applied' }),
      });
    } else {
      console.error('[suggestion] override insert failed', oRes.status, await oRes.text().catch(() => ''));
    }
  }

  const hook = process.env.KABISA_WEBHOOK_URL;
  if (!hook || !saved?.id) return json(200, { stored: true, synced: false, applied, overrideId, id: saved?.id });
  const ok = await callWebhook(hook, { type: 'suggestion', id: saved.id, accessToken: token, anonKey });
  if (ok) {
    await fetch(`${supaUrl}/rest/v1/content_suggestion?id=eq.${saved.id}`, {
      method: 'PATCH',
      headers: { ...auth, 'content-type': 'application/json', prefer: 'return=minimal' },
      body: JSON.stringify({ sheet_synced: true }),
    });
  }
  return json(200, { stored: true, synced: ok, applied, overrideId, id: saved.id });
}
