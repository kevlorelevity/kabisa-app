// -------- After an admin edit: carry it across the app with judgement, and add learner notes --------
//
// An admin fixes wording in ONE place ("saa moja" → "lisaa limoja") and explains why in the
// Context field. The same words appear in other lessons, but not always with the same meaning
// ("saa moja" is also 7 a.m., Swahili time). So instead of a blind search & replace, every other
// place is sent to Claude together with the admin's context; Claude says, per place, apply /
// skip / ask. "apply" places are changed for everyone, "ask" places wait for an admin's call
// (Admin → Activity). Claude also writes a short learner note for the edited item when the
// edit teaches something worth knowing.
//
// Pure functions shared by api/ai-followup.ts (server) and the app (finding the places).

import { propagateSpan, type Span } from './textSpans.js';

export type FollowupKind = 'turn' | 'practice' | 'vocab';
export type EditedKind = 'turn' | 'word' | 'practice' | 'vocab';
type Obj = Record<string, unknown>;

export interface FollowupCandidate {
  /** `${lessonId}#${itemId}` */
  ref: string;
  lessonId: string;
  lessonTitle: string;
  itemId: string;
  kind: FollowupKind;
  /** The item as it is now (raw, unpersonalised). */
  item: Obj;
}

export interface FollowupChange {
  label: string;
  lang: 'sw' | 'en';
  before: string;
  after: string;
}

export interface FollowupInput {
  lessonId: string;
  lessonTitle: string;
  itemId?: string;
  itemKind?: EditedKind | null;
  wordIndex?: number;
  /** For a word edit: the word as it reads now. */
  wordText?: string;
  targetLabel?: string;
  changes: FollowupChange[];
  /** The admin's Context note (why the change was made). */
  context?: string;
  spans: Span[];
  /** The edited item after the edit (for writing a note). */
  edited?: unknown;
  currentNote?: string;
  makeNote: boolean;
  candidates: FollowupCandidate[];
  /** Wait for this AI job (the tooltip re-gloss of the same line) before writing anything. */
  afterJobId?: string;
  /** 'edit' = an admin's hand edit; 'ai' = word swaps an ✨ Ask AI edit made. */
  source?: 'edit' | 'ai';
}

export interface FollowupDecision {
  ref: string;
  action: 'apply' | 'skip' | 'ask';
  reason: string;
  english: string;
  gloss: string;
}

export interface FollowupQuestion {
  ref: string;
  lessonId: string;
  lessonTitle: string;
  itemId: string;
  kind: FollowupKind;
  before: string;
  after: string;
  reason: string;
  /** The full item to store if the admin says yes. */
  value: Obj;
}

export const MAX_CANDIDATES = 120;
export const CHUNK = 40;

interface LessonLike {
  id: string;
  title: string;
  turns?: readonly object[];
  practice?: readonly object[];
  vocabulary?: readonly object[];
}

/** Every dialogue line, practice item and flashcard (other than the edited one) that contains one of the spans. */
export function findCandidates(lessons: LessonLike[], spans: Span[], excludeItemId?: string): FollowupCandidate[] {
  const out: FollowupCandidate[] = [];
  if (!spans.length) return out;
  for (const lesson of lessons) {
    const groups: Array<[FollowupKind, Obj[] | undefined]> = [
      ['turn', lesson.turns as Obj[] | undefined],
      ['practice', lesson.practice as Obj[] | undefined],
      ['vocab', lesson.vocabulary as Obj[] | undefined],
    ];
    for (const [kind, items] of groups) {
      for (const item of items ?? []) {
        const id = typeof item.id === 'string' ? item.id : '';
        if (!id || id === excludeItemId) continue;
        if (spans.some((sp) => propagateSpan(item, sp, true) > 0)) {
          out.push({ ref: `${lesson.id}#${id}`, lessonId: lesson.id, lessonTitle: lesson.title, itemId: id, kind, item: structuredClone(item) });
        }
      }
    }
  }
  return out.slice(0, MAX_CANDIDATES);
}

const s = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');

/** The Swahili a learner sees for an item, in one line. */
export function swahiliLine(kind: FollowupKind, item: Obj): string {
  if (kind === 'practice') {
    const right = Array.isArray(item.options) ? (item.options as Obj[]).find((o) => o.correct === true) : undefined;
    return `${typeof item.before === 'string' ? item.before : ''}[${s(right?.text)}]${typeof item.after === 'string' ? item.after : ''}`.trim();
  }
  if (kind === 'vocab') {
    const nf = item.nounForms as { one?: string | null; many?: string | null } | undefined;
    return nf && (nf.one || nf.many) ? [nf.one, nf.many].filter(Boolean).join(' / ') : s(item.swahili);
  }
  return s(item.swahili);
}

/** The item with the spans replaced (and the AI's English / gloss, when it gave one). */
export function applyDecision(c: FollowupCandidate, spans: Span[], d?: Pick<FollowupDecision, 'english' | 'gloss'>): Obj {
  const next = structuredClone(c.item);
  for (const sp of spans) propagateSpan(next, sp);
  const english = s(d?.english);
  if (english && typeof next.english === 'string') next.english = english;
  const gloss = s(d?.gloss);
  if (gloss && c.kind === 'turn' && Array.isArray(next.words)) {
    for (const w of next.words as Obj[]) {
      const text = s(w.text).toLowerCase();
      if (spans.some((sp) => text.includes(sp.to.toLowerCase()))) w.gloss = gloss;
    }
  }
  return next;
}

function describe(c: FollowupCandidate, spans: Span[]): string {
  const it = c.item;
  const after = swahiliLine(c.kind, applyDecision(c, spans));
  const lines = [`[${c.ref}] lesson "${c.lessonTitle}" · ${c.kind === 'turn' ? `dialogue line (${s(it.speaker)})` : c.kind === 'practice' ? 'practice item' : 'flashcard'}`];
  lines.push(`  Swahili now:   ${swahiliLine(c.kind, it)}`);
  lines.push(`  after change:  ${after}`);
  if (s(it.english)) lines.push(`  English: ${s(it.english)}`);
  if (c.kind === 'turn' && Array.isArray(it.words)) {
    const glosses = (it.words as Obj[])
      .filter((w) => spans.some((sp) => s(w.text).toLowerCase().includes(sp.from.toLowerCase())))
      .map((w) => `${s(w.text)} = ${s(w.gloss)}`);
    if (glosses.length) lines.push(`  Word gloss: ${glosses.join('; ')}`);
  }
  if (c.kind === 'turn' && Array.isArray(it.options)) {
    const opts = (it.options as Obj[]).map((o) => s(o.swahili)).filter((o) => o && o !== s(it.swahili));
    if (opts.length) lines.push(`  Wrong answer choices: ${opts.join(' | ')}`);
  }
  if (c.kind === 'practice' && s(it.explanation)) lines.push(`  Explanation: ${s(it.explanation)}`);
  if (c.kind === 'vocab' && s(it.exampleContext)) lines.push(`  Usage: ${s(it.exampleContext)}`);
  return lines.join('\n');
}

export const FOLLOWUP_RULES = `You help the editors of Kabisa, an app that teaches spoken KENYAN Swahili (the way Nairobi speaks) to foreigners living in Kenya.

An editor just corrected the wording in one place of one lesson. The same words appear in other places in the app. Your job: decide, for EACH other place, whether the same correction belongs there too — judged by MEANING in that sentence, not by spelling. Use the editor's context note: it usually says exactly when the new wording applies and when it doesn't.

Example: an editor changed "Nitamaliza baada ya saa moja" to "...baada ya lisaa limoja" with the context "Kenyans say saa moja for 7 o'clock (Swahili time) and lisaa limoja for a duration of one hour". Then "Tutaondoka saa moja asubuhi" (we leave at 7 a.m.) must be SKIPPED, while "Subiri saa moja" (wait an hour) must be APPLIED.

For every place return one decision:
- "apply": the change clearly fits this place's meaning. If the English translation of that line/item must change as a result, give the full new English in "english" (else ""). If the change needs a new short word explanation, give it in "gloss" (else "").
- "skip": the words mean something else here, or the change would be wrong here.
- "ask": you are genuinely unsure (the sentence is ambiguous, or the context note doesn't cover this use). Say in "reason" what the editor needs to decide — one short sentence they can answer with yes or no.
"reason" is always one short sentence. Prefer "ask" over guessing; prefer "skip" over a change that could be wrong.`;

export const NOTE_RULES = `Learner note: if this edit teaches something a learner would genuinely benefit from knowing — a distinction Kenyans make (like time vs duration), how people really say it, a common mix-up or false friend — write a learner-facing note of 1–2 short sentences in English (quote Swahili in its Kenyan form) in "note". If the item already has a note, return the complete new note with the existing content kept (merged, not repeated). Return "" when the edit is a plain typo or wording fix with nothing worth teaching. Never mention editors, edits or the app.`;

export function followupSchema(withNote: boolean): Obj {
  const str = { type: 'string' };
  return {
    type: 'object',
    properties: {
      summary: str,
      decisions: {
        type: 'array',
        items: {
          type: 'object',
          properties: { ref: str, action: { type: 'string', enum: ['apply', 'skip', 'ask'] }, reason: str, english: str, gloss: str },
          required: ['ref', 'action', 'reason', 'english', 'gloss'],
          additionalProperties: false,
        },
      },
      ...(withNote ? { note: str } : {}),
    },
    required: ['summary', 'decisions', ...(withNote ? ['note'] : [])],
    additionalProperties: false,
  };
}

export function buildFollowupPrompt(
  input: FollowupInput,
  candidates: FollowupCandidate[],
  withNote: boolean,
  guidance: Array<{ text: string }>,
): { system: string; user: string } {
  const rules = guidance.length ? guidance.map((g) => `- ${g.text}`).join('\n') : '- (none yet)';
  const system = `${FOLLOWUP_RULES}${withNote ? `\n\n${NOTE_RULES}` : ''}\n\nStyle guide and notes from the Kabisa editors (newer win):\n${rules}`;
  const changes = input.changes.map((c) => `- ${c.label} (${c.lang === 'sw' ? 'Swahili' : 'English'}): "${c.before}" → "${c.after}"`).join('\n');
  const user = [
    `Lesson: "${input.lessonTitle}" (${input.lessonId})${input.targetLabel ? ` · ${input.targetLabel}` : ''}`,
    input.source === 'ai' ? 'An AI edit (asked for by an editor) made this change:' : 'The editor changed:',
    changes,
    input.context ? `Editor's context note: ${input.context}` : "Editor's context note: (none — judge by meaning)",
    input.spans.length ? `Words being replaced: ${input.spans.map((sp) => `"${sp.from}" → "${sp.to}"`).join(', ')}` : '',
    '',
    withNote
      ? `The edited item now (JSON):\n${JSON.stringify(input.edited ?? null)}\nIts current learner note: ${input.currentNote ? `"${input.currentNote}"` : '(none)'}`
      : '',
    '',
    candidates.length ? `Other places (${candidates.length}) — decide each one, using its ref:` : 'There are no other places to check — return an empty "decisions" list.',
    ...candidates.map((c) => describe(c, input.spans)),
    '',
    '"summary": one short sentence on what you decided.',
  ]
    .filter((l, i, all) => l !== '' || all[i - 1] !== '')
    .join('\n');
  return { system, user };
}

/** Validates Claude's answer: every candidate gets a decision (missing ones become "ask"). */
export function normalizeFollowup(raw: unknown, candidates: FollowupCandidate[]): { summary: string; note: string; decisions: FollowupDecision[] } {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Obj;
  const byRef = new Map<string, Obj>();
  for (const d of Array.isArray(r.decisions) ? (r.decisions as Obj[]) : []) if (s(d.ref)) byRef.set(s(d.ref), d);
  const decisions = candidates.map((c): FollowupDecision => {
    const d = byRef.get(c.ref);
    const action = d && ['apply', 'skip', 'ask'].includes(s(d.action)) ? (s(d.action) as FollowupDecision['action']) : 'ask';
    return {
      ref: c.ref,
      action,
      reason: s(d?.reason) || (d ? '' : 'The AI gave no answer for this place.'),
      english: s(d?.english),
      gloss: s(d?.gloss),
    };
  });
  return { summary: s(r.summary), note: s(r.note), decisions };
}

/** Where the learner note for the edited item is stored. */
export function notePatch(input: FollowupInput, note: string): { scope: 'fields' | 'word'; value: Obj } | null {
  if (!note || !input.itemId || !input.itemKind) return null;
  if (input.itemKind === 'word') {
    if (!input.wordText) return null;
    return { scope: 'word', value: { text: input.wordText, ...(input.wordIndex !== undefined ? { wordIndex: input.wordIndex } : {}), note } };
  }
  return { scope: 'fields', value: { note } };
}

export function questionFor(c: FollowupCandidate, d: FollowupDecision, spans: Span[]): FollowupQuestion {
  const value = applyDecision(c, spans, d);
  return {
    ref: c.ref,
    lessonId: c.lessonId,
    lessonTitle: c.lessonTitle,
    itemId: c.itemId,
    kind: c.kind,
    before: swahiliLine(c.kind, c.item),
    after: swahiliLine(c.kind, value),
    reason: d.reason,
    value,
  };
}
