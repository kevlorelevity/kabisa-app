import type { GrammarBlock, GrammarTopic } from '../types';
import { getSupabase } from './supabase';
import { addGrammarTopics, type GrammarTopicRow } from './contentOverrides';

// -------- Grammar studio --------
//
// Admins draft new grammar sections, or rework existing ones, and publish them (grammar_topic,
// migration 020). A draft is only seen in the studio; publishing puts it live for every learner
// on their next load (and at once for the admin). Unpublishing takes a new section off the air,
// or puts a shipped one back to its shipped wording.

export type BlockType = GrammarBlock['type'];

/** One block as edited in the studio: plain text fields. */
export interface BlockDraft {
  type: BlockType;
  /** p / tip / sanifu: the text · list: one item per line · table: header line, then one row per line, cells split by " | ". */
  text: string;
  /** Tables only. */
  caption?: string;
}

export const BLOCK_LABELS: Record<BlockType, string> = {
  p: 'Paragraph',
  list: 'List',
  table: 'Table',
  tip: 'Tip (green box)',
  sanifu: 'Sanifu look-up (blue box)',
};

const lines = (s: string) => s.split('\n').map((l) => l.trim()).filter(Boolean);
const cells = (line: string) => line.split('|').map((c) => c.trim());

export function blockToDraft(b: GrammarBlock): BlockDraft {
  switch (b.type) {
    case 'list':
      return { type: 'list', text: b.items.join('\n') };
    case 'table':
      return { type: 'table', caption: b.caption ?? '', text: [b.headers, ...b.rows].map((r) => r.join(' | ')).join('\n') };
    default:
      return { type: b.type, text: b.text };
  }
}

/** Null when the block is empty (it's dropped). */
export function draftToBlock(d: BlockDraft): GrammarBlock | null {
  switch (d.type) {
    case 'list': {
      const items = lines(d.text);
      return items.length ? { type: 'list', items } : null;
    }
    case 'table': {
      const rows = lines(d.text).map(cells);
      if (!rows.length) return null;
      const [headers, ...body] = rows;
      const width = Math.max(...rows.map((r) => r.length));
      const pad = (r: string[]) => [...r, ...Array(width - r.length).fill('')];
      const caption = d.caption?.trim();
      return { type: 'table', ...(caption ? { caption } : {}), headers: pad(headers), rows: body.map(pad) };
    }
    default: {
      const text = d.text.trim();
      return text ? { type: d.type, text } : null;
    }
  }
}

export function examplesToText(ex: GrammarTopic['examples']): string {
  return ex.map((e) => [e.swahili, e.english, e.note].filter((x) => x !== undefined && x !== '').join(' | ')).join('\n');
}

export function textToExamples(text: string): GrammarTopic['examples'] {
  return lines(text)
    .map(cells)
    .filter(([sw, en]) => sw && en)
    .map(([swahili, english, note]) => ({ swahili, english, ...(note ? { note } : {}) }));
}

export const listToText = (l: string[] | undefined) => (l ?? []).join(', ');
export const textToList = (s: string) =>
  s
    .split(/[,\n]/)
    .map((x) => x.trim())
    .filter(Boolean);

export function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
}

export const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** What's missing before a section can be saved or published (empty when it's fine). */
export function problems(t: GrammarTopic, opts: { forPublish: boolean; takenSlugs?: string[] }): string[] {
  const out: string[] = [];
  if (!SLUG_RE.test(t.slug)) out.push('The web address (slug) may only use a–z, 0–9 and dashes.');
  if (opts.takenSlugs?.includes(t.slug)) out.push(`There is already a section at /grammar/${t.slug}.`);
  if (!t.title.trim()) out.push('Give the section a title.');
  if (!Number.isInteger(t.level) || t.level < 1 || t.level > 10) out.push('Pick a level from 1 to 10.');
  if (opts.forPublish) {
    if (!t.summary.trim()) out.push('Write the one-line summary.');
    if (!t.blocks.length) out.push('Add at least one block of explanation.');
  }
  return out;
}

export function emptyTopic(level = 1): GrammarTopic {
  return { slug: '', level, title: '', swahiliTitle: '', summary: '', blocks: [{ type: 'p', text: '' }], examples: [], related: [], tags: [] };
}

/** Drops empty optional fields so the stored JSON stays tidy. */
export function cleanTopic(t: GrammarTopic): GrammarTopic {
  const out: GrammarTopic = {
    slug: t.slug.trim(),
    level: t.level,
    title: t.title.trim(),
    summary: t.summary.trim(),
    blocks: t.blocks,
    examples: t.examples,
    related: t.related.filter((s) => s !== t.slug),
    tags: t.tags,
  };
  if (t.swahiliTitle?.trim()) out.swahiliTitle = t.swahiliTitle.trim();
  if (t.lessons) out.lessons = t.lessons;
  return out;
}

// ---- storage ----

export interface StudioRow {
  slug: string;
  draft: GrammarTopic | null;
  published: GrammarTopic | null;
  is_new: boolean;
  updated_at: string;
  published_at: string | null;
}

type Result<T = undefined> = { ok: true; value: T } | { ok: false; error: string };
const fail = (error: string) => ({ ok: false as const, error });

export async function loadStudioRows(): Promise<Result<StudioRow[]>> {
  const supa = getSupabase();
  if (!supa) return fail('Not connected to the database.');
  const { data, error } = await supa
    .from('grammar_topic')
    .select('slug,draft,published,is_new,updated_at,published_at')
    .order('updated_at', { ascending: false });
  if (error) return fail(error.message);
  return { ok: true, value: (data ?? []) as StudioRow[] };
}

export async function saveDraft(topic: GrammarTopic, isNew: boolean): Promise<Result> {
  const supa = getSupabase();
  if (!supa) return fail('Not connected to the database.');
  const t = cleanTopic(topic);
  const { error } = await supa
    .from('grammar_topic')
    .upsert({ slug: t.slug, draft: t, is_new: isNew, updated_at: new Date().toISOString() }, { onConflict: 'slug' });
  return error ? fail(error.message) : { ok: true, value: undefined };
}

export async function publishTopic(topic: GrammarTopic, isNew: boolean): Promise<Result> {
  const supa = getSupabase();
  if (!supa) return fail('Not connected to the database.');
  const t = cleanTopic(topic);
  const now = new Date().toISOString();
  const row = { slug: t.slug, draft: null, published: t, is_new: isNew, published_at: now, updated_at: now };
  const { error } = await supa.from('grammar_topic').upsert(row, { onConflict: 'slug' });
  if (error) return fail(error.message);
  addGrammarTopics([row as GrammarTopicRow]);
  return { ok: true, value: undefined };
}

export async function discardDraft(slug: string): Promise<Result> {
  const supa = getSupabase();
  if (!supa) return fail('Not connected to the database.');
  const { error } = await supa.from('grammar_topic').update({ draft: null, updated_at: new Date().toISOString() }).eq('slug', slug);
  return error ? fail(error.message) : { ok: true, value: undefined };
}

/** Off the air: a new section disappears for learners, a shipped one goes back to its shipped wording. */
export async function unpublishTopic(slug: string): Promise<Result> {
  const supa = getSupabase();
  if (!supa) return fail('Not connected to the database.');
  const { error } = await supa
    .from('grammar_topic')
    .update({ published: null, published_at: null, updated_at: new Date().toISOString() })
    .eq('slug', slug);
  if (error) return fail(error.message);
  addGrammarTopics([{ slug, published: null, published_at: null }]);
  return { ok: true, value: undefined };
}

/** Deletes a section that was never published (or no longer is). */
export async function deleteTopic(slug: string): Promise<Result> {
  const supa = getSupabase();
  if (!supa) return fail('Not connected to the database.');
  const { error } = await supa.from('grammar_topic').delete().eq('slug', slug);
  return error ? fail(error.message) : { ok: true, value: undefined };
}

/** Asks Claude for a first draft (api/ai-grammar.ts). */
export async function draftWithAi(args: { prompt: string; level: number; base?: GrammarTopic }): Promise<Result<GrammarTopic>> {
  const supa = getSupabase();
  const token = (await supa?.auth.getSession())?.data.session?.access_token;
  if (!token) return fail('Sign in again to use the AI.');
  try {
    const res = await fetch('/api/ai-grammar', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify(args),
    });
    const body = (await res.json().catch(() => null)) as { topic?: GrammarTopic; error?: string; detail?: string } | null;
    if (!res.ok || !body?.topic) return fail(body?.detail || body?.error || `The AI request failed (${res.status}).`);
    return { ok: true, value: body.topic };
  } catch (e) {
    return fail(e instanceof Error ? e.message : 'The AI request failed.');
  }
}
