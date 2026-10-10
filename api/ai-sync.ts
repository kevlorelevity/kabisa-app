// Vercel serverless function: POST /api/ai-sync   (admins only)
//
// Called by api/ai-edit.ts right after an AI rewrite of a lesson's whole conversation goes live.
// Records an ai_job (scope 'sync') and answers 202; in the background Claude reviews the lesson's
// key vocabulary (= flashcards) and practice session against the new conversation
// (src/lib/aiSync.ts). The results are stored as 'vocabulary' and 'practice' content_patch rows.
//
// Env vars: ANTHROPIC_API_KEY, ANTHROPIC_MODEL (default claude-opus-5-5), VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { waitUntil } from '@vercel/functions';
import { loadGuidance } from '../src/lib/styleGuide.js';
import { buildSyncPrompt, normalizeSync, syncSchema, type SyncInput } from '../src/lib/aiSync.js';
import { parseClaudeJson, type GrammarRef } from '../src/lib/aiPatch.js';

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}

let grammarCache: GrammarRef[] | null = null;
function grammarTopics(): GrammarRef[] {
  if (grammarCache) return grammarCache;
  try {
    const raw = JSON.parse(readFileSync(join(process.cwd(), 'content', 'grammar', 'topics.json'), 'utf8')) as GrammarRef[];
    grammarCache = raw.map((t) => ({ slug: t.slug, level: t.level, title: t.title }));
  } catch {
    grammarCache = [];
  }
  return grammarCache;
}

export async function POST(request: Request): Promise<Response> {
  const supaUrl = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!supaUrl || !anonKey) return json(503, { error: 'supabase_not_configured' });
  if (!apiKey) return json(503, { error: 'ai_not_configured' });
  const token = (request.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!token) return json(401, { error: 'not_signed_in' });

  let input: SyncInput;
  try {
    input = (await request.json()) as SyncInput;
  } catch {
    return json(400, { error: 'bad_json' });
  }
  if (!input?.lesson?.id || !Array.isArray(input.turns) || !input.turns.length) return json(400, { error: 'missing_fields' });
  input.vocabulary = Array.isArray(input.vocabulary) ? input.vocabulary : [];
  input.practice = Array.isArray(input.practice) ? input.practice : [];
  input.instruction = String(input.instruction ?? '').slice(0, 4000);

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

  const jobRes = await rest('ai_job', {
    method: 'POST',
    body: JSON.stringify({
      lesson_id: input.lesson.id,
      scope: 'sync',
      target_label: 'Key vocabulary, flashcards & practice',
      instruction: `Match the key vocabulary, flashcards and practice to the new conversation (${input.instruction})`.slice(0, 4000),
    }),
  });
  if (!jobRes.ok) return json(502, { error: 'job_store_failed', detail: await jobRes.text().catch(() => '') });
  const job = ((await jobRes.json()) as Array<{ id: string }>)[0];

  const finish = (patch: Record<string, unknown>) =>
    rest(`ai_job?id=eq.${job.id}`, {
      method: 'PATCH',
      headers: { prefer: 'return=minimal' },
      body: JSON.stringify({ ...patch, updated_at: new Date().toISOString() }),
    });

  const work = async () => {
    try {
      const guidance = await loadGuidance(rest);
      const { system, user: prompt } = buildSyncPrompt(input, grammarTopics(), guidance);
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
          max_tokens: 32000,
          system,
          messages: [{ role: 'user', content: prompt }],
          output_config: { format: { type: 'json_schema', schema: syncSchema() } },
        }),
      });
      const body = await ai.json().catch(() => null);
      if (!ai.ok) throw new Error(`AI request failed (${ai.status}): ${JSON.stringify(body).slice(0, 300)}`);
      const { summary, vocabulary, practice } = normalizeSync(parseClaudeJson(body), input);
      const pRes = await rest('content_patch', {
        method: 'POST',
        headers: { prefer: 'return=minimal' },
        body: JSON.stringify([
          { job_id: job.id, lesson_id: input.lesson.id, scope: 'vocabulary', item_id: null, value: vocabulary },
          { job_id: job.id, lesson_id: input.lesson.id, scope: 'practice', item_id: null, value: practice },
        ]),
      });
      if (!pRes.ok) throw new Error(`Saving the changes failed: ${(await pRes.text().catch(() => '')).slice(0, 200)}`);
      await finish({ status: 'live', summary: `${summary} (${vocabulary.length} words, ${practice.length} practice items)` });
    } catch (e) {
      console.error('[ai-sync]', e);
      await finish({ status: 'failed', error: e instanceof Error ? e.message.slice(0, 500) : 'unknown error' });
    }
  };

  waitUntil(work());
  return json(202, { jobId: job.id });
}
