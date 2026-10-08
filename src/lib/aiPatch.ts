// -------- AI-assisted admin edits: prompt, output schema, validation --------
//
// Shared by api/ai-edit.ts (server) and tests. An admin instruction is sent to
// Claude together with the lesson context, the house rules, the grammar allowed
// at the lesson's level and the team's accumulated guidance notes. Claude returns
// JSON (structured outputs) that is validated and normalised here before it is
// stored as a content_patch and goes live.

export type AiScope = 'item' | 'dialogue' | 'practice';
export type ItemKind = 'turn' | 'practice' | 'word' | 'vocab';

/** Which content_patch scope an AI result is stored as. */
export function patchScopeFor(scope: AiScope, kind: ItemKind | null): 'item' | 'dialogue' | 'practice' | 'word' | 'fields' {
  if (scope !== 'item') return scope;
  return kind === 'word' ? 'word' : kind === 'vocab' ? 'fields' : 'item';
}

export interface AiLessonContext {
  id: string;
  title: string;
  level: number;
  culturalNote?: string;
  startingPoint?: string;
  grammarFocus?: string[];
  vocabulary?: Array<{ swahili: string; english: string }>;
}

export interface GrammarRef {
  slug: string;
  level: number;
  title: string;
}

type Obj = Record<string, unknown>;

const str = { type: 'string' } as const;

const wordSchema = {
  type: 'object',
  properties: { text: str, gloss: str, sanifu: str, note: str },
  required: ['text', 'gloss'],
  additionalProperties: false,
};

const turnSchema = {
  type: 'object',
  properties: {
    id: str,
    speaker: str,
    role: { type: 'string', enum: ['auto', 'user'] },
    swahili: str,
    english: str,
    sanifu: str,
    note: str,
    options: {
      type: 'array',
      items: {
        type: 'object',
        properties: { swahili: str, correct: { type: 'boolean' } },
        required: ['swahili', 'correct'],
        additionalProperties: false,
      },
    },
    words: { type: 'array', items: wordSchema },
  },
  required: ['speaker', 'role', 'swahili', 'english', 'words'],
  additionalProperties: false,
};

const practiceSchema = {
  type: 'object',
  properties: {
    id: str,
    mode: { type: 'string', enum: ['translate', 'complete'] },
    english: str,
    before: str,
    after: str,
    options: {
      type: 'array',
      items: {
        type: 'object',
        properties: { text: str, correct: { type: 'boolean' }, feedback: str },
        required: ['text', 'correct'],
        additionalProperties: false,
      },
    },
    explanation: str,
  },
  required: ['mode', 'english', 'before', 'after', 'options', 'explanation'],
  additionalProperties: false,
};

const vocabSchema = {
  type: 'object',
  properties: { swahili: str, english: str, exampleContext: str, sanifu: str, sanifuNote: str, note: str },
  required: ['swahili', 'english', 'exampleContext'],
  additionalProperties: false,
};

export function outputSchema(scope: AiScope, kind: ItemKind | null): Obj {
  const field =
    scope === 'item' && kind === 'word'
      ? { word: wordSchema }
      : scope === 'item' && kind === 'vocab'
      ? { card: vocabSchema }
      : scope === 'dialogue'
      ? { turns: { type: 'array', items: turnSchema } }
      : scope === 'practice'
      ? { practice: { type: 'array', items: practiceSchema } }
      : kind === 'turn'
      ? { turn: turnSchema }
      : { item: practiceSchema };
  return {
    type: 'object',
    properties: { summary: str, ...field },
    required: ['summary', ...Object.keys(field)],
    additionalProperties: false,
  };
}

export const HOUSE_RULES = `You edit lessons for Kabisa, an app that teaches spoken KENYAN Swahili (the way Nairobi speaks) to foreigners living in Kenya.

House rules — follow all of them:
1. Kenyan everyday Swahili first. When the Kenyan form differs from standard Swahili (Sanifu), put the Sanifu version of the whole line in the turn's "sanifu" field, or of a single word in that word's "sanifu" field. A "Sanifu footnote" means exactly this.
2. Noun agreement: use Kenyan m/wa (people, animals) and n/n (almost everything else) agreement. Other noun classes appear only as Sanifu look-ups.
3. Grammar limit: use only grammar whose level is at or below the lesson's level (list below). Levels 1–4 use only the level-1 toolkit: present -na-, -ko (niko, uko — and Kenyan "niko na" for "I have"), ni / si, question words, possessives, numbers, places with -ni. No negatives, future, past or commands before level 5.
4. The learner is a placeholder called John from Uganda (home city Kampala). Keep "John", "Uganda" and "Kampala" exactly — the app swaps in the real learner.
5. Dialogue turns: role "user" is the learner, role "auto" is the other speaker. Every user turn has exactly 3 options: one correct option identical to the line, and two wrong options that are wrong IN CONTEXT — a different word meaning, person or tense that does not fit the conversation. Never make wrong options differ only in noun-class agreement (wangu/yangu, hii/huyu). The learner sees no English while choosing.
6. "words": gloss each meaningful word or set phrase of the line. Each "text" must be an exact substring of the line; "gloss" is short English (e.g. "Ninaenda = I'm going").
7. Practice items: "translate" (English prompt, learner fills the Swahili gap) or "complete" (Swahili only). before + correct option + after must form the full Swahili sentence (put the spaces inside before/after). Exactly 3 options, one correct; wrong options test meaning, person or tense — not noun class. "explanation" is one short line.
8. Always return the complete item: for a learner turn that means all 3 "options" even if you didn't change them. Keep the "id" of every item you keep. Omit "id" for new items. Change only what the instruction asks for; keep everything else exactly as it is.
9. Natural, everyday sentences beat grammatically loaded ones. Keep lines short.
10. Notes: besides Sanifu, a word, a line or a flashcard can carry a "note" — a short learner-facing remark (1–2 sentences) on other meanings, how Kenyans actually use it, register (polite / street / Sheng), or a common mix-up. Add or change a note only when the instruction asks for one or it clearly helps; write it in English, quoting Swahili in its Kenyan form. To remove a note or Sanifu, return an empty string for it.
11. "summary": one short sentence saying what you changed.`;

export function buildPrompt(args: {
  scope: AiScope;
  kind: ItemKind | null;
  instruction: string;
  targetLabel?: string;
  lesson: AiLessonContext;
  current: unknown;
  grammar: GrammarRef[];
  guidance: Array<{ text: string; target_label?: string | null; lesson_id?: string | null }>;
}): { system: string; user: string } {
  const allowed = args.grammar
    .filter((g) => g.level <= args.lesson.level)
    .map((g) => `- ${g.slug} (level ${g.level}): ${g.title}`)
    .join('\n');
  const notes = args.guidance.length
    ? args.guidance
        .map((g) => `- ${g.text}${g.target_label || g.lesson_id ? ` (said about: ${[g.lesson_id, g.target_label].filter(Boolean).join(' · ')})` : ''}`)
        .join('\n')
    : '- (none yet)';
  const what =
    args.scope === 'item' && args.kind === 'word'
      ? `one word or expression inside a dialogue line (${args.targetLabel ?? 'word'}) — return it in "word" with the same "text"; the line is context only`
      : args.scope === 'item' && args.kind === 'vocab'
      ? `one vocabulary flashcard (${args.targetLabel ?? 'flashcard'}) — return it in "card"`
      : args.scope === 'dialogue'
      ? 'the WHOLE conversation (return every turn, in order, in "turns")'
      : args.scope === 'practice'
      ? 'the WHOLE practice session (return every item, in order, in "practice")'
      : args.kind === 'turn'
      ? `one dialogue turn (${args.targetLabel ?? 'turn'}) — return it in "turn"`
      : `one practice item (${args.targetLabel ?? 'item'}) — return it in "item"`;
  const system = `${HOUSE_RULES}\n\nGrammar allowed in this lesson (level ${args.lesson.level}):\n${allowed}\n\nTeam guidance notes from the Kabisa editors (follow these too; newer notes win):\n${notes}`;
  const user = [
    `Lesson: "${args.lesson.title}" (id ${args.lesson.id}, level ${args.lesson.level}).`,
    args.lesson.culturalNote ? `Context: ${args.lesson.culturalNote}` : '',
    args.lesson.startingPoint ? `Scene: ${args.lesson.startingPoint}` : '',
    args.lesson.grammarFocus?.length ? `Grammar focus: ${args.lesson.grammarFocus.join(', ')}` : '',
    args.lesson.vocabulary?.length
      ? `Key vocabulary: ${args.lesson.vocabulary.map((v) => `${v.swahili} = ${v.english}`).join('; ')}`
      : '',
    '',
    `You are revising ${what}. Current version (JSON):`,
    JSON.stringify(args.current, null, 1),
    '',
    `Editor's instruction: ${args.instruction}`,
  ]
    .filter((l) => l !== '')
    .join('\n');
  return { system, user };
}

// ---------- validation / normalisation ----------

const s = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');

function newId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `ai-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function idFor(raw: unknown, known: Set<string>, used: Set<string>): string {
  const id = s(raw);
  if (id && known.has(id) && !used.has(id)) {
    used.add(id);
    return id;
  }
  const fresh = newId();
  used.add(fresh);
  return fresh;
}

function normTurn(raw: Obj, prev: Map<string, Obj>, known: Set<string>, used: Set<string>, forceId?: string): Obj {
  const role = s(raw.role) === 'user' ? 'user' : 'auto';
  const swahili = s(raw.swahili);
  const english = s(raw.english);
  const speaker = s(raw.speaker);
  if (!swahili || !english || !speaker) throw new Error('A dialogue line is missing its Swahili, English or speaker.');
  const id = forceId ?? idFor(raw.id, known, used);
  const old = prev.get(id);
  let words = (Array.isArray(raw.words) ? (raw.words as Obj[]) : [])
    .map((w) => ({
      text: s(w.text),
      gloss: s(w.gloss),
      ...(s(w.sanifu) ? { sanifu: s(w.sanifu) } : {}),
      ...(s(w.note) ? { note: s(w.note) } : {}),
    }))
    .filter((w, i, all) => w.text && w.gloss && swahili.includes(w.text) && all.findIndex((x) => x.text === w.text) === i);
  // Same line as before: keep the richer compiled glosses (conjugation tables, grammar links).
  if (old && s(old.swahili) === swahili && Array.isArray(old.words)) words = old.words as typeof words;
  const turn: Obj = { id, speaker, role, swahili, english, words };
  const sanifu = s(raw.sanifu);
  if (sanifu && sanifu !== swahili) turn.sanifu = sanifu;
  const note = s(raw.note);
  if (note) turn.note = note;
  if (role === 'user') {
    const wrong = (Array.isArray(raw.options) ? (raw.options as Obj[]) : [])
      .map((o) => s(o.swahili))
      .filter((o, i, all) => o && o !== swahili && all.indexOf(o) === i)
      .slice(0, 2);
    // The AI often leaves the answer choices out when the instruction is about something
    // else (a note, Sanifu…): keep the existing wrong options then.
    if (wrong.length < 1 && old && Array.isArray(old.options)) {
      for (const o of old.options as Obj[]) {
        const w = s(o.swahili);
        if (o.correct !== true && w && w !== swahili && !wrong.includes(w)) wrong.push(w);
      }
    }
    if (wrong.length < 1) throw new Error(`The learner line "${swahili}" needs at least one wrong option.`);
    turn.options = [{ swahili, correct: true }, ...wrong.map((w) => ({ swahili: w, correct: false }))];
  }
  return turn;
}

function normPractice(raw: Obj, prev: Map<string, Obj>, known: Set<string>, used: Set<string>, forceId?: string): Obj {
  const mode = s(raw.mode) === 'complete' ? 'complete' : 'translate';
  const english = s(raw.english);
  const before = typeof raw.before === 'string' ? raw.before : '';
  const after = typeof raw.after === 'string' ? raw.after : '';
  const opts = (Array.isArray(raw.options) ? (raw.options as Obj[]) : []).map((o) => ({
    text: s(o.text),
    correct: o.correct === true,
    feedback: s(o.feedback),
  }));
  const right = opts.find((o) => o.correct && o.text);
  if (!english || !right) throw new Error('A practice item is missing its English prompt or correct answer.');
  const wrong = opts.filter((o, i) => !o.correct && o.text && o.text !== right.text && opts.findIndex((x) => x.text === o.text) === i).slice(0, 2);
  const prevItem = prev.get(s(raw.id)) ?? (forceId ? prev.get(forceId) : undefined);
  if (!wrong.length && prevItem && Array.isArray(prevItem.options)) {
    for (const o of prevItem.options as Obj[]) {
      const w = s(o.text);
      if (o.correct !== true && w && w !== right.text) wrong.push({ text: w, correct: false, feedback: s(o.feedback) });
    }
  }
  if (!wrong.length) throw new Error(`The practice item "${english}" needs at least one wrong option.`);
  const id = forceId ?? idFor(raw.id, known, used);
  const item: Obj = {
    id,
    mode,
    english,
    before,
    after,
    options: [right, ...wrong].map((o) => ({ text: o.text, correct: o.correct, ...(o.feedback ? { feedback: o.feedback } : {}) })),
    explanation: s(raw.explanation) || `${right.text}.`,
  };
  const old = prev.get(id);
  if (old && Array.isArray(old.grammar)) item.grammar = old.grammar;
  return item;
}

function indexById(list: unknown): Map<string, Obj> {
  const m = new Map<string, Obj>();
  if (Array.isArray(list)) for (const x of list as Obj[]) if (typeof x?.id === 'string') m.set(x.id, x);
  return m;
}

/** Validates Claude's JSON and returns { summary, value } ready to store as a content_patch. */
export function normalizeResult(
  scope: AiScope,
  kind: ItemKind | null,
  raw: unknown,
  current: unknown,
  itemId?: string,
): { summary: string; value: unknown } {
  if (!raw || typeof raw !== 'object') throw new Error('The AI returned no usable content.');
  const r = raw as Obj;
  const summary = s(r.summary) || 'Updated.';
  if (scope === 'dialogue') {
    const prev = indexById(current);
    const used = new Set<string>();
    const turns = (Array.isArray(r.turns) ? (r.turns as Obj[]) : []).map((t) => normTurn(t, prev, new Set(prev.keys()), used));
    if (turns.length < 2) throw new Error('The rewritten conversation is too short.');
    if (!turns.some((t) => t.role === 'user')) throw new Error('The rewritten conversation has no learner lines.');
    return { summary, value: turns };
  }
  if (scope === 'practice') {
    const prev = indexById(current);
    const used = new Set<string>();
    const items = (Array.isArray(r.practice) ? (r.practice as Obj[]) : []).map((p) => normPractice(p, prev, new Set(prev.keys()), used));
    if (items.length < 3) throw new Error('The rewritten practice session is too short.');
    return { summary, value: items };
  }
  if (!itemId) throw new Error('Missing item id.');
  if (kind === 'word') {
    const cur = ((current as Obj | null)?.word ?? {}) as Obj;
    const w = (r.word ?? {}) as Obj;
    const text = s(cur.text) || s(w.text);
    if (!text) throw new Error('Missing the word being edited.');
    // Fields always present: an empty string clears it when the patch is applied.
    return { summary, value: { text, gloss: s(w.gloss) || s(cur.gloss) || text, sanifu: s(w.sanifu), note: s(w.note) } };
  }
  if (kind === 'vocab') {
    const cur = (current ?? {}) as Obj;
    const c = (r.card ?? {}) as Obj;
    const swahili = s(c.swahili) || s(cur.swahili);
    const english = s(c.english) || s(cur.english);
    if (!swahili || !english) throw new Error('The flashcard is missing its Swahili or English.');
    return {
      summary,
      value: {
        swahili,
        english,
        exampleContext: s(c.exampleContext) || s(cur.exampleContext),
        sanifu: s(c.sanifu),
        sanifuNote: s(c.sanifu) ? s(c.sanifuNote) : '',
        note: s(c.note),
      },
    };
  }
  const prev = new Map<string, Obj>([[itemId, (current ?? {}) as Obj]]);
  const value =
    kind === 'turn'
      ? normTurn((r.turn ?? {}) as Obj, prev, new Set([itemId]), new Set(), itemId)
      : normPractice((r.item ?? {}) as Obj, prev, new Set([itemId]), new Set(), itemId);
  return { summary, value };
}

/** Pulls the JSON object out of a Messages API response body. */
export function parseClaudeJson(body: unknown): unknown {
  const b = body as { content?: Array<{ type: string; text?: string }>; stop_reason?: string };
  if (b?.stop_reason === 'refusal') throw new Error('The AI declined this edit.');
  if (b?.stop_reason === 'max_tokens') throw new Error('The AI ran out of room — try a narrower instruction.');
  const text = b?.content?.find((c) => c.type === 'text')?.text;
  if (!text) throw new Error('The AI returned no text.');
  try {
    return JSON.parse(text);
  } catch {
    const m = text.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]);
    throw new Error('The AI returned invalid JSON.');
  }
}
