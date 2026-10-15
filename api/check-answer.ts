// Vercel serverless function: POST /api/check-answer   (any signed-in learner)
//
// Judges a whole typed sentence that didn't match any stored answer (levels 8+), so learners can
// say a line their own way. Body: CheckInput (src/lib/aiCheck.ts) with
// `Authorization: Bearer <Supabase access token>`. Answers a CheckResult: verdict, credit (0–1),
// short feedback, a corrected version for near misses, and the lesson's key words left out.
//
// Env vars: ANTHROPIC_API_KEY, ANTHROPIC_CHECK_MODEL (default claude-sonnet-5-5 — fast enough
// to answer while the learner waits), VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY.

import { CHECK_SYSTEM, buildCheckPrompt, checkSchema, normalizeCheck, type CheckInput } from '../src/lib/aiCheck.js';
import { parseClaudeJson } from '../src/lib/aiPatch.js';

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export async function POST(request: Request): Promise<Response> {
  const supaUrl = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!supaUrl || !anonKey) return json(503, { error: 'supabase_not_configured' });
  if (!apiKey) return json(503, { error: 'ai_not_configured' });
  const token = (request.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!token) return json(401, { error: 'not_signed_in' });

  let body: Partial<CheckInput>;
  try {
    body = (await request.json()) as Partial<CheckInput>;
  } catch {
    return json(400, { error: 'bad_json' });
  }
  const input: CheckInput = {
    english: str(body.english, 400),
    typed: str(body.typed, 300),
    expected: (Array.isArray(body.expected) ? body.expected : []).map((e) => str(e, 300)).filter(Boolean).slice(0, 6),
    salient: (Array.isArray(body.salient) ? body.salient : []).map((e) => str(e, 60)).filter(Boolean).slice(0, 4),
    context: str(body.context, 300) || undefined,
    level: typeof body.level === 'number' ? body.level : undefined,
  };
  if (!input.english || !input.typed || !input.expected.length) return json(400, { error: 'missing_fields' });

  const userRes = await fetch(`${supaUrl}/auth/v1/user`, { headers: { apikey: anonKey, authorization: `Bearer ${token}` } });
  if (!userRes.ok) return json(401, { error: 'invalid_session' });

  try {
    const ai = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
        ...(process.env.ANTHROPIC_WORKSPACE_ID ? { 'anthropic-workspace-id': process.env.ANTHROPIC_WORKSPACE_ID.trim() } : {}),
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_CHECK_MODEL || 'claude-sonnet-5-5',
        max_tokens: 1000,
        system: CHECK_SYSTEM,
        messages: [{ role: 'user', content: buildCheckPrompt(input) }],
        output_config: { format: { type: 'json_schema', schema: checkSchema } },
      }),
    });
    const out = await ai.json().catch(() => null);
    if (!ai.ok) return json(502, { error: 'ai_failed', detail: JSON.stringify(out).slice(0, 300) });
    return json(200, normalizeCheck(parseClaudeJson(out), input.salient));
  } catch (e) {
    return json(502, { error: 'ai_failed', detail: e instanceof Error ? e.message : String(e) });
  }
}
