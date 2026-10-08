// Vercel serverless function: POST /api/ai-edit   (admins only)
//
// Takes an admin's instruction for one dialogue turn / practice item, or for a
// lesson's whole conversation / practice session, records it as an ai_job and
// answers immediately (202) — the admin keeps working. In the background
// (waitUntil) it asks Claude for the revision (structured JSON output), validates
// it (src/lib/aiPatch.ts) and stores it as a content_patch, which the app applies
// for every learner on the next load. The job row tracks working → live / failed.
//
// Env vars: ANTHROPIC_API_KEY (required), ANTHROPIC_MODEL (default claude-opus-5-5),
//           VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY (already set for the frontend).

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { waitUntil } from '@vercel/functions';
import {
  buildPrompt,
  normalizeResult,
  outputSchema,
  parseClaudeJson,
  type AiLessonContext,
  type AiScope,
  type GrammarRef,
  type ItemKind,
} from '../src/lib/aiPatch.js';

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

  let b: Record<string, unknown>;
  try {
    b = await request.json();
  } catch {
    return json(400, { error: 'bad_json' });
  }
  const scope = String(b.scope) as AiScope;
  const kind = (b.kind === 'turn' || b.kind === 'practice' ? b.kind : null) as ItemKind | null;
  const lesson = b.lesson as AiLessonContext | undefined;
  const instruction = typeof b.instruction === 'string' ? b.instruction.trim().slice(0, 4000) : '';
  const itemId = typeof b.itemId === 'string' ? b.itemId : undefined;
  const targetLabel = typeof b.targetLabel === 'string' ? b.targetLabel.slice(0, 300) : undefined;
  if (!['item', 'dialogue', 'practice'].includes(scope) || !lesson?.id || !instruction) return json(400, { error: 'missing_fields' });
  if (scope === 'item' && (!kind || !itemId)) return json(400, { error: 'missing_item' });

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
    body: JSON.stringify({ lesson_id: lesson.id, scope, item_id: itemId ?? null, target_label: targetLabel ?? null, instruction }),
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
      const gRes = await rest('admin_guidance?select=text,target_label,lesson_id&active=eq.true&order=created_at.desc&limit=80');
      const guidance = gRes.ok ? ((await gRes.json()) as Array<{ text: string; target_label: string | null; lesson_id: string | null }>) : [];
      const { system, user: prompt } = buildPrompt({
        scope,
        kind,
        instruction,
        targetLabel,
        lesson,
        current: b.current,
        grammar: grammarTopics(),
        guidance: guidance.reverse(),
      });
      const ai = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify({
          model: process.env.ANTHROPIC_MODEL || 'claude-opus-5-5',
          max_tokens: 32000,
          system,
          messages: [{ role: 'user', content: prompt }],
          output_config: { format: { type: 'json_schema', schema: outputSchema(scope, kind) } },
        }),
      });
      const body = await ai.json().catch(() => null);
      if (!ai.ok) throw new Error(`AI request failed (${ai.status}): ${JSON.stringify(body).slice(0, 300)}`);
      const { summary, value } = normalizeResult(scope, kind, parseClaudeJson(body), b.current, itemId);
      const pRes = await rest('content_patch', {
        method: 'POST',
        body: JSON.stringify({ job_id: job.id, lesson_id: lesson.id, scope, item_id: itemId ?? null, value }),
      });
      if (!pRes.ok) throw new Error(`Saving the change failed: ${(await pRes.text().catch(() => '')).slice(0, 200)}`);
      const patch = ((await pRes.json()) as Array<{ id: string }>)[0];
      await finish({ status: 'live', summary, patch_id: patch.id });
    } catch (e) {
      console.error('[ai-edit]', e);
      await finish({ status: 'failed', error: e instanceof Error ? e.message.slice(0, 500) : 'unknown error' });
    }
  };

  waitUntil(work());
  return json(202, { jobId: job.id });
}
