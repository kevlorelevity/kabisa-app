import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useLessonWithNeighbors } from '../hooks/useLessons';
import { PracticeSession } from '../components/PracticeSession';
import { DrillPrompt, LessonGateStatus, LockedLesson } from '../components/LessonGate';
import { LevelUpModal } from '../components/LevelUp';
import { claimLevelUp } from '../lib/levels';
import {
  PASS_THRESHOLD,
  getLessonScores,
  isLessonPassed,
  isLessonUnlocked,
  pct,
  recordPracticeAttempt,
  sectionPassed,
  type AttemptResult,
} from '../lib/lessonScores';
import { useRoam } from '../lib/roam';

export function PracticeView() {
  const { id } = useParams<{ id: string }>();
  useRoam(); // re-render when an admin toggles Roam
  const { lessons, lesson, previous, next } = useLessonWithNeighbors(id ?? '');
  const [rec, setRec] = useState(() => getLessonScores(id ?? ''));
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [levelUp, setLevelUp] = useState<number | null>(null);

  if (!lesson || !lesson.practice?.length) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-gray-500">No practice session for this lesson yet.</p>
        <Link to="/" className="text-green-700 text-sm mt-2 inline-block">
          ← Back to lessons
        </Link>
      </div>
    );
  }

  if (!isLessonUnlocked(lessons, lesson.id)) {
    return <LockedLesson lesson={lesson} previous={previous} />;
  }

  function handleFinish(r: AttemptResult) {
    setRec(recordPracticeAttempt(lesson!.id, r));
    setResult(r);
    setLevelUp(claimLevelUp(lessons, lesson!.level));
  }

  const ratio = result ? result.firstTryCorrect / result.total : 0;
  const passedRun = ratio >= PASS_THRESHOLD;
  const lessonPassed = isLessonPassed(lesson, rec);

  const resultSlot = result ? (
    <div className="space-y-3 text-left pt-2">
      <p className={`text-sm text-center ${passedRun ? 'text-green-700' : 'text-amber-800'}`}>
        {passedRun
          ? sectionPassed(rec.dialogue)
            ? `${pct(ratio)} — practice passed.`
            : `${pct(ratio)} — practice passed. Now score ${pct(PASS_THRESHOLD)} in the conversation to finish the lesson.`
          : `${pct(ratio)} — you need ${pct(PASS_THRESHOLD)} to pass.`}
      </p>
      <DrillPrompt lesson={lesson} rec={rec} />
      {lessonPassed && next && (
        <Link
          to={`/lesson/${next.id}`}
          className="block rounded-xl border border-green-300 bg-green-50 p-4 hover:border-green-500 transition-colors"
        >
          <p className="font-semibold text-green-800">Unlocked: {next.title} →</p>
        </Link>
      )}
      {!sectionPassed(rec.dialogue) && (
        <Link to={`/lesson/${lesson.id}`} className="block text-center text-sm text-green-700 hover:underline">
          Back to the conversation
        </Link>
      )}
    </div>
  ) : null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-5 sm:py-8 space-y-5 sm:space-y-6 pb-16">
      {levelUp !== null && <LevelUpModal level={levelUp} lessons={lessons} onClose={() => setLevelUp(null)} />}
      <div>
        <Link to={`/lesson/${lesson.id}`} className="text-sm text-gray-400 hover:text-gray-600">
          ← {lesson.title}
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Practice session</h1>
        <details className="group mt-1" data-testid="practice-intro">
          <summary className="flex cursor-pointer list-none items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 [&::-webkit-details-marker]:hidden">
            <span className="inline-block transition-transform group-open:rotate-90" aria-hidden="true">
              ▸
            </span>
            <span>
              How it works &amp; your scores
              {rec.practice ? ` · best ${pct(rec.practice.best)}` : ''} · pass at {pct(PASS_THRESHOLD)}
            </span>
          </summary>
          <div className="mt-2 space-y-4">
            <p className="text-sm text-gray-500">
              Short lines from the conversation. Pick the word that fills the gap — tap a chip to answer. Your first-try
              score counts toward unlocking the next lesson.
            </p>
            <LessonGateStatus lesson={lesson} next={next} rec={rec} />
          </div>
        </details>
      </div>
      <PracticeSession items={lesson.practice} onFinish={handleFinish} resultSlot={resultSlot} />
    </div>
  );
}
