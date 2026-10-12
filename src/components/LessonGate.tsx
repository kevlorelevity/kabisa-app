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

interface LessonGateStatusProps {
  lesson: Lesson;
  next?: Lesson;
  rec: LessonScoreRecord;
}

function Step({ n, label, score, active }: { n: number; label: string; score?: SectionScore; active: boolean }) {
  const passed = sectionPassed(score);
  return (
    <li
      className={`flex-1 min-w-0 rounded-lg border px-2.5 py-1.5 text-xs ${
        passed
          ? 'border-green-200 bg-green-50 text-green-800'
          : active
          ? 'border-green-600 bg-white text-green-900 ring-2 ring-green-100'
          : 'border-gray-200 bg-white text-gray-500'
      }`}
      aria-current={active ? 'step' : undefined}
    >
      <span className="font-semibold">{passed ? '✓' : `${n}.`} {label}</span>
      <span className="block text-[11px] opacity-80">{score ? `best ${pct(score.best)}` : 'not done yet'}</span>
    </li>
  );
}

/** The path to the next lesson: conversation → practice → unlocked, with best scores. */
export function LessonGateStatus({ lesson, next, rec }: LessonGateStatusProps) {
  const hasPractice = Boolean(lesson.practice?.length);
  const passed = isLessonPassed(lesson, rec);
  const convoDone = sectionPassed(rec.dialogue);
  return (
    <div className="space-y-2" data-testid="lesson-path">
      <ol className="flex items-stretch gap-1.5" aria-label="Your path to the next lesson">
        <Step n={1} label="Conversation" score={rec.dialogue} active={!convoDone} />
        {hasPractice && (
          <>
            <span aria-hidden="true" className="self-center text-gray-300">→</span>
            <Step n={2} label="🔑 Practice" score={rec.practice} active={convoDone && !sectionPassed(rec.practice)} />
          </>
        )}
        <span aria-hidden="true" className="self-center text-gray-300">→</span>
        <li
          className={`flex-1 min-w-0 rounded-lg border px-2.5 py-1.5 text-xs ${
            passed ? 'border-green-300 bg-green-100 text-green-900' : 'border-dashed border-gray-300 bg-white text-gray-400'
          }`}
        >
          <span className="font-semibold">{passed ? '🔓' : '🔒'} {next ? 'Next lesson' : 'Done'}</span>
          <span className="block text-[11px] truncate">{next ? next.title : 'latest lesson'}</span>
        </li>
      </ol>
      <p className="text-xs text-gray-500">
        {passed
          ? next
            ? `Passed — “${next.title}” is unlocked.`
            : 'Passed — this is the latest lesson.'
          : hasPractice
          ? `The practice session is your key to the next lesson: score ${pct(PASS_THRESHOLD)} or more on the first try in the conversation, then in the practice.`
          : `Score ${pct(PASS_THRESHOLD)} or more on the first try in the conversation to ${next ? `unlock “${next.title}”` : 'pass this lesson'}.`}
      </p>
    </div>
  );
}

/** After the conversation: the practice session is the step that unlocks the next lesson. */
export function PracticeKey({ lesson, next, rec }: { lesson: Lesson; next?: Lesson; rec: LessonScoreRecord }) {
  if (!lesson.practice?.length) return null;
  const done = sectionPassed(rec.practice);
  const convoDone = sectionPassed(rec.dialogue);
  const unlocks = next ? `unlock “${next.title}”` : 'finish this lesson';
  return (
    <Link
      to={`/lesson/${lesson.id}/practice`}
      data-testid="practice-key"
      className={`block rounded-xl border-2 p-4 transition-colors ${
        done ? 'border-green-200 bg-green-50 hover:border-green-400' : 'border-green-600 bg-green-50 hover:bg-green-100'
      }`}
    >
      <p className="text-xs uppercase tracking-wide font-semibold text-green-700">
        {done ? 'Practice passed' : convoDone ? 'Step 2 of 2 · your key to the next lesson' : 'Step 2 of 2'}
      </p>
      <p className="mt-0.5 text-lg font-bold text-green-900">{done ? 'Practice again →' : '🔑 Start the practice session →'}</p>
      <p className="text-sm text-green-800/80 mt-0.5">
        {done
          ? `${lesson.practice.length} fill-the-gap lines from this conversation — best ${pct(rec.practice!.best)}.`
          : `${lesson.practice.length} fill-the-gap lines from this conversation. Score ${pct(PASS_THRESHOLD)} on the first try to ${unlocks}.`}
      </p>
    </Link>
  );
}

/** "✕ Exit": leave a session that's optional now (already passed, or a drill). */
export function ExitButton({ onExit, label = 'Exit', hint }: { onExit: () => void; label?: string; hint?: string }) {
  return (
    <button
      type="button"
      onClick={onExit}
      title={hint}
      data-testid="exit-session"
      className="shrink-0 inline-flex items-center gap-1 rounded-full border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 hover:text-gray-900"
    >
      ✕ {label}
    </button>
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
