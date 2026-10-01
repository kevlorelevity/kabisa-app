import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useLessonWithNeighbors } from '../hooks/useLessons';
import { PracticeSession } from '../components/PracticeSession';
import { DrillPrompt, LessonGateStatus, LockedLesson } from '../components/LessonGate';
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

export function PracticeView() {
  const { id } = useParams<{ id: string }>();
  const { lessons, lesson, previous, next } = useLessonWithNeighbors(id ?? '');
  const [rec, setRec] = useState(() => getLessonScores(id ?? ''));
  const [result, setResult] = useState<AttemptResult | null>(null);

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
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6 pb-16">
      <div>
        <Link to={`/lesson/${lesson.id}`} className="text-sm text-gray-400 hover:text-gray-600">
          ← {lesson.title}
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Practice session</h1>
        <p className="text-sm text-gray-500 mt-1">
          Short lines from the ride. Pick the word that fills the gap — tap a chip to answer. Your first-try score
          counts toward unlocking the next lesson.
        </p>
        <div className="mt-4">
          <LessonGateStatus lesson={lesson} next={next} rec={rec} />
        </div>
      </div>
      <PracticeSession items={lesson.practice} onFinish={handleFinish} resultSlot={resultSlot} />
    </div>
  );
}
