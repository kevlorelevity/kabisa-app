// V1 corpus types. See /docs/schema.md for the full contract.
//
// The `swahili` field on VocabEntry and ExchangeLine represents the
// Kenyan colloquial form. The `sanifu` field, when present, holds the
// standard form that diverges from the Kenyan one.

export type Category =
  | 'transport'
  | 'food-drink'
  | 'commerce'
  | 'health'
  | 'work-admin'
  | 'social'
  | 'home'
  | 'people'
  | 'time'
  | 'weather'
  | 'directions'
  | 'numbers';

/** Content difficulty — applied to a module or vocab entry. */
export type Difficulty = 'beginner' | 'medium' | 'advanced';

/** User-declared proficiency — applied to an account. Same axis as Difficulty. */
export type Proficiency = 'beginner' | 'medium' | 'advanced';

export type ModuleStatus = 'not-started' | 'in-progress' | 'reviewed';

export type Rating = 'forgot' | 'hard' | 'easy';

/**
 * V1 supports only m/wa and n/n. Anything else lives in the DB tagged
 * as 'other' and is filtered out of V1 surfaces.
 */
export type NounClass = 'm_wa' | 'n_n' | 'other';

/**
 * V1 supports only the -na- present tense (plus the ni/niko/nina copula
 * family). Anything else is tagged 'other' and the engine returns
 * out_of_scope for it.
 */
export type Tense = 'present' | 'other';

export type PartOfSpeech =
  | 'noun'
  | 'verb'
  | 'adjective'
  | 'possessive'
  | 'phrase'
  | 'other';

export type Register = 'sanifu' | 'kenyan' | 'out_of_scope';

export interface VocabEntry {
  /** Stable UUID. Used as the SRS card key. Never reuse or reorder. */
  id: string;
  /** Kenyan colloquial form. */
  swahili: string;
  /** English gloss. */
  english: string;
  /** One-line context for how the term is used. */
  exampleContext: string;
  /** Standard Swahili form. Optional — only set when it diverges from swahili. */
  sanifu?: string;
  /** Short note explaining the divergence. */
  sanifuNote?: string;
  /** Part of speech. Drives tap-to-explain panel behavior. */
  partOfSpeech?: PartOfSpeech;
  /** Noun class — required for nouns. V1 only surfaces m_wa and n_n. */
  nounClass?: NounClass;
  /** Tense — required for verbs. V1 only surfaces 'present'. */
  tense?: Tense;
  /** Future audio support. Reserved column; no V1 surface uses it yet. */
  audioUrl?: string;
}

export interface ExchangeLine {
  id: string;
  speaker: string;
  swahili: string;
  english: string;
  sanifu?: string;
  sanifuNote?: string;
  /** Future audio support. */
  audioUrl?: string;
}

export interface FillBlankExercise {
  id: string;
  type: 'fill-blank';
  prompt: string;
  answer: string;
}

export interface MatchExercise {
  id: string;
  type: 'match';
  pairs: Array<{ swahili: string; english: string }>;
}

export interface TranslateExercise {
  id: string;
  type: 'translate';
  prompt: string;
  answer: string;
}

export type Exercise = FillBlankExercise | MatchExercise | TranslateExercise;

export interface Module {
  /** Slug used in URLs. Stable across releases. */
  id: string;
  /** DB primary key. Random UUID v4. Stable across renames of the slug. */
  uuid: string;
  title: string;
  category: Category;
  difficulty: Difficulty;
  culturalNote: string;
  vocabulary: VocabEntry[];
  exchange: ExchangeLine[];
  exercises: Exercise[];
}

// -------- Dialogue / role-play lesson types (Lessons surface) --------
//
// A Lesson is a separate content type from Module: an interactive,
// turn-by-turn role-play. 'auto' turns are shown immediately; 'user' turns
// present the learner with up to 3 Swahili options (one correct) and only
// advance once the correct one is picked. Local-JSON only for now (see
// content/lessons/*.json + useLessons) — not yet backed by Supabase tables.

/** One tappable word or short phrase within a dialogue line, with its English gloss. */
export interface WordGloss {
  /** The exact substring of `swahili` this gloss covers. */
  text: string;
  /** English explanation shown in the tap-to-explain tooltip. */
  gloss: string;
}

export interface DialogueOption {
  swahili: string;
  correct: boolean;
}

export interface DialogueTurn {
  id: string;
  /** Display name, e.g. "Mteja" or "Dereva". */
  speaker: string;
  /** 'auto' turns render immediately; 'user' turns are answered via MCQ. */
  role: 'auto' | 'user';
  swahili: string;
  english: string;
  /** Word-by-word breakdown powering the tap-to-explain tooltip. */
  words: WordGloss[];
  /** MCQ choices — required when role is 'user', max 3, exactly one correct. */
  options?: DialogueOption[];
}

export interface Lesson {
  id: string;
  uuid: string;
  title: string;
  category: Category;
  difficulty: Difficulty;
  culturalNote: string;
  /** One-line scene-setter shown above the dialogue, e.g. who starts and why. */
  startingPoint: string;
  turns: DialogueTurn[];
  /** Key vocabulary recap shown after the dialogue completes. */
  vocabulary: VocabEntry[];
}

/** Grammar lessons are a top-level surface in V1. */
export interface GrammarLesson {
  id: string;
  /** URL slug, e.g. 'subject-prefixes-present'. */
  slug: string;
  title: string;
  /** Display order in the grammar list. */
  orderIndex: number;
  /** Markdown body. Rendered with the same Sanifu disclosure pattern as modules. */
  bodyMd: string;
  /** Worked examples — short, structured. */
  examples: Array<{
    swahili: string;
    english: string;
    sanifu?: string;
    sanifuNote?: string;
  }>;
  difficulty: Difficulty;
}

export interface ModuleProgress {
  status: ModuleStatus;
  addedToReview: boolean;
  lastReviewed: string | null;
}

export interface CardState {
  interval: number;      // days between reviews
  easeFactor: number;    // 1.3–2.5, SM-2 ease multiplier
  repetitions: number;   // consecutive correct reviews
  nextReview: string;    // ISO date YYYY-MM-DD
}

// -------- Account / auth types (used once the backend lands) --------

export type AccountRole = 'learner' | 'admin';

export interface Account {
  id: string;          // UUID
  email: string;
  firstName: string;
  lastName: string;
  role: AccountRole;
  createdAt: string;   // ISO timestamp
}

export interface Profile {
  accountId: string;
  proficiency: Proficiency;   // V1 hardcodes 'beginner' at signup
  createdAt: string;
}

/** Append-only audit row — written on every admin mutation. */
export interface EditLogEntry {
  id: string;
  actorId: string;
  targetTable: string;
  targetId: string;
  field: string;
  before: string | null;
  after: string | null;
  changedAt: string;   // ISO timestamp
}
