// Vercel serverless function: POST /api/ai-followup   (admins only)
//
// Runs after an admin edit (or an ✨ AI edit that swapped words). The client sends the change,
// the admin's Context note and every other place in the app where the old wording appears.
// The function records an ai_job and answers 202 at once; in the background (waitUntil) it asks
// Claude, per place, apply / skip / ask (src/lib/aiFollowup.ts). "apply" places are stored as
// content_patch rows (live for everyone), "ask" places are stored on the job as questions for an
// admin (status 'review'), and an optional learner note for the edited item is stored as a patch.
//
// Env vars: ANTHROPIC_API_KEY, ANTHROPIC_MODEL (default claude-opus-5-5), VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY.

import { waitUntil } from '@vercel/functions';
import { loadGuidance } from '../src/lib/styleGuide.js';
import {
  CHUNK,
  MAX_CANDIDATES,
  applyDecision,
  buildFollowupPrompt,
  followupSchema,
  normalizeFollowup,
  notePatch,
  questionFor,
  type FollowupCandidate,
  type FollowupInput,
  type FollowupQuestion,
} from '../src/lib/aiFollowup.js';
import { parseClaudeJson } from '../src/lib/aiPatch.js';

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function POST(request: Request): Promise<Response> {
  const supaUrl = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!supaUrl || !anonKey) return json(503, { error: 'supabase_not_configured' });
  if (!apiKey) return json(503, { error: 'ai_not_configured' });
  const token = (request.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!token) return json(401, { error: 'not_signed_in' });

  let input: FollowupInput;
  try {
    input = (await request.json()) as FollowupInput;
  } catch {
    return json(400, { error: 'bad_json' });
  }
  if (!input?.lessonId || !Array.isArray(input.changes) || !input.changes.length) return json(400, { error: 'missing_fields' });
  const spans = (Array.isArray(input.spans) ? input.spans : []).filter((x) => x && typeof x.from === 'string' && typeof x.to === 'string' && x.from && x.to);
  const candidates = (Array.isArray(input.candidates) ? input.candidates : [])
    .filter((c): c is FollowupCandidate => Boolean(c?.ref && c.lessonId && c.itemId && c.item && ['turn', 'practice', 'vocab'].includes(c.kind)))
    .slice(0, MAX_CANDIDATES);
  const makeNote = input.makeNote === true && Boolean(input.itemId && input.itemKind);
  if (!candidates.length && !makeNote) return json(200, { skipped: true });

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

  const what = spans.length ? spans.map((x) => `${x.from} → ${x.to}`).join(', ') : input.changes.map((c) => `${c.before} → ${c.after}`).join('; ');
  const instruction = `${candidates.length ? `Check ${candidates.length} other place${candidates.length === 1 ? '' : 's'}: ` : 'Learner note: '}${what}${
    input.context ? ` — context: ${input.context}` : ''
  }`.slice(0, 4000);
  const jobRes = await rest('ai_job', {
    method: 'POST',
    body: JSON.stringify({
      lesson_id: input.lessonId,
      scope: 'followup',
      item_id: input.itemId ?? null,
      target_label: (input.targetLabel ?? '').slice(0, 300) || null,
      instruction,
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

  const askClaude = async (system: string, prompt: string, withNote: boolean) => {
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
        messages: [{ role: 'user', content: prompt }],
        output_config: { format: { type: 'json_schema', schema: followupSchema(withNote) } },
      }),
    });
    const body = await ai.json().catch(() => null);
    if (!ai.ok) throw new Error(`AI request failed (${ai.status}): ${JSON.stringify(body).slice(0, 300)}`);
    return parseClaudeJson(body);
  };

  const work = async () => {
    try {
      // The tooltip re-gloss of the same line writes the whole line: let it land first so the note isn't overwritten.
      if (input.afterJobId) {
        for (let i = 0; i < 40; i++) {
          const r = await rest(`ai_job?select=status&id=eq.${encodeURIComponent(input.afterJobId)}`);
          const st = r.ok ? ((await r.json()) as Array<{ status: string }>)[0]?.status : undefined;
          if (!st || st !== 'working') break;
          await sleep(4000);
        }
      }
      // The condensed style guide + observations editors made since it was last rebuilt.
      const guidance = await loadGuidance(rest);

      const applied: Array<{ c: FollowupCandidate; value: Record<string, unknown> }> = [];
      const questions: FollowupQuestion[] = [];
      let skipped = 0;
      let note = '';
      const summaries: string[] = [];
      const chunks: FollowupCandidate[][] = [];
      for (let i = 0; i < candidates.length; i += CHUNK) chunks.push(candidates.slice(i, i + CHUNK));
      if (!chunks.length) chunks.push([]);
      for (const [i, chunk] of chunks.entries()) {
        const withNote = makeNote && i === 0;
        const { system, user: prompt } = buildFollowupPrompt({ ...input, spans }, chunk, withNote, guidance);
        const result = normalizeFollowup(await askClaude(system, prompt, withNote), chunk);
        if (result.summary) summaries.push(result.summary);
        if (withNote) note = result.note;
        for (const d of result.decisions) {
          const c = chunk.find((x) => x.ref === d.ref)!;
          if (d.action === 'apply') applied.push({ c, value: applyDecision(c, spans, d) });
          else if (d.action === 'ask') questions.push(questionFor(c, d, spans));
          else skipped++;
        }
      }

      if (applied.length) {
        const pRes = await rest('content_patch', {
          method: 'POST',
          headers: { prefer: 'return=minimal' },
          body: JSON.stringify(applied.map(({ c, value }) => ({ job_id: job.id, lesson_id: c.lessonId, scope: 'item', item_id: c.itemId, value }))),
        });
        if (!pRes.ok) throw new Error(`Saving the changes failed: ${(await pRes.text().catch(() => '')).slice(0, 200)}`);
      }
      let patchId: string | null = null;
      const np = notePatch(input, note);
      if (np) {
        const nRes = await rest('content_patch', {
          method: 'POST',
          body: JSON.stringify({ job_id: job.id, lesson_id: input.lessonId, scope: np.scope, item_id: input.itemId, value: np.value }),
        });
        if (nRes.ok) patchId = ((await nRes.json()) as Array<{ id: string }>)[0]?.id ?? null;
      }

      const parts: string[] = [];
      if (candidates.length) {
        parts.push(`Changed ${applied.length} of ${candidates.length} other place${candidates.length === 1 ? '' : 's'}`);
        if (skipped) parts.push(`left ${skipped} (different meaning)`);
        if (questions.length) parts.push(`${questions.length} need${questions.length === 1 ? 's' : ''} your call`);
      }
      if (np) parts.push('added a learner note 💡');
      const summary = `${parts.join(' · ') || 'Nothing else to change'}.${summaries.length ? ` ${summaries.join(' ')}` : ''}`.slice(0, 1000);
      await finish({ status: questions.length ? 'review' : 'live', summary, questions: questions.length ? questions : null, patch_id: patchId });
    } catch (e) {
      console.error('[ai-followup]', e);
      await finish({ status: 'failed', error: e instanceof Error ? e.message.slice(0, 500) : 'unknown error' });
    }
  };

  waitUntil(work());
  return json(202, { jobId: job.id });
}
