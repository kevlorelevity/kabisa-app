import type { DialogueTurn, WordGloss } from '../types';

// -------- Typed answers (levels 5+) --------
//
// From level 5 the learner types instead of picking:
//   levels 5–7  "partial"  — one key word of the line (or the practice gap)
//   levels 8–10 "complete" — the whole line / sentence, from the English
// Matching forgives capitals, punctuation, apostrophe styles and a small typo,
// and accepts the Sanifu form when the lesson gives one.

export type TypingMode = 'partial' | 'complete';

export const TYPING_FROM_LEVEL = 5;
export const COMPLETE_FROM_LEVEL = 8;

export function typingModeFor(level: number | undefined): TypingMode | undefined {
  if (!level || level < TYPING_FROM_LEVEL) return undefined;
  return level >= COMPLETE_FROM_LEVEL ? 'complete' : 'partial';
}

export function normalizeAnswer(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’‘`´]/g, "'")
    .replace(/[^\p{L}\p{N}'\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[b.length];
}

export type Verdict = 'exact' | 'close' | 'wrong';

/** Typos allowed: none for short answers, then roughly one per 10 characters. */
function allowance(len: number): number {
  if (len < 5) return 0;
  return Math.max(1, Math.floor(len / 10));
}

/** Compares what the learner typed with every accepted answer. */
export function checkAnswer(typed: string, accepted: Array<string | undefined>): { verdict: Verdict; expected: string } {
  const t = normalizeAnswer(typed);
  const answers = accepted.filter((a): a is string => Boolean(a && a.trim()));
  if (!t) return { verdict: 'wrong', expected: answers[0] ?? '' };
  let best: { verdict: Verdict; expected: string } = { verdict: 'wrong', expected: answers[0] ?? '' };
  for (const a of answers) {
    const n = normalizeAnswer(a);
    if (n === t) return { verdict: 'exact', expected: a };
    if (levenshtein(n, t) <= allowance(n.length) && best.verdict === 'wrong') best = { verdict: 'close', expected: a };
  }
  return best;
}

const TOKEN = /[\p{L}\p{N}'’-]+/gu;

/**
 * The word to blank out in "partial" mode: prefer a verb (a gloss with a
 * conjugation table), then any word linked to a grammar topic, then the
 * longest word. Returns its exact text and position in the line.
 */
export function pickKeyWord(turn: Pick<DialogueTurn, 'swahili' | 'words'>): { text: string; start: number } | null {
  const tokens = [...turn.swahili.matchAll(TOKEN)].map((m) => ({ text: m[0], start: m.index ?? 0 }));
  if (!tokens.length) return null;
  const glossFor = (w: string): WordGloss | undefined =>
    turn.words.find((g) => g.text.toLowerCase() === w.toLowerCase());
  const usable = tokens.filter((t) => t.text.length >= 3);
  const pool = usable.length ? usable : tokens;
  const verb = pool.find((t) => glossFor(t.text)?.conjugation);
  if (verb) return verb;
  const graded = pool.find((t) => (glossFor(t.text)?.grammar ?? []).length > 0);
  if (graded) return graded;
  return pool.reduce((a, b) => (b.text.length > a.text.length ? b : a));
}
