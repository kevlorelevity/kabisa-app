import { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useLessonWithNeighbors } from '../hooks/useLessons';
import { DrillSession } from '../components/DrillSession';
import { LockedLesson } from '../components/LessonGate';
import { allLearnerPhrases, collectPhrases, type DrillPhrase } from '../lib/drill';
import { getLessonScores, isLessonUnlocked, recordDrillMastered } from '../lib/lessonScores';

export function DrillView() {
  const { id } = useParams<{ id: string }>();
  const { lessons, lesson, previous } = useLessonWithNeighbors(id ?? '');
  const [started, setStarted] = useState(false);
  const [wholeLesson, setWholeLesson] = useState(false);
  const [finished, setFinished] = useState<DrillPhrase[] | null>(null);
  // Fixed for the session so finishing the drill doesn't reshuffle it mid-render.
  const [rec] = useState(() => getLessonScores(id ?? ''));

  const phrases = useMemo(() => {
    if (!lesson) return [];
    return wholeLesson
      ? allLearnerPhrases(lesson)
      : collectPhrases(lesson, rec.weakTurns, rec.weakPractice);
  }, [lesson, rec, wholeLesson]);

  if (!lesson) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-gray-500">Lesson not found.</p>
        <Link to="/" className="text-green-700 text-sm mt-2 inline-block">
          ← Back to lessons
        </Link>
      </div>
    );
  }

  if (!isLessonUnlocked(lessons, lesson.id)) {
    return <LockedLesson lesson={lesson} previous={previous} />;
  }

  function handleDone(mastered: DrillPhrase[]) {
    recordDrillMastered(
      lesson!.id,
      mastered.filter((p) => p.source === 'turn').map((p) => p.sourceId),
      mastered.filter((p) => p.source === 'practice').map((p) => p.sourceId),
    );
    setFinished(mastered);
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6 pb-16">
      <div>
        <Link to={`/lesson/${lesson.id}`} className="text-sm text-gray-400 hover:text-gray-600">
          ← {lesson.title}
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Focused drill</h1>
      </div>

      {!started && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
          {phrases.length === 0 ? (
            <>
              <p className="text-gray-700">
                Nothing to drill — you haven't missed any lines in this lesson recently.
              </p>
              <button
                onClick={() => setWholeLesson(true)}
                className="px-4 py-2 rounded-full border border-green-700 text-green-800 text-sm font-medium hover:bg-green-50"
              >
                Drill all my lines anyway
              </button>
            </>
          ) : (
            <>
              <p className="text-gray-700">
                {phrases.length} {phrases.length === 1 ? 'phrase' : 'phrases'} you found tricky, practised the
                way Pimsleur teaches:
              </p>
              <ol className="list-decimal list-inside text-sm text-gray-600 space-y-1">
                <li>
                  <span className="font-medium text-gray-800">Build it up from the end.</span> Hear the last
                  word or two, repeat, then add more until you can say the whole line.
                </li>
                <li>
                  <span className="font-medium text-gray-800">Say it before you hear it.</span> You get the
                  English; say the Swahili out loud, then reveal and compare.
                </li>
                <li>
                  <span className="font-medium text-gray-800">Spaced recall with variations.</span> Each phrase
                  comes back after 1, 3, then 6 other cards — sometimes as a new fill-the-gap with a different
                  word missing. Miss it and it's rebuilt from scratch.
                </li>
              </ol>
              <p className="text-xs text-gray-400">Best with sound on. Speak out loud — it's the whole point.</p>
              <button
                onClick={() => setStarted(true)}
                className="px-4 py-2 rounded-full bg-green-700 text-white text-sm font-medium hover:bg-green-800"
              >
                Start drill
              </button>
            </>
          )}
        </div>
      )}

      {started && phrases.length > 0 && (
        <DrillSession lesson={lesson} phrases={phrases} onDone={handleDone} />
      )}

      {finished && (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            {finished.length === phrases.length
              ? 'Every phrase held up at every interval. Now go and lock in the score.'
              : 'Phrases that slipped stay on your list — the next drill will bring them back.'}
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              to={`/lesson/${lesson.id}`}
              className="px-4 py-2 rounded-full bg-green-700 text-white text-sm font-medium hover:bg-green-800"
            >
              Retry the conversation
            </Link>
            {lesson.practice?.length ? (
              <Link
                to={`/lesson/${lesson.id}/practice`}
                className="px-4 py-2 rounded-full border border-green-700 text-green-800 text-sm font-medium hover:bg-green-50"
              >
                Retry the practice
              </Link>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
