import type { GrammarBlock, GrammarTopic } from '../types.js';
import { HOUSE_RULES } from './aiPatch.js';

// -------- AI first drafts for the grammar studio (api/ai-grammar.ts) --------

export interface GrammarDraftInput {
  prompt: string;
  level: number;
  /** Reworking an existing section: its current version. */
  base?: GrammarTopic;
}

export interface GrammarRef {
  slug: string;
  level: number;
  title: string;
}

const str = { type: 'string' } as const;
const strList = { type: 'array', items: str } as const;

export function grammarSchema() {
  return {
    type: 'object',
    properties: {
      slug: str,
      level: { type: 'integer' },
      title: str,
      swahiliTitle: str,
      summary: str,
      blocks: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['p', 'list', 'table', 'tip', 'sanifu'] },
            text: str,
            items: strList,
            caption: str,
            headers: strList,
            rows: { type: 'array', items: strList },
          },
          required: ['type'],
          additionalProperties: false,
        },
      },
      examples: {
        type: 'array',
        items: { type: 'object', properties: { swahili: str, english: str, note: str }, required: ['swahili', 'english'], additionalProperties: false },
      },
      related: strList,
      tags: strList,
    },
    required: ['slug', 'level', 'title', 'summary', 'blocks', 'examples', 'related', 'tags'],
    additionalProperties: false,
  };
}

export const GRAMMAR_RULES = `You now write a GRAMMAR SECTION for Kabisa's grammar guide — the explainer a learner opens from a chip, and reads before a lesson's conversation.

How a section is built:
- "title": short and concrete ("The Subjunctive: -e for “Let / Should / So That”"); "swahiliTitle": the Swahili name if there is a natural one.
- "summary": one or two sentences — the whole idea in plain English.
- "blocks", in teaching order (4–8 of them):
  - "p": a paragraph. Start with the formula in bold (**subject + … + -e**). Use **bold** for the Swahili being taught and *italics* for example phrases.
  - "table": a conjugation or comparison table — "headers" and "rows" (every row as long as the headers), optional "caption" ("kuenda → -ende").
  - "list": short bullets (when it's used, common mistakes).
  - "tip": one practical tip for everyday Nairobi speech.
  - "sanifu": the standard (Sanifu) form, where Kenyans say it differently.
- "examples": 4–6 natural everyday sentences (Swahili + English, optional short note), the kind a Nairobi speaker says.
- "related": slugs of related sections, ONLY from the list below. "tags": 1–3 lowercase words (verbs, nouns, moods, time, numbers…).
- "slug": lowercase words joined by dashes. Keep the slug you were given when reworking a section.
- Explain for an English speaker who knows no linguistics; keep each block short.`;

export function buildGrammarPrompt(input: GrammarDraftInput, topics: GrammarRef[]): { system: string; user: string } {
  const list = topics.map((t) => `- ${t.slug} (level ${t.level}): ${t.title}`).join('\n');
  const system = `${HOUSE_RULES}\n\n${GRAMMAR_RULES}\n\nExisting sections (for "related", and so you don't repeat one):\n${list}`;
  const user = input.base
    ? `Rework this grammar section (level ${input.level}) as the editor asks. Keep what doesn't need to change.\n\nEditor's request:\n${input.prompt}\n\nCurrent section (JSON):\n${JSON.stringify(input.base, null, 2)}`
    : `Write a new grammar section for level ${input.level}.\n\nEditor's request:\n${input.prompt}`;
  return { system, user };
}

type Obj = Record<string, unknown>;
const s = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
const sl = (v: unknown) => (Array.isArray(v) ? v.map(s).filter(Boolean) : []);

function normBlock(b: Obj): GrammarBlock | null {
  const type = s(b.type);
  if (type === 'list') {
    const items = sl(b.items);
    return items.length ? { type, items } : null;
  }
  if (type === 'table') {
    const headers = sl(b.headers);
    const rows = (Array.isArray(b.rows) ? (b.rows as unknown[]) : []).map((r) => (Array.isArray(r) ? r.map((c) => s(c)) : [])).filter((r) => r.length);
    if (!headers.length || !rows.length) return null;
    const width = Math.max(headers.length, ...rows.map((r) => r.length));
    const pad = (r: string[]) => [...r, ...Array(width - r.length).fill('')];
    const caption = s(b.caption);
    return { type, ...(caption ? { caption } : {}), headers: pad(headers), rows: rows.map(pad) };
  }
  if (type === 'p' || type === 'tip' || type === 'sanifu') {
    const text = s(b.text);
    return text ? { type, text } : null;
  }
  return null;
}

/** Validates the AI's section: the level and (when reworking) the slug are the editor's. */
export function normalizeGrammar(raw: unknown, input: GrammarDraftInput, known: string[]): GrammarTopic {
  const r = (raw ?? {}) as Obj;
  const slug = input.base?.slug ?? (s(r.slug).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'new-section');
  const title = s(r.title);
  const summary = s(r.summary);
  const blocks = (Array.isArray(r.blocks) ? (r.blocks as Obj[]) : []).map(normBlock).filter((b): b is GrammarBlock => Boolean(b));
  if (!title || !summary || !blocks.length) throw new Error('The AI draft is missing its title, summary or explanation.');
  const examples = (Array.isArray(r.examples) ? (r.examples as Obj[]) : [])
    .map((e) => ({ swahili: s(e.swahili), english: s(e.english), note: s(e.note) }))
    .filter((e) => e.swahili && e.english)
    .map((e) => ({ swahili: e.swahili, english: e.english, ...(e.note ? { note: e.note } : {}) }));
  const topic: GrammarTopic = {
    slug,
    level: input.level,
    title,
    summary,
    blocks,
    examples,
    related: sl(r.related).filter((x) => known.includes(x) && x !== slug),
    tags: sl(r.tags).map((t) => t.toLowerCase()).slice(0, 4),
  };
  const sw = s(r.swahiliTitle);
  if (sw) topic.swahiliTitle = sw;
  if (input.base?.lessons) topic.lessons = input.base.lessons;
  return topic;
}
