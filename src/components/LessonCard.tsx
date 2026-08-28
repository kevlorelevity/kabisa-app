import { Link } from 'react-router-dom';
import type { Lesson } from '../types';

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
  complete: boolean;
}

export function LessonCard({ lesson, complete }: LessonCardProps) {
  return (
    <Link
      to={`/lesson/${lesson.id}`}
      className="block border border-gray-200 rounded-lg p-4 hover:border-green-400 hover:shadow-sm transition-all bg-white"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-semibold text-gray-900 text-sm leading-snug">
          {lesson.title}
        </h3>
        {complete && (
          <span className="text-xs text-gray-400 whitespace-nowrap shrink-0">
            ✓ Complete
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
    </Link>
  );
}
