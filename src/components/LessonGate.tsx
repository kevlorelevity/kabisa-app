import { Link } from 'react-router-dom';
import type { Lesson } from '../types';
import {
  PASS_THRESHOLD,
  isLessonPassed,
  isStruggling,
  pct,
  sectionPassed,
  type LessonScoreRecord,
  type SectionScore,
} from '../lib/lessonScores';

function Chip({ label, score, required }: { label: string; score?: SectionScore; required: boolean }) {
  if (!required) return null;
  const passed = sectionPassed(score);
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border ${
        passed
          ? 'border-green-200 bg-green-50 text-green-800'
          : score
          ? 'border-amber-200 bg-amber-50 text-amber-800'
          : 'border-gray-200 bg-white text-gray-500'
      }`}
    >
      {passed ? '✓' : score ? '•' : '○'} {label}
      <span className="font-semibold">{score ? pct(score.best) : '—'}</span>
    </span>
  );
}

interface LessonGateStatusProps {
  lesson: Lesson;
  next?: Lesson;
  rec: LessonScoreRecord;
}

/** Best scores vs. the pass mark, and what that means for the next lesson. */
export function LessonGateStatus({ lesson, next, rec }: LessonGateStatusProps) {
  const hasPractice = Boolean(lesson.practice?.length);
  const passed = isLessonPassed(lesson, rec);
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Chip label="Conversation" score={rec.dialogue} required />
        <Chip label="Practice" score={rec.practice} required={hasPractice} />
      </div>
      <p className="text-xs text-gray-500">
        {passed
          ? next
            ? `Passed — “${next.title}” is unlocked.`
            : 'Passed — this is the latest lesson.'
          : `Score ${pct(PASS_THRESHOLD)} or more on the first try in the conversation${
              hasPractice ? ' and the practice session' : ''
            } to ${next ? `unlock “${next.title}”` : 'pass this lesson'}.`}
      </p>
    </div>
  );
}

/** Offers the adaptive drill when there are missed phrases; louder once the learner is struggling. */
export function DrillPrompt({ lesson, rec }: { lesson: Lesson; rec: LessonScoreRecord }) {
  const weak = rec.weakTurns.length + rec.weakPractice.length;
  if (weak === 0) return null;
  const struggling = isStruggling(rec);
  return (
    <Link
      to={`/lesson/${lesson.id}/drill`}
      className={`block rounded-xl border p-4 transition-colors ${
        struggling
          ? 'border-amber-300 bg-amber-50 hover:border-amber-400'
          : 'border-gray-200 bg-white hover:border-green-400'
      }`}
    >
      <p className={`font-semibold ${struggling ? 'text-amber-900' : 'text-gray-900'}`}>
        {struggling ? 'We built you a focused drill →' : 'Drill the lines you missed →'}
      </p>
      <p className={`text-sm mt-0.5 ${struggling ? 'text-amber-800/80' : 'text-gray-500'}`}>
        {weak} tricky {weak === 1 ? 'phrase' : 'phrases'}, rebuilt Pimsleur-style: listen, build each line up from
        the end, say it before you hear it, then fresh variations at spaced intervals.
      </p>
    </Link>
  );
}

/** Shown in place of a lesson (or its practice/drill) that isn't unlocked yet. */
export function LockedLesson({ lesson, previous }: { lesson: Lesson; previous?: Lesson }) {
  return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-3">
      <p className="text-3xl" aria-hidden="true">🔒</p>
      <h1 className="text-xl font-bold text-gray-900">{lesson.title}</h1>
      <p className="text-gray-500 text-sm">
        Score {pct(PASS_THRESHOLD)} or more on the first try in{' '}
        {previous ? `“${previous.title}”` : 'the previous lesson'} — both the conversation and the practice
        session — to unlock this one.
      </p>
      {previous && (
        <Link
          to={`/lesson/${previous.id}`}
          className="inline-block mt-2 px-4 py-2 rounded-full bg-green-700 text-white text-sm font-medium hover:bg-green-800"
        >
          Go to {previous.title}
        </Link>
      )}
    </div>
  );
}
