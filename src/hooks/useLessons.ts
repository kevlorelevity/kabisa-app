import type { Lesson } from '../types';

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

/** Returns all authored lessons. */
export function useLessons(): Lesson[] {
  return lessons;
}

/** Returns a single lesson by its slug, or undefined if not found. */
export function useLesson(id: string): Lesson | undefined {
  return lessons.find((l) => l.id === id);
}

/** A lesson plus the lessons either side of it in the ordered list. */
export function useLessonWithNeighbors(id: string): {
  lessons: Lesson[];
  lesson: Lesson | undefined;
  previous: Lesson | undefined;
  next: Lesson | undefined;
} {
  const idx = lessons.findIndex((l) => l.id === id);
  return {
    lessons,
    lesson: idx === -1 ? undefined : lessons[idx],
    previous: idx > 0 ? lessons[idx - 1] : undefined,
    next: idx !== -1 ? lessons[idx + 1] : undefined,
  };
}
