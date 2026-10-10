// -------- After a conversation is rewritten: bring its key vocabulary, flashcards and practice in line --------
//
// When an admin asks the AI to extend or change a whole conversation (✨ Direct this conversation),
// api/ai-edit.ts hands the new conversation to api/ai-sync.ts. Claude then reviews the lesson's key
// vocabulary (which is also its flashcard deck) and its practice session against the new lines:
// keeps what still fits, fixes wording that changed, adds the important new words and verb forms,
// drops what no longer appears. Pure functions shared by the API and tests.

import { HOUSE_RULES, normalizeResult, practiceSchema, type AiLessonContext, type GrammarRef } from './aiPatch.js';
import { normVocabulary, vocabItemSchema } from './aiLesson.js';

type Obj = Record<string, unknown>;

export interface SyncInput {
  lesson: AiLessonContext;
  /** What the editor asked for (context for the review). */
  instruction: string;
  /** The conversation as it is now (after the rewrite). */
  turns: Obj[];
  vocabulary: Obj[];
  practice: Obj[];
}

export function syncSchema(): Obj {
  return {
    type: 'object',
    properties: {
      summary: { type: 'string' },
      vocabulary: { type: 'array', items: vocabItemSchema },
      practice: { type: 'array', items: practiceSchema },
    },
    required: ['summary', 'vocabulary', 'practice'],
    additionalProperties: false,
  };
}

export const SYNC_RULES = `The lesson's conversation was just rewritten. Review its KEY VOCABULARY (also the learner's flashcards) and its PRACTICE SESSION so both match the new conversation:
- Keep every vocabulary entry and practice item that still fits, unchanged and with its "id".
- Fix entries / items whose wording no longer matches the conversation (keep their "id").
- Add entries for the important new words, phrases and verb forms the new lines introduce, and practice items that drill them (no "id" for new ones).
- Remove entries and items about words that are no longer in the conversation.
- Vocabulary: 8–16 entries. Nouns get "nounForms" (Swahili singular / plural) and "englishForms" (English singular / plural); "" for a form that doesn't exist. Keep any existing "sanifu", "sanifuNote" and "note" exactly as they are.
- Practice: 12–24 items, built from the conversation's lines.
- Return the COMPLETE lists. "summary": one sentence on what you changed in each.`;

export function buildSyncPrompt(input: SyncInput, grammar: GrammarRef[], guidance: Array<{ text: string }>): { system: string; user: string } {
  const allowed = grammar
    .filter((g) => g.level <= input.lesson.level)
    .map((g) => `- ${g.slug} (level ${g.level}): ${g.title}`)
    .join('\n');
  const rules = guidance.length ? guidance.map((g) => `- ${g.text}`).join('\n') : '- (none yet)';
  const system = `${HOUSE_RULES}\n\n${SYNC_RULES}\n\nGrammar allowed in this lesson (level ${input.lesson.level}):\n${allowed}\n\nStyle guide and notes from the Kabisa editors (follow these too; newer win):\n${rules}`;
  const lines = input.turns.map((t) => `${String(t.speaker)}: ${String(t.swahili)} — ${String(t.english)}`).join('\n');
  const user = [
    `Lesson: "${input.lesson.title}" (id ${input.lesson.id}, level ${input.lesson.level}).`,
    `The editor asked for the conversation: ${input.instruction}`,
    '',
    'The NEW conversation:',
    lines,
    '',
    'Current key vocabulary (JSON):',
    JSON.stringify(input.vocabulary),
    '',
    'Current practice session (JSON):',
    JSON.stringify(input.practice),
  ].join('\n');
  return { system, user };
}

/** Validates Claude's review: the practice list (ids kept where they match) and the vocabulary. */
export function normalizeSync(raw: unknown, input: SyncInput): { summary: string; vocabulary: Obj[]; practice: Obj[] } {
  if (!raw || typeof raw !== 'object') throw new Error('The AI returned nothing for the vocabulary and practice.');
  const r = raw as Obj;
  const practice = normalizeResult('practice', null, { summary: 'x', practice: r.practice }, input.practice).value as Obj[];
  const vocabulary = normVocabulary(r.vocabulary, input.vocabulary);
  if (vocabulary.length < 4) throw new Error('The reviewed key vocabulary is too short.');
  const summary = typeof r.summary === 'string' && r.summary.trim() ? r.summary.trim() : 'Key vocabulary and practice updated to match the conversation.';
  return { summary, vocabulary, practice };
}
