import { Link } from 'react-router-dom';
import type { Lesson } from '../types';
import { PASS_THRESHOLD, pct } from '../lib/lessonScores';

const CATEGORY_LABELS: Record<string, string> = {
  transport: 'Transport',
  'food-drink': 'Food & Drink',
  commerce: 'Commerce',
  health: 'Health',
  'work-admin': 'Work & Admin',
  social: 'Social',
};

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  advanced: 'bg-red-100 text-red-800',
};

interface LessonCardProps {
  lesson: Lesson;
  /** Passed the score gate (conversation + practice). */
  passed: boolean;
  locked: boolean;
  /** Title of the lesson that must be passed first (for the locked message). */
  previousTitle?: string;
}

export function LessonCard({ lesson, passed, locked, previousTitle }: LessonCardProps) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className={`font-semibold text-sm leading-snug ${locked ? 'text-gray-400' : 'text-gray-900'}`}>
          {lesson.title}
        </h3>
        {passed && (
          <span className="text-xs text-green-700 whitespace-nowrap shrink-0">✓ Passed</span>
        )}
        {locked && (
          <span className="text-xs text-gray-400 whitespace-nowrap shrink-0" aria-label="Locked">
            🔒 Locked
          </span>
        )}
      </div>
      <div className="flex gap-2 flex-wrap">
        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
          {CATEGORY_LABELS[lesson.category] ?? lesson.category}
        </span>
        <span
          className={`text-xs px-2 py-0.5 rounded-full capitalize ${DIFFICULTY_COLORS[lesson.difficulty]}`}
        >
          {lesson.difficulty}
        </span>
      </div>
      {locked && (
        <p className="text-xs text-gray-400 mt-3">
          Score {pct(PASS_THRESHOLD)}+ on {previousTitle ? `“${previousTitle}”` : 'the previous lesson'} to unlock.
        </p>
      )}
    </>
  );

  if (locked) {
    return (
      <div className="block border border-dashed border-gray-200 rounded-lg p-4 bg-gray-50/60 cursor-not-allowed">
        {body}
      </div>
    );
  }

  return (
    <Link
      to={`/lesson/${lesson.id}`}
      className="block border border-gray-200 rounded-lg p-4 hover:border-green-400 hover:shadow-sm transition-all bg-white"
    >
      {body}
    </Link>
  );
}
