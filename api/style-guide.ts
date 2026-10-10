// Vercel serverless function: POST /api/style-guide   (admins only)
//
// Rebuilds the editors' style guide in the background: reads every active observation
// (admin_guidance: Context notes, learner notes, Sanifu forms) and the current guide, asks
// Claude for a condensed new guide (src/lib/styleGuide.ts) and stores it in style_guide.
// Answers 202 at once. Every AI edit reads the latest guide.
//
// Env vars: ANTHROPIC_API_KEY, ANTHROPIC_MODEL (default claude-opus-5-5), VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY.

import { waitUntil } from '@vercel/functions';
import { STYLE_GUIDE_SYSTEM, buildStyleGuidePrompt, type Observation } from '../src/lib/styleGuide.js';

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}

export async function POST(request: Request): Promise<Response> {
  const supaUrl = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!supaUrl || !anonKey) return json(503, { error: 'supabase_not_configured' });
  if (!apiKey) return json(503, { error: 'ai_not_configured' });
  const token = (request.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!token) return json(401, { error: 'not_signed_in' });

  const auth = { apikey: anonKey, authorization: `Bearer ${token}` };
  const userRes = await fetch(`${supaUrl}/auth/v1/user`, { headers: auth });
  if (!userRes.ok) return json(401, { error: 'invalid_session' });
  const user = (await userRes.json()) as { id: string };
  const accRes = await fetch(`${supaUrl}/rest/v1/account?select=role&id=eq.${user.id}`, { headers: auth });
  const acc = accRes.ok ? ((await accRes.json()) as Array<{ role: string }>)[0] : undefined;
  if (acc?.role !== 'admin') return json(403, { error: 'not_admin' });

  const rest = (path: string, init: RequestInit = {}) =>
    fetch(`${supaUrl}/rest/v1/${path}`, {
      ...init,
      headers: { ...auth, 'content-type': 'application/json', prefer: 'return=representation', ...(init.headers ?? {}) },
    });

  const work = async () => {
    try {
      const oRes = await rest('admin_guidance?select=text,kind,lesson_id,target_label,created_at&active=eq.true&order=created_at.asc&limit=400');
      const observations = oRes.ok ? ((await oRes.json()) as Observation[]) : [];
      if (!observations.length) return;
      const gRes = await rest('style_guide?select=text&order=created_at.desc&limit=1');
      const previous = gRes.ok ? ((await gRes.json()) as Array<{ text: string }>)[0]?.text : undefined;
      const ai = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
          ...(process.env.ANTHROPIC_WORKSPACE_ID ? { 'anthropic-workspace-id': process.env.ANTHROPIC_WORKSPACE_ID.trim() } : {}),
        },
        body: JSON.stringify({
          model: process.env.ANTHROPIC_MODEL || 'claude-opus-5-5',
          max_tokens: 8000,
          system: STYLE_GUIDE_SYSTEM,
          messages: [{ role: 'user', content: buildStyleGuidePrompt(observations, previous) }],
        }),
      });
      const body = (await ai.json().catch(() => null)) as { content?: Array<{ type: string; text?: string }> } | null;
      if (!ai.ok) throw new Error(`AI request failed (${ai.status}): ${JSON.stringify(body).slice(0, 300)}`);
      const text = body?.content?.find((c) => c.type === 'text')?.text?.trim();
      if (!text) throw new Error('The AI returned no guide.');
      await rest('style_guide', { method: 'POST', headers: { prefer: 'return=minimal' }, body: JSON.stringify({ text: text.slice(0, 20000), entries: observations.length }) });
    } catch (e) {
      console.error('[style-guide]', e);
    }
  };

  waitUntil(work());
  return json(202, { ok: true });
}
