export type Category =
  | 'transport'
  | 'food-drink'
  | 'commerce'
  | 'health'
  | 'work-admin'
  | 'social';

export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

export type ModuleStatus = 'not-started' | 'in-progress' | 'reviewed';

export type Rating = 'forgot' | 'hard' | 'easy';

export interface VocabEntry {
  swahili: string;
  english: string;
  exampleContext: string;
  sanifu: string;
  sanifuNote: string;
}

export interface ExchangeLine {
  speaker: string;
  swahili: string;
  english: string;
  sanifu?: string;
  sanifuNote?: string;
}

export interface FillBlankExercise {
  type: 'fill-blank';
  prompt: string;
  answer: string;
}

export interface MatchExercise {
  type: 'match';
  pairs: Array<{ swahili: string; english: string }>;
}

export interface TranslateExercise {
  type: 'translate';
  prompt: string;
  answer: string;
}

export type Exercise = FillBlankExercise | MatchExercise | TranslateExercise;

export interface Module {
  id: string;
  title: string;
  category: Category;
  difficulty: Difficulty;
  culturalNote: string;
  vocabulary: VocabEntry[];
  exchange: ExchangeLine[];
  exercises: Exercise[];
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
