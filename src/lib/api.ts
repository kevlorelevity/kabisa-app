/**
 * Read-only data access for V1 corpus content.
 *
 * Pulls from the public Supabase API (PostgREST). All callers should be
 * prepared for a `null` Supabase client and fall back to local content.
 *
 * Snake_case rows from Postgres are adapted to camelCase app types here.
 * The `Module`, `VocabEntry`, etc. types are the in-app contract — anything
 * the database needs to expose is renamed before it crosses this boundary.
 */

import { getSupabase } from './supabase';
import type {
  Module,
  VocabEntry,
  ExchangeLine,
  Exercise,
  GrammarLesson,
} from '../types';

// ---- DB row shapes (snake_case mirror of db/migrations/001_init.sql) ----

interface ModuleRow {
  id: string;
  slug: string;
  title: string;
  category: Module['category'];
  difficulty: Module['difficulty'];
  cultural_note: string;
  order_index: number;
}

interface VocabEntryRow {
  id: string;
  swahili: string;
  english: string;
  example_context: string;
  sanifu: string | null;
  sanifu_note: string | null;
  part_of_speech: VocabEntry['partOfSpeech'] | null;
  noun_class: VocabEntry['nounClass'] | null;
  tense: VocabEntry['tense'] | null;
  audio_url: string | null;
}

interface ExchangeLineRow {
  id: string;
  module_id: string;
  order_index: number;
  speaker: string;
  swahili: string;
  english: string;
  sanifu: string | null;
  sanifu_note: string | null;
  audio_url: string | null;
}

interface ExerciseRow {
  id: string;
  module_id: string;
  order_index: number;
  kind: Exercise['type'];
  payload: Record<string, unknown>;
}

interface GrammarLessonRow {
  id: string;
  slug: string;
  title: string;
  order_index: number;
  body_md: string;
  examples: Array<{
    swahili: string;
    english: string;
    sanifu?: string;
    sanifuNote?: string;
  }>;
  difficulty: GrammarLesson['difficulty'];
}

// ---- Adapters: DB row → app type ----

function rowToVocab(r: VocabEntryRow): VocabEntry {
  return {
    id: r.id,
    swahili: r.swahili,
    english: r.english,
    exampleContext: r.example_context,
    sanifu: r.sanifu ?? undefined,
    sanifuNote: r.sanifu_note ?? undefined,
    partOfSpeech: r.part_of_speech ?? undefined,
    nounClass: r.noun_class ?? undefined,
    tense: r.tense ?? undefined,
    audioUrl: r.audio_url ?? undefined,
  };
}

function rowToExchange(r: ExchangeLineRow): ExchangeLine {
  return {
    id: r.id,
    speaker: r.speaker,
    swahili: r.swahili,
    english: r.english,
    sanifu: r.sanifu ?? undefined,
    sanifuNote: r.sanifu_note ?? undefined,
    audioUrl: r.audio_url ?? undefined,
  };
}

function rowToExercise(r: ExerciseRow): Exercise {
  const base = { id: r.id, type: r.kind };
  // The payload shape is kind-specific; trust the schema at this boundary.
  return { ...base, ...r.payload } as Exercise;
}

function rowToGrammar(r: GrammarLessonRow): GrammarLesson {
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    orderIndex: r.order_index,
    bodyMd: r.body_md,
    examples: r.examples ?? [],
    difficulty: r.difficulty,
  };
}

// ---- Public API ----

/**
 * Fetch all V1 beginner modules with their vocab, exchange, and exercises.
 *
 * Returns `null` if Supabase isn't configured — callers should fall back.
 */
export async function listModules(): Promise<Module[] | null> {
  const supa = getSupabase();
  if (!supa) return null;

  const { data, error } = await supa
    .from('v1_module')
    .select(
      `
        id, slug, title, category, difficulty, cultural_note, order_index,
        module_vocab:module_vocab (
          order_index,
          vocab:vocab_entry (
            id, swahili, english, example_context,
            sanifu, sanifu_note, part_of_speech, noun_class, tense, audio_url
          )
        ),
        exchange:exchange_line (
          id, module_id, order_index, speaker, swahili, english,
          sanifu, sanifu_note, audio_url
        ),
        exercises:exercise (
          id, module_id, order_index, kind, payload
        )
      `,
    )
    .order('order_index', { ascending: true });

  if (error) {
    console.error('[api] listModules failed:', error);
    return null;
  }
  return ((data ?? []) as unknown as ModuleJoinedRow[]).map(adaptModule);
}

/**
 * Fetch a single V1 module by slug. Returns `null` if not found or Supabase
 * is not configured.
 */
export async function getModuleBySlug(slug: string): Promise<Module | null> {
  const supa = getSupabase();
  if (!supa) return null;

  const { data, error } = await supa
    .from('v1_module')
    .select(
      `
        id, slug, title, category, difficulty, cultural_note, order_index,
        module_vocab:module_vocab (
          order_index,
          vocab:vocab_entry (
            id, swahili, english, example_context,
            sanifu, sanifu_note, part_of_speech, noun_class, tense, audio_url
          )
        ),
        exchange:exchange_line (
          id, module_id, order_index, speaker, swahili, english,
          sanifu, sanifu_note, audio_url
        ),
        exercises:exercise (
          id, module_id, order_index, kind, payload
        )
      `,
    )
    .eq('slug', slug)
    .single();

  if (error || !data) {
    if (error) console.error('[api] getModuleBySlug failed:', error);
    return null;
  }
  return adaptModule(data as unknown as ModuleJoinedRow);
}

/** List all V1 grammar lessons in display order. */
export async function listGrammarLessons(): Promise<GrammarLesson[] | null> {
  const supa = getSupabase();
  if (!supa) return null;

  const { data, error } = await supa
    .from('grammar_lesson')
    .select('id, slug, title, order_index, body_md, examples, difficulty')
    .eq('difficulty', 'beginner')
    .order('order_index', { ascending: true });

  if (error) {
    console.error('[api] listGrammarLessons failed:', error);
    return null;
  }
  return (data as GrammarLessonRow[]).map(rowToGrammar);
}

// ---- Adapters that need the nested join shape ----

interface ModuleJoinedRow extends ModuleRow {
  module_vocab: Array<{ order_index: number; vocab: VocabEntryRow }>;
  exchange: ExchangeLineRow[];
  exercises: ExerciseRow[];
}

function adaptModule(row: ModuleJoinedRow): Module {
  const vocabSorted = [...row.module_vocab].sort(
    (a, b) => a.order_index - b.order_index,
  );
  const exchangeSorted = [...row.exchange].sort(
    (a, b) => a.order_index - b.order_index,
  );
  const exercisesSorted = [...row.exercises].sort(
    (a, b) => a.order_index - b.order_index,
  );

  return {
    id: row.slug,
    uuid: row.id,
    title: row.title,
    category: row.category,
    difficulty: row.difficulty,
    culturalNote: row.cultural_note,
    vocabulary: vocabSorted.map((mv) => rowToVocab(mv.vocab)),
    exchange: exchangeSorted.map(rowToExchange),
    exercises: exercisesSorted.map(rowToExercise),
  };
}
