import { useMemo } from 'react';
import type { Lesson } from '../types';
import { personalizeLesson } from '../lib/personalize';
import { useProfile } from './profileContext';
import { registerContentScopes, useOverridesVersion } from '../lib/contentOverrides';
import { getGrammarTopic } from './useGrammar';
import { LEVELS } from '../lib/levels';

// Lessons are local-JSON only for now — this content isn't seeded into
// Supabase yet (no dialogue_turn/mc_option tables exist). Unlike
// useModules, there's no remote fetch/fallback split here; revisit once
// lessons get their own DB schema.
const lessonFiles = import.meta.glob('../../content/lessons/*.json', {
  eager: true,
}) as Record<string, { default: Lesson }>;

const lessons: Lesson[] = Object.values(lessonFiles)
  .map((f) => f.default)
  .sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity));

// Live edits (lib/contentOverrides) patch these objects in place.
registerContentScopes({
  lesson: (id) => lessons.find((l) => l.id === id),
  grammar: (slug) => getGrammarTopic(slug),
  level: (n) => LEVELS.find((l) => String(l.level) === n),
  allLessons: () => lessons,
  addLessons: (ls) => {
    lessons.push(...ls);
    lessons.sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity));
  },
});

/** All lessons, unpersonalised (the scripts' default "John from Uganda"). */
export function getRawLessons(): Lesson[] {
  return lessons;
}

/** Returns all authored lessons, with the learner cast as the first person. */
export function useLessons(): Lesson[] {
  const { persona } = useProfile();
  const v = useOverridesVersion();
  // Copy before personalising so in-place live edits always produce new objects.
  return useMemo(
    () => lessons.map((l) => personalizeLesson(v ? structuredClone(l) : l, persona)),
    [persona, v],
  );
}

/** Returns a single lesson by its slug, or undefined if not found. */
export function useLesson(id: string): Lesson | undefined {
  return useLessons().find((l) => l.id === id);
}

/** A lesson plus the lessons either side of it in the ordered list. */
export function useLessonWithNeighbors(id: string): {
  lessons: Lesson[];
  lesson: Lesson | undefined;
  previous: Lesson | undefined;
  next: Lesson | undefined;
} {
  const all = useLessons();
  const idx = all.findIndex((l) => l.id === id);
  return {
    lessons: all,
    lesson: idx === -1 ? undefined : all[idx],
    previous: idx > 0 ? all[idx - 1] : undefined,
    next: idx !== -1 ? all[idx + 1] : undefined,
  };
}
