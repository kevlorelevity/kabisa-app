import { Link } from 'react-router-dom';
import type { Lesson } from '../types';
import { PASS_THRESHOLD, pct } from '../lib/lessonScores';
import { THEME_LABELS, maxLessonXp } from '../lib/levels';
import { EditPencil } from './EditPencil';

const CATEGORY_LABELS: Record<string, string> = {
  transport: 'Transport',
  'food-drink': 'Food & Drink',
  commerce: 'Commerce',
  health: 'Health',
  'work-admin': 'Work & Admin',
  social: 'Social',
  home: 'Home',
  people: 'People',
  time: 'Time',
  weather: 'Weather',
  directions: 'Directions',
  numbers: 'Numbers',
};

interface LessonCardProps {
  lesson: Lesson;
  /** Passed the score gate (conversation + practice). */
  passed: boolean;
  locked: boolean;
  /** Title of the lesson that must be passed first (for the locked message). */
  previousTitle?: string;
  /** XP earned so far on this lesson. */
  xp?: number;
  /** 1 for a theme's first appearance, 2+ when it comes back at a higher level. */
  themeVisit?: number;
}

export function LessonCard({ lesson, passed, locked, previousTitle, xp = 0, themeVisit = 1 }: LessonCardProps) {
  const theme = lesson.theme ? THEME_LABELS[lesson.theme] : undefined;
  const body = (
    <>
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className={`font-semibold text-sm leading-snug ${locked ? 'text-gray-400' : 'text-gray-900'}`}>
          {lesson.title}{' '}
          <EditPencil target={{ targetType: 'lesson.title', label: 'Lesson title', currentText: lesson.title, lessonId: lesson.id }} />
        </h3>
        {passed && (
          <span className="text-xs text-green-700 whitespace-nowrap shrink-0">✓ Passed</span>
        )}
        {locked && (
          <span className="text-xs text-gray-400 whitespace-nowrap shrink-0" aria-label="Locked">
            🔒
          </span>
        )}
      </div>
      <div className="flex gap-1.5 flex-wrap">
        {theme && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
            {theme.emoji} {theme.label}
            {themeVisit > 1 && <span className="text-gray-400"> · visit {themeVisit}</span>}
          </span>
        )}
        {!theme && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
            {CATEGORY_LABELS[lesson.category] ?? lesson.category}
          </span>
        )}
        {!locked && xp > 0 && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-800">
            ⚡ {xp}/{maxLessonXp()} XP
          </span>
        )}
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
      className={`block border rounded-lg p-4 hover:border-green-400 hover:shadow-sm transition-all bg-white ${
        passed ? 'border-green-200' : 'border-gray-200'
      }`}
    >
      {body}
    </Link>
  );
}
