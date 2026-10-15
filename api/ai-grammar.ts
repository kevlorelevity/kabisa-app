// Vercel serverless function: POST /api/ai-grammar   (admins only)
//
// A first draft of a grammar section for the grammar studio, from an admin's request — a new
// section, or a rework of an existing one (`base`). Answers with the drafted section; nothing is
// stored here: the admin edits it in the studio, then saves it as a draft or publishes it.
//
// Env vars: ANTHROPIC_API_KEY, ANTHROPIC_MODEL (default claude-opus-5-5), VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildGrammarPrompt, grammarSchema, normalizeGrammar, type GrammarDraftInput, type GrammarRef } from '../src/lib/aiGrammar.js';
import { parseClaudeJson } from '../src/lib/aiPatch.js';
import type { GrammarTopic } from '../src/types.js';

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}

function shippedTopics(): GrammarRef[] {
  try {
    const raw = JSON.parse(readFileSync(join(process.cwd(), 'content', 'grammar', 'topics.json'), 'utf8')) as GrammarRef[];
    return raw.map((t) => ({ slug: t.slug, level: t.level, title: t.title }));
  } catch {
    return [];
  }
}

export async function POST(request: Request): Promise<Response> {
  const supaUrl = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!supaUrl || !anonKey) return json(503, { error: 'supabase_not_configured' });
  if (!apiKey) return json(503, { error: 'ai_not_configured' });
  const token = (request.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!token) return json(401, { error: 'not_signed_in' });

  let input: GrammarDraftInput;
  try {
    input = (await request.json()) as GrammarDraftInput;
  } catch {
    return json(400, { error: 'bad_json' });
  }
  const prompt = typeof input?.prompt === 'string' ? input.prompt.trim().slice(0, 4000) : '';
  const level = Number(input?.level);
  if (!prompt || !Number.isInteger(level) || level < 1 || level > 10) return json(400, { error: 'missing_fields' });
  const base = input.base && typeof input.base === 'object' && typeof input.base.slug === 'string' ? (input.base as GrammarTopic) : undefined;
  input = { prompt, level, ...(base ? { base } : {}) };

  const auth = { apikey: anonKey, authorization: `Bearer ${token}` };
  const userRes = await fetch(`${supaUrl}/auth/v1/user`, { headers: auth });
  if (!userRes.ok) return json(401, { error: 'invalid_session' });
  const user = (await userRes.json()) as { id: string };
  const accRes = await fetch(`${supaUrl}/rest/v1/account?select=role&id=eq.${user.id}`, { headers: auth });
  const acc = accRes.ok ? ((await accRes.json()) as Array<{ role: string }>)[0] : undefined;
  if (acc?.role !== 'admin') return json(403, { error: 'not_admin' });

  // Every section the guide has — shipped ones and the studio's own.
  const topics = shippedTopics();
  const studio = await fetch(`${supaUrl}/rest/v1/grammar_topic?select=slug,published,draft`, { headers: auth });
  if (studio.ok) {
    for (const r of (await studio.json()) as Array<{ slug: string; published: GrammarTopic | null; draft: GrammarTopic | null }>) {
      const t = r.published ?? r.draft;
      if (t && !topics.some((x) => x.slug === r.slug)) topics.push({ slug: r.slug, level: t.level, title: t.title });
    }
  }

  try {
    const { system, user: userPrompt } = buildGrammarPrompt(input, topics);
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
        max_tokens: 16000,
        system,
        messages: [{ role: 'user', content: userPrompt }],
        output_config: { format: { type: 'json_schema', schema: grammarSchema() } },
      }),
    });
    const body = await ai.json().catch(() => null);
    if (!ai.ok) throw new Error(`AI request failed (${ai.status}): ${JSON.stringify(body).slice(0, 300)}`);
    const topic = normalizeGrammar(parseClaudeJson(body), input, topics.map((t) => t.slug));
    return json(200, { topic });
  } catch (e) {
    console.error('[ai-grammar]', e);
    return json(502, { error: 'ai_failed', detail: e instanceof Error ? e.message.slice(0, 300) : 'unknown error' });
  }
}
