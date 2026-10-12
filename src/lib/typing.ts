import type { AcceptedAnswer, DialogueTurn, WordGloss } from '../types';

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

export type { AcceptedAnswer };

/** Typos allowed: none for short answers, then roughly one per 10 characters. */
function allowance(len: number): number {
  if (len < 5) return 0;
  return Math.max(1, Math.floor(len / 10));
}

// Spelling / everyday variants accepted everywhere, each with the line that explains it.
const RULES: Array<{ from: RegExp; to: string; note: string }> = [
  { from: /^ndio$/, to: 'ndiyo', note: 'Ndio and ndiyo are the same word — both spellings are fine.' },
  { from: /^au$/, to: 'ama', note: 'Ama and au both mean “or” — Kenyans mostly say ama.' },
  { from: /^(nyingi|mengi)$/, to: 'mingi', note: 'Kenyans say mingi; nyingi / mengi are the standard forms — all are understood.' },
  { from: /^nina([a-z']{3,})$/, to: 'na$1', note: 'Na- is the everyday short form of nina- (naenda = ninaenda) — both are right.' },
];

/** The answer with everyday variants folded together (naenda = ninaenda, ndio = ndiyo…). */
export function canonicalAnswer(s: string): string {
  return normalizeAnswer(s)
    .split(' ')
    .map((w) => RULES.reduce((x, r) => (r.from.test(x) ? x.replace(r.from, r.to) : x), w))
    .join(' ');
}

/** Notes for the everyday variants where `typed` differs from `answer` (e.g. naenda vs ninaenda). */
function variantNotes(typed: string, answer: string): string[] {
  const a = normalizeAnswer(typed).split(' ');
  const b = normalizeAnswer(answer).split(' ');
  if (a.length !== b.length) return [];
  const notes: string[] = [];
  a.forEach((w, i) => {
    if (w === b[i]) return;
    for (const r of RULES) if ((r.from.test(w) || r.from.test(b[i])) && !notes.includes(r.note)) notes.push(r.note);
  });
  return notes;
}

export interface CheckResult {
  verdict: Verdict;
  /** The accepted answer it matched (the first one when wrong). */
  expected: string;
  /** Index of that answer in the accepted list. */
  index: number;
}

/** Compares what the learner typed with every accepted answer. */
export function checkAnswer(typed: string, accepted: Array<string | AcceptedAnswer | undefined>): CheckResult {
  const t = normalizeAnswer(typed);
  const tc = canonicalAnswer(typed);
  const answers = accepted.map((a) => (typeof a === 'string' ? a : a?.text ?? ''));
  const first = answers.findIndex((a) => a.trim());
  const none: CheckResult = { verdict: 'wrong', expected: answers[first] ?? '', index: Math.max(0, first) };
  if (!t) return none;
  let best = none;
  for (const [i, a] of answers.entries()) {
    if (!a.trim()) continue;
    const n = normalizeAnswer(a);
    if (n === t || canonicalAnswer(a) === tc) return { verdict: 'exact', expected: a, index: i };
    if (levenshtein(n, t) <= allowance(n.length) && best.verdict === 'wrong') best = { verdict: 'close', expected: a, index: i };
  }
  return best;
}

const quote = (s: string) => `“${s}”`;

/**
 * What to say when a typed answer is accepted and there is more than one right way to say it:
 * "You chose “mwambie”! Good — both “mwambie” and “umwambie” work. …". Null when there's
 * nothing to add (only one accepted answer, typed exactly).
 */
export function affirmation(typed: string, answers: AcceptedAnswer[], index: number, whole = false): string | null {
  const chosen = answers[index];
  if (!chosen) return null;
  const others = answers.filter((a, i) => i !== index && a.text.trim() && normalizeAnswer(a.text) !== normalizeAnswer(chosen.text));
  const variants = variantNotes(typed, chosen.text);
  const note = chosen.note ?? (index === 0 ? others.find((o) => o.note)?.note : undefined);
  if (!others.length && !variants.length && !note) return null;
  const parts: string[] = [];
  const said = variants.length ? typed.trim() : chosen.text;
  if (whole) {
    parts.push(others.length ? 'Good — that works.' : 'Good.');
    if (index !== 0) parts.push(`The conversation says ${quote(answers[0].text)}.`);
  } else if (others.length === 1) {
    parts.push(`You chose ${quote(said)}! Good — both ${quote(said)} and ${quote(others[0].text)} work.`);
  } else if (others.length > 1) {
    parts.push(`You chose ${quote(said)}! Good — ${others.map((o) => quote(o.text)).join(', ')} work too.`);
  } else {
    parts.push(`You chose ${quote(said)}! Good.`);
  }
  if (note) parts.push(note);
  parts.push(...variants);
  return parts.join(' ');
}

/** "umwambie | the polite form" lines (admin field) ⇄ accepted answers. */
export function parseAccepted(text: string): AcceptedAnswer[] {
  return text
    .split('\n')
    .map((line) => {
      const [answer, ...rest] = line.split('|');
      const note = rest.join('|').trim();
      return { text: answer.trim(), ...(note ? { note } : {}) };
    })
    .filter((a) => a.text);
}

export function formatAccepted(list: AcceptedAnswer[] | undefined): string {
  return (list ?? []).map((a) => (a.note ? `${a.text} | ${a.note}` : a.text)).join('\n');
}

const wordCount = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

/**
 * Accepted answers in the form the learner types, main answer first.
 * `alts` may hold whole lines ("Naomba mwambie anipigie…") or just the word that changes
 * ("mwambie"); either works in both modes:
 *  - partial (type the gap word): a whole-line alternative yields the word at the gap's place
 *    when that is all that differs; a word alternative is used as is.
 *  - complete (type the line): a word alternative is put into the line at the gap's place.
 */
export function acceptedAnswers(args: {
  line: string;
  /** The gap / key word's place in the line. */
  span: { start: number; end: number } | null;
  mode: TypingMode;
  alts?: AcceptedAnswer[];
  /** More accepted whole lines, e.g. the Sanifu form. */
  extraLines?: AcceptedAnswer[];
}): AcceptedAnswer[] {
  const { line, span, mode } = args;
  const word = span ? line.slice(span.start, span.end) : '';
  const out: AcceptedAnswer[] = [];
  const push = (a: AcceptedAnswer) => {
    if (a.text.trim() && !out.some((o) => normalizeAnswer(o.text) === normalizeAnswer(a.text))) out.push(a);
  };
  if (mode === 'partial' && span) push({ text: word });
  else push({ text: line });
  for (const alt of [...(args.alts ?? []), ...(mode === 'complete' ? args.extraLines ?? [] : [])]) {
    const isWord = span ? wordCount(alt.text) <= wordCount(word) + 1 && wordCount(line) > wordCount(word) + 1 : false;
    if (mode === 'partial' && span) {
      if (isWord) push(alt);
      else {
        const before = line.slice(0, span.start);
        const after = line.slice(span.end);
        const t = alt.text;
        if (t.startsWith(before) && t.endsWith(after) && t.length > before.length + after.length)
          push({ ...alt, text: t.slice(before.length, t.length - after.length) });
      }
    } else if (isWord && span) {
      push({ ...alt, text: line.slice(0, span.start) + alt.text + line.slice(span.end) });
    } else {
      push(alt);
    }
  }
  return out;
}

const TOKEN = /[\p{L}\p{N}'’-]+/gu;

/** Words never worth typing on their own: greetings, fillers, addresses, tiny linkers. */
const NOT_KEY = new Set(
  'aah aaah aiii ah eh haha haya wee sawa poa safi ndiyo ndio hapana asante asanteni tafadhali habari mambo karibu kweli kumbe afande boss bwana mama dada sista basi pole na ni kwa ya wa za la si tu pia sana mimi wewe yeye sisi nyinyi wao ok okay'.split(' '),
);
const LIGHT_GRAMMAR = new Set(['discourse-particles', 'greetings', 'subject-prefixes', 'ni-copula', 'noun-classes-mwa-nn']);

/**
 * The word to blank out in "partial" mode: an admin's choice; else a word that shows the
 * lesson's grammar focus; else a verb (a gloss with a conjugation table); else a word linked to
 * a grammar topic; else the longest word — never a greeting, filler or form of address.
 * Returns its exact text and position in the line.
 */
export function pickKeyWord(
  turn: Pick<DialogueTurn, 'swahili' | 'words' | 'typeWord'>,
  focus: string[] = [],
): { text: string; start: number } | null {
  // An admin's choice wins when it is (still) in the line.
  const chosen = turn.typeWord?.trim();
  if (chosen) {
    const at = turn.swahili.indexOf(chosen);
    if (at !== -1) return { text: chosen, start: at };
  }
  const tokens = [...turn.swahili.matchAll(TOKEN)].map((m) => ({ text: m[0], start: m.index ?? 0 }));
  if (!tokens.length) return null;
  const glossFor = (w: string): WordGloss | undefined =>
    turn.words.find((g) => g.text.toLowerCase() === w.toLowerCase());
  const usable = tokens.filter((t) => t.text.length >= 3 && !NOT_KEY.has(t.text.toLowerCase()));
  const pool = usable.length ? usable : tokens;
  const grammarOf = (t: { text: string }) => glossFor(t.text)?.grammar ?? [];
  const focused = pool.find((t) => grammarOf(t).some((g) => focus.includes(g) && !LIGHT_GRAMMAR.has(g)));
  if (focused) return focused;
  const verb = pool.find((t) => glossFor(t.text)?.conjugation);
  if (verb) return verb;
  const graded = pool.find((t) => grammarOf(t).some((g) => !LIGHT_GRAMMAR.has(g)));
  if (graded) return graded;
  return pool.reduce((a, b) => (b.text.length > a.text.length ? b : a));
}
