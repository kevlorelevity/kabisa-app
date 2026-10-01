import type { Lesson, PracticeItem, WordGloss } from '../types';

// -------- Adaptive drill (Pimsleur-style) --------
//
// When a learner keeps missing lines, the drill rebuilds those phrases into
// new practice using three Pimsleur techniques:
//
//  1. Backward build-up — a long phrase is heard and repeated from the END
//     forward ("Westlands." → "naenda Westlands." → "Mimi naenda Westlands."),
//     so the learner always finishes on familiar sounds.
//  2. Anticipation — the English cue comes first, the learner says the
//     Swahili out loud BEFORE the answer is revealed and played.
//  3. Graduated interval recall — each phrase comes back after 1, then 3,
//     then 6 other cards; a miss resets it to a fresh build-up.
//
// On top of that, every phrase gets generated gap "variations": a different
// word blanked each time, with distractors drawn from that word's own
// conjugation table or from the lesson's vocabulary. No content is invented
// beyond the lesson itself — every Swahili sentence shown is an authored one.

export interface DrillPhrase {
  source: 'turn' | 'practice';
  sourceId: string;
  swahili: string;
  english: string;
}

export interface GapVariation {
  before: string;
  answer: string;
  after: string;
  /** Includes the answer. Shuffled at render time. */
  options: string[];
}

export type DrillCard =
  | { kind: 'buildup'; phrase: number }
  | { kind: 'recall'; phrase: number }
  | { kind: 'gap'; phrase: number; variation: number };

/** Cards to wait before a correctly recalled phrase reappears, by level reached. */
export const RECALL_INTERVALS = [1, 3, 6];
/** Correct recalls needed (spaced by RECALL_INTERVALS) to master a phrase. */
export const MASTERY_LEVEL = RECALL_INTERVALS.length;
/** Max phrases per drill, so a session stays short. */
export const MAX_DRILL_PHRASES = 8;
/** Hard stop so a run of misses can't loop forever. */
export const MAX_DRILL_CARDS = 80;

/** Full Swahili sentence for a practice item (its gap filled with the right chip). */
export function practiceSentence(item: PracticeItem): string {
  const answer = item.options.find((o) => o.correct)?.text ?? '';
  return `${item.before}${answer}${item.after}`.trim();
}

/** Turns the learner's weak ids into drill phrases (capped, in lesson order). */
export function collectPhrases(
  lesson: Lesson,
  weakTurns: string[],
  weakPractice: string[],
): DrillPhrase[] {
  const out: DrillPhrase[] = [];
  const seen = new Set<string>();
  const add = (p: DrillPhrase) => {
    const k = p.swahili.toLowerCase();
    if (seen.has(k)) return;
    seen.add(k);
    out.push(p);
  };
  for (const t of lesson.turns) {
    if (weakTurns.includes(t.id)) {
      add({ source: 'turn', sourceId: t.id, swahili: t.swahili, english: t.english });
    }
  }
  for (const p of lesson.practice ?? []) {
    if (weakPractice.includes(p.id)) {
      add({ source: 'practice', sourceId: p.id, swahili: practiceSentence(p), english: p.english });
    }
  }
  return out.slice(0, MAX_DRILL_PHRASES);
}

/** Phrases for an optional full-lesson drill: every learner line in the conversation. */
export function allLearnerPhrases(lesson: Lesson): DrillPhrase[] {
  return lesson.turns
    .filter((t) => t.role === 'user')
    .slice(0, MAX_DRILL_PHRASES)
    .map((t) => ({ source: 'turn', sourceId: t.id, swahili: t.swahili, english: t.english }));
}

/** Backward build-up steps, ending on the whole phrase. */
export function buildUpSteps(swahili: string): string[] {
  const tokens = swahili.trim().split(/\s+/);
  const n = tokens.length;
  if (n <= 2) return [swahili.trim()];
  const sizes =
    n <= 4
      ? Array.from({ length: n }, (_, i) => i + 1)
      : [...new Set([2, Math.ceil(n / 2), n])];
  return sizes.map((s) => tokens.slice(n - s).join(' '));
}

// ---- gap variations ----

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Index of `word` in `sentence` as a whole word (case-insensitive), or -1. */
function findWord(sentence: string, word: string): number {
  const re = new RegExp(`(^|[^\\p{L}])(${escapeRe(word)})(?=$|[^\\p{L}])`, 'iu');
  const m = re.exec(sentence);
  return m ? m.index + m[1].length : -1;
}

function matchCase(target: string, model: string): string {
  if (!target) return target;
  const upper = model[0] === model[0].toUpperCase() && model[0] !== model[0].toLowerCase();
  return upper ? target[0].toUpperCase() + target.slice(1) : target;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function uniqueCI(list: string[], exclude: string[]): string[] {
  const banned = new Set(exclude.map((s) => s.toLowerCase()));
  const out: string[] = [];
  for (const s of list) {
    const k = s.toLowerCase();
    if (banned.has(k)) continue;
    banned.add(k);
    out.push(s);
  }
  return out;
}

/** Every glossed word in the lesson — the pool both blanks and distractors come from. */
function glossPool(lesson: Lesson): WordGloss[] {
  const pool: WordGloss[] = [];
  const seen = new Set<string>();
  for (const t of lesson.turns) {
    for (const w of t.words) {
      const k = w.text.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      pool.push(w);
    }
  }
  return pool;
}

function distractorsFor(word: WordGloss, sentence: string, lesson: Lesson, pool: WordGloss[]): string[] {
  const answer = word.text;
  // 1. Same verb, other persons — the most useful contrast (naenda vs unaenda).
  if (word.conjugation) {
    const forms = uniqueCI(word.conjugation.rows.map((r) => r.form), [answer]);
    if (forms.length >= 2) return shuffle(forms).slice(0, 2).map((f) => matchCase(f, answer));
  }
  // 2. Authored wrong chips from a practice item that tests the same word.
  for (const p of lesson.practice ?? []) {
    const right = p.options.find((o) => o.correct)?.text ?? '';
    if (right.toLowerCase() === answer.toLowerCase()) {
      const wrong = uniqueCI(p.options.filter((o) => !o.correct).map((o) => o.text), [answer]);
      if (wrong.length >= 1) return wrong.slice(0, 2).map((f) => matchCase(f, answer));
    }
  }
  // 3. Other glossed words of a similar length that aren't already in the sentence.
  const words = answer.split(/\s+/).length;
  const candidates = uniqueCI(
    pool
      .map((w) => w.text)
      .filter((t) => Math.abs(t.split(/\s+/).length - words) <= 1)
      .filter((t) => findWord(sentence, t) === -1),
    [answer],
  );
  return shuffle(candidates).slice(0, 2).map((f) => matchCase(f, answer));
}

/** Generates up to `max` gap variations of a phrase, each blanking a different word. */
export function gapVariations(phrase: DrillPhrase, lesson: Lesson, max = 3): GapVariation[] {
  const pool = glossPool(lesson);
  const sentence = phrase.swahili;
  const bare = sentence.replace(/[^\p{L}\s]/gu, '').trim().toLowerCase();

  // For a practice item, prefer blanks OTHER than the one it already tested.
  let originalAnswer = '';
  if (phrase.source === 'practice') {
    const item = lesson.practice?.find((p) => p.id === phrase.sourceId);
    originalAnswer = item?.options.find((o) => o.correct)?.text.toLowerCase() ?? '';
  }

  const variations: GapVariation[] = [];
  const used = new Set<string>();
  const candidates = pool
    .filter((w) => w.text.toLowerCase() !== bare)
    .map((w) => ({ w, idx: findWord(sentence, w.text) }))
    .filter((c) => c.idx !== -1)
    // conjugated verbs first — they make the best substitution drills
    .sort((a, b) => Number(Boolean(b.w.conjugation)) - Number(Boolean(a.w.conjugation)));

  const ordered = [
    ...candidates.filter((c) => c.w.text.toLowerCase() !== originalAnswer),
    ...candidates.filter((c) => c.w.text.toLowerCase() === originalAnswer),
  ];

  for (const { w, idx } of ordered) {
    if (variations.length >= max) break;
    const answer = sentence.slice(idx, idx + w.text.length);
    if (used.has(answer.toLowerCase())) continue;
    const distractors = distractorsFor({ ...w, text: answer }, sentence, lesson, pool);
    if (distractors.length === 0) continue;
    used.add(answer.toLowerCase());
    variations.push({
      before: sentence.slice(0, idx),
      answer,
      after: sentence.slice(idx + w.text.length),
      options: [answer, ...distractors],
    });
  }

  // Fall back to the original practice gap if nothing else could be blanked.
  if (variations.length === 0 && phrase.source === 'practice') {
    const item = lesson.practice?.find((p) => p.id === phrase.sourceId);
    if (item) {
      const answer = item.options.find((o) => o.correct)!.text;
      variations.push({
        before: item.before,
        answer,
        after: item.after,
        options: item.options.map((o) => o.text),
      });
    }
  }
  return variations;
}

// ---- scheduler (graduated interval recall) ----

export interface DrillState {
  queue: DrillCard[];
  /** Correct recalls so far, per phrase. */
  levels: number[];
  /** Next gap variation to use, per phrase. */
  gapCursor: number[];
  mastered: boolean[];
  cardsSeen: number;
}

export function initDrill(phraseCount: number): DrillState {
  const queue: DrillCard[] = [];
  // Build up phrase i, then test phrase i-1 — every first recall is one card later.
  for (let i = 0; i < phraseCount; i++) {
    queue.push({ kind: 'buildup', phrase: i });
    if (i > 0) queue.push({ kind: 'recall', phrase: i - 1 });
  }
  if (phraseCount > 0) queue.push({ kind: 'recall', phrase: phraseCount - 1 });
  return {
    queue,
    levels: Array(phraseCount).fill(0),
    gapCursor: Array(phraseCount).fill(0),
    mastered: Array(phraseCount).fill(false),
    cardsSeen: 0,
  };
}

function insertAt(queue: DrillCard[], index: number, card: DrillCard): DrillCard[] {
  const q = [...queue];
  q.splice(Math.min(index, q.length), 0, card);
  return q;
}

/**
 * Applies the result of the card at the head of the queue.
 * `gapCounts[p]` is how many gap variations phrase p has.
 */
export function advanceDrill(
  state: DrillState,
  result: 'done' | 'correct' | 'wrong',
  gapCounts: number[],
): DrillState {
  const [card, ...rest] = state.queue;
  if (!card) return state;
  let queue = rest;
  const levels = [...state.levels];
  const gapCursor = [...state.gapCursor];
  const mastered = [...state.mastered];
  const p = card.phrase;

  if (card.kind === 'gap') gapCursor[p] += 1;

  if (card.kind !== 'buildup') {
    if (result === 'correct') {
      levels[p] += 1;
      if (levels[p] >= MASTERY_LEVEL) {
        mastered[p] = true;
      } else {
        // Alternate between a fresh gap variation and pure recall.
        const next: DrillCard =
          levels[p] % 2 === 1 && gapCounts[p] > 0
            ? { kind: 'gap', phrase: p, variation: gapCursor[p] % gapCounts[p] }
            : { kind: 'recall', phrase: p };
        queue = insertAt(queue, RECALL_INTERVALS[levels[p] - 1], next);
      }
    } else if (result === 'wrong') {
      levels[p] = 0;
      // Rebuild it right away, then test again two cards later.
      queue = insertAt(queue, 1, { kind: 'buildup', phrase: p });
      queue = insertAt(queue, 3, { kind: 'recall', phrase: p });
    }
  }

  const cardsSeen = state.cardsSeen + 1;
  if (cardsSeen >= MAX_DRILL_CARDS) queue = [];
  return { queue, levels, gapCursor, mastered, cardsSeen };
}
