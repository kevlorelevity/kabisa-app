// Vercel serverless function: POST /api/ai-lesson   (admins only)
//
// Writes a whole new lesson for a level from an admin's prompt. Records an ai_job (scope 'lesson')
// and answers 202 at once; in the background (waitUntil) Claude writes the lesson
// (src/lib/aiLesson.ts), which is validated and stored in ai_lesson — live for every learner on
// their next load. The level keeps its total XP; learners who had already cleared the level may
// skip the new lesson (src/lib/lessonScores.ts).
//
// Env vars: ANTHROPIC_API_KEY, ANTHROPIC_MODEL (default claude-opus-5-5), VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { waitUntil } from '@vercel/functions';
import { loadGuidance } from '../src/lib/styleGuide.js';
import { buildLessonPrompt, lessonSchema, normalizeLesson, type NewLessonInput } from '../src/lib/aiLesson.js';
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

  let input: NewLessonInput;
  try {
    input = (await request.json()) as NewLessonInput;
  } catch {
    return json(400, { error: 'bad_json' });
  }
  const prompt = typeof input?.prompt === 'string' ? input.prompt.trim().slice(0, 4000) : '';
  const level = Number(input?.level);
  if (!prompt || !Number.isInteger(level) || level < 1 || level > 10) return json(400, { error: 'missing_fields' });
  input = {
    level,
    levelName: String(input.levelName ?? '').slice(0, 100),
    levelFocus: String(input.levelFocus ?? '').slice(0, 500),
    order: Number.isFinite(Number(input.order)) ? Number(input.order) : level * 100 + 99,
    prompt,
    existing: Array.isArray(input.existing) ? input.existing.slice(0, 20) : [],
  };

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
    body: JSON.stringify({ lesson_id: `level-${level}`, scope: 'lesson', target_label: `New lesson · Level ${level}`, instruction: prompt }),
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
      const grammar = grammarTopics();
      const { system, user: userPrompt } = buildLessonPrompt(input, grammar, guidance);
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
          messages: [{ role: 'user', content: userPrompt }],
          output_config: { format: { type: 'json_schema', schema: lessonSchema() } },
        }),
      });
      const body = await ai.json().catch(() => null);
      if (!ai.ok) throw new Error(`AI request failed (${ai.status}): ${JSON.stringify(body).slice(0, 300)}`);
      const { summary, lesson } = normalizeLesson(parseClaudeJson(body), input, new Set(grammar.filter((g) => g.level <= level).map((g) => g.slug)));
      const lRes = await rest('ai_lesson', {
        method: 'POST',
        headers: { prefer: 'return=minimal' },
        body: JSON.stringify({ id: lesson.id, job_id: job.id, level, value: lesson }),
      });
      if (!lRes.ok) throw new Error(`Saving the lesson failed: ${(await lRes.text().catch(() => '')).slice(0, 200)}`);
      await finish({ status: 'live', summary: `${summary} (“${String(lesson.title)}”, level ${level})`, item_id: String(lesson.id) });
    } catch (e) {
      console.error('[ai-lesson]', e);
      await finish({ status: 'failed', error: e instanceof Error ? e.message.slice(0, 500) : 'unknown error' });
    }
  };

  waitUntil(work());
  return json(202, { jobId: job.id });
}
