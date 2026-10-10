// -------- ✨ New lessons written by the AI at an admin's request --------
//
// An admin picks a level and describes a lesson ("Buying airtime at an M-Pesa kiosk…").
// api/ai-lesson.ts sends this to Claude with the house rules, the grammar allowed at that level,
// the style guide and the level's existing lessons (so it doesn't repeat them); the answer is
// validated here and stored in ai_lesson, which every learner's app loads on top of the bundled
// lessons. Pure functions shared by the API and tests.

import { HOUSE_RULES, normalizeResult, practiceSchema, turnSchema, type GrammarRef } from './aiPatch.js';

type Obj = Record<string, unknown>;

export interface NewLessonInput {
  level: number;
  levelName: string;
  levelFocus: string;
  /** Where it goes in the list (after the level's last lesson). */
  order: number;
  prompt: string;
  /** The level's lessons now, so the new one adds something different. */
  existing: Array<{ title: string; theme?: string; vocabulary: string[] }>;
}

const CATEGORIES = ['transport', 'food-drink', 'commerce', 'health', 'work-admin', 'social', 'home', 'people', 'time', 'weather', 'directions', 'numbers'];
const POS = ['noun', 'verb', 'adjective', 'possessive', 'phrase', 'other'];

const str = { type: 'string' } as const;
const forms = { type: 'object', properties: { one: str, many: str }, required: ['one', 'many'], additionalProperties: false };

export const vocabItemSchema = {
  type: 'object',
  properties: {
    id: str,
    swahili: str,
    english: str,
    exampleContext: str,
    partOfSpeech: { type: 'string', enum: ['noun', 'verb', 'adjective', 'possessive', 'phrase', 'other'] },
    nounForms: forms,
    englishForms: forms,
    sanifu: str,
    sanifuNote: str,
    note: str,
  },
  required: ['swahili', 'english', 'exampleContext', 'partOfSpeech'],
  additionalProperties: false,
};

export function lessonSchema(): Obj {
  return {
    type: 'object',
    properties: {
      summary: str,
      title: str,
      theme: str,
      category: { type: 'string', enum: CATEGORIES },
      culturalNote: str,
      startingPoint: str,
      grammarFocus: { type: 'array', items: str },
      turns: { type: 'array', items: turnSchema },
      practice: { type: 'array', items: practiceSchema },
      vocabulary: { type: 'array', items: vocabItemSchema },
    },
    required: ['summary', 'title', 'theme', 'category', 'culturalNote', 'startingPoint', 'grammarFocus', 'turns', 'practice', 'vocabulary'],
    additionalProperties: false,
  };
}

export const LESSON_RULES = `Write ONE complete new lesson for the level below, following the editor's request.

A lesson has:
- "title": short and concrete ("Buying Airtime at the Kiosk").
- "theme": one lowercase word for the recurring scenario (e.g. uber, market, food, home, work, health, transport, friends, directions, school, travel, weather, kitchen, police, sports, safari, community, news, routine, car, people, greetings).
- "culturalNote": 3–5 sentences of real-life Kenyan context a newcomer needs, quoting key Swahili.
- "startingPoint": one line setting the scene ("You walk up to a kiosk near your stage.").
- "grammarFocus": 1–3 grammar slugs from the allowed list that the lesson practises.
- "turns": a natural conversation of 10–14 lines, alternating between the learner (role "user", a speaker label like "Wewe", "Mteja" or "Abiria") and one other person (role "auto"). The learner speaks about half the lines; the first line is usually the learner's. Every line has "words" glosses and every learner line its 3 "options".
- "practice": 12–16 fill-the-gap items built from the conversation's words and verb forms (mix "translate" and "complete").
- "vocabulary": 8–12 key words and phrases from the conversation. Nouns get "nounForms" (Swahili singular / plural) and "englishForms" (English singular / plural); use "" for a form that doesn't exist (no plural / plural only). Leave out nounForms / englishForms for anything that isn't a noun. "exampleContext" is one short usage line.
- "summary": one sentence describing the lesson.
Use only Swahili a Nairobi speaker would really say, at this level's difficulty.`;

export function buildLessonPrompt(input: NewLessonInput, grammar: GrammarRef[], guidance: Array<{ text: string }>): { system: string; user: string } {
  const allowed = grammar
    .filter((g) => g.level <= input.level)
    .map((g) => `- ${g.slug} (level ${g.level}): ${g.title}`)
    .join('\n');
  const rules = guidance.length ? guidance.map((g) => `- ${g.text}`).join('\n') : '- (none yet)';
  const system = `${HOUSE_RULES}\n\n${LESSON_RULES}\n\nGrammar allowed at level ${input.level}:\n${allowed}\n\nStyle guide and notes from the Kabisa editors (follow these too; newer win):\n${rules}`;
  const user = [
    `Level ${input.level} · ${input.levelName} — focus: ${input.levelFocus}`,
    input.existing.length
      ? `Lessons already in this level (make the new one different; you may reuse their words for revision):\n${input.existing
          .map((e) => `- ${e.title}${e.theme ? ` (${e.theme})` : ''}: ${e.vocabulary.slice(0, 15).join(', ')}`)
          .join('\n')}`
      : '',
    '',
    `Editor's request: ${input.prompt}`,
  ]
    .filter(Boolean)
    .join('\n');
  return { system, user };
}

const s = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');

function slugify(t: string): string {
  return t
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 40);
}

const uuid = () => globalThis.crypto?.randomUUID?.() ?? `ai-${Date.now()}-${Math.random().toString(36).slice(2)}`;

function normForms(v: unknown): { one: string | null; many: string | null } | undefined {
  if (!v || typeof v !== 'object') return undefined;
  const one = s((v as Obj).one) || null;
  const many = s((v as Obj).many) || null;
  return one || many ? { one, many } : undefined;
}

/**
 * Key vocabulary (= the flashcards) from Claude. Entries whose "id" matches a current card keep
 * that id (so learners' flashcard progress stays attached); new ones get a fresh id. Only nouns
 * carry singular / plural forms.
 */
export function normVocabulary(list: unknown, current: Obj[] = []): Obj[] {
  const known = new Map(current.filter((c) => typeof c.id === 'string').map((c) => [c.id as string, c]));
  const used = new Set<string>();
  return (Array.isArray(list) ? (list as Obj[]) : [])
    .map((v) => {
      const swahili = s(v.swahili);
      const english = s(v.english);
      if (!swahili || !english) return null;
      const pos = POS.includes(s(v.partOfSpeech)) ? s(v.partOfSpeech) : 'phrase';
      const nounForms = pos === 'noun' ? normForms(v.nounForms) : undefined;
      const englishForms = nounForms ? normForms(v.englishForms) : undefined;
      const keep = known.has(s(v.id)) && !used.has(s(v.id)) ? s(v.id) : '';
      if (keep) used.add(keep);
      return {
        id: keep || uuid(),
        swahili,
        english,
        exampleContext: s(v.exampleContext),
        partOfSpeech: pos,
        ...(nounForms ? { nounForms } : {}),
        ...(englishForms ? { englishForms } : {}),
        ...(s(v.sanifu) && s(v.sanifu) !== swahili ? { sanifu: s(v.sanifu) } : {}),
        ...(s(v.sanifu) && s(v.sanifuNote) ? { sanifuNote: s(v.sanifuNote) } : {}),
        ...(s(v.note) ? { note: s(v.note) } : {}),
      } as Obj;
    })
    .filter((v): v is Obj => Boolean(v));
}

/** Validates Claude's lesson and returns it ready to store (same shape as content/lessons/*.json). */
export function normalizeLesson(raw: unknown, input: NewLessonInput, grammarSlugs: Set<string>, id?: string): { summary: string; lesson: Obj } {
  if (!raw || typeof raw !== 'object') throw new Error('The AI returned no lesson.');
  const r = raw as Obj;
  const title = s(r.title);
  if (!title) throw new Error('The new lesson has no title.');
  const turns = normalizeResult('dialogue', null, { summary: 'x', turns: r.turns }, []).value as Obj[];
  if (turns.length < 6) throw new Error('The new conversation is too short.');
  const practice = normalizeResult('practice', null, { summary: 'x', practice: r.practice }, []).value as Obj[];
  const vocabulary = normVocabulary(r.vocabulary);
  if (vocabulary.length < 4) throw new Error('The new lesson needs more key vocabulary.');
  const grammarFocus = (Array.isArray(r.grammarFocus) ? (r.grammarFocus as unknown[]) : []).map(s).filter((g) => grammarSlugs.has(g)).slice(0, 3);
  const lesson: Obj = {
    id: id ?? `${slugify(title) || 'lesson'}-${Math.random().toString(36).slice(2, 6)}`,
    uuid: uuid(),
    title,
    category: CATEGORIES.includes(s(r.category)) ? s(r.category) : 'social',
    difficulty: input.level <= 4 ? 'beginner' : input.level <= 7 ? 'medium' : 'advanced',
    level: input.level,
    order: input.order,
    ...(s(r.theme) ? { theme: s(r.theme).toLowerCase() } : {}),
    grammarFocus,
    grammar: grammarFocus,
    culturalNote: s(r.culturalNote),
    startingPoint: s(r.startingPoint),
    turns,
    vocabulary,
    practice,
  };
  return { summary: s(r.summary) || `New lesson: ${title}.`, lesson };
}
