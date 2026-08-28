import type { Lesson } from '../types';

// Lessons are local-JSON only for now — this content isn't seeded into
// Supabase yet (no dialogue_turn/mc_option tables exist). Unlike
// useModules, there's no remote fetch/fallback split here; revisit once
// lessons get their own DB schema.
const lessonFiles = import.meta.glob('../../content/lessons/*.json', {
  eager: true,
}) as Record<string, { default: Lesson }>;

const lessons: Lesson[] = Object.values(lessonFiles).map((f) => f.default);

/** Returns all authored lessons. */
export function useLessons(): Lesson[] {
  return lessons;
}

/** Returns a single lesson by its slug, or undefined if not found. */
export function useLesson(id: string): Lesson | undefined {
  return lessons.find((l) => l.id === id);
}
