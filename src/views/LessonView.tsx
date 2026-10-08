import { EditPencil } from '../components/EditPencil';
import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useLessonWithNeighbors } from '../hooks/useLessons';
import { DialoguePlayer } from '../components/DialoguePlayer';
import { VocabEntry } from '../components/VocabEntry';
import { LessonFlashcards } from '../components/LessonFlashcards';
import { DrillPrompt, LessonGateStatus, LockedLesson } from '../components/LessonGate';
import { setLessonComplete } from '../storage';
import { GrammarChips } from '../components/GrammarChips';
import { LevelUpModal } from '../components/LevelUp';
import { THEME_LABELS, claimLevelUp, levelInfo, themeVisit } from '../lib/levels';
import {
  PASS_THRESHOLD,
  getLessonScores,
  isLessonPassed,
  isLessonUnlocked,
  pct,
  recordDialogueAttempt,
  type AttemptResult,
} from '../lib/lessonScores';
import { useRoam } from '../lib/roam';
import { typingModeFor } from '../lib/typing';
import { useAdmin } from '../components/adminContext';

export function LessonView() {
  const { id } = useParams<{ id: string }>();
  const roaming = useRoam();
  const { isAdmin, openDirect } = useAdmin();
  const { lessons, lesson, previous, next } = useLessonWithNeighbors(id ?? '');
  // Only reflects THIS playthrough — the persisted scores drive the gate.
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [rec, setRec] = useState(() => getLessonScores(id ?? ''));
  // Bumping this remounts DialoguePlayer for a fresh attempt.
  const [attempt, setAttempt] = useState(0);
  const [levelUp, setLevelUp] = useState<number | null>(null);
  const [showAllGrammar, setShowAllGrammar] = useState(false);

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

  function handleComplete(r: AttemptResult) {
    setLessonComplete(lesson!.id);
    setRec(recordDialogueAttempt(lesson!.id, r));
    setResult(r);
    setLevelUp(claimLevelUp(lessons, lesson!.level));
  }

  function replay() {
    setResult(null);
    setAttempt((n) => n + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const ratio = result ? (result.total ? result.firstTryCorrect / result.total : 1) : 0;
  const passedThisRun = result ? ratio >= PASS_THRESHOLD : false;
  const lessonPassed = isLessonPassed(lesson, rec);
  const lvl = levelInfo(lesson.level);
  const theme = lesson.theme ? THEME_LABELS[lesson.theme] : undefined;
  const visit = themeVisit(lessons, lesson);
  const focus = lesson.grammarFocus ?? [];
  const otherGrammar = (lesson.grammar ?? []).filter((g) => !focus.includes(g));

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
      {levelUp !== null && <LevelUpModal level={levelUp} lessons={lessons} onClose={() => setLevelUp(null)} />}
      <div>
        <Link to="/" className="text-sm text-gray-400 hover:text-gray-600">
          ← Lessons
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">
          {lesson.title}{' '}
          <EditPencil target={{ targetType: 'lesson.title', label: 'Lesson title', currentText: lesson.title, lessonId: lesson.id }} />
        </h1>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-xs text-gray-500">
            {lvl.emoji} Level {lesson.level} · {lvl.name}
          </span>
          {theme && (
            <span className="text-xs text-gray-500">
              {theme.emoji} {theme.label}
              {visit > 1 ? ` · visit ${visit} — richer Swahili this time` : ''}
            </span>
          )}
          {lesson.practice?.length ? (
            <Link
              to={`/lesson/${lesson.id}/practice`}
              className="text-xs text-green-700 hover:underline"
            >
              Skip to practice →
            </Link>
          ) : null}
        </div>
        <div className="mt-4">
          <LessonGateStatus lesson={lesson} next={next} rec={rec} />
        </div>
      </div>

      <section>
        <h2 className="text-xs uppercase tracking-wide text-gray-400 font-semibold mb-2">
          Context
        </h2>
        <p className="text-gray-700 leading-relaxed">
          {lesson.culturalNote}{' '}
          <EditPencil target={{ targetType: 'lesson.culturalNote', label: 'Context paragraph', currentText: lesson.culturalNote, lessonId: lesson.id }} />
        </p>
        <p className="text-gray-500 text-sm italic mt-2">
          {lesson.startingPoint}{' '}
          <EditPencil target={{ targetType: 'lesson.startingPoint', label: 'Scene setter', currentText: lesson.startingPoint, lessonId: lesson.id }} />
        </p>
        <p className="text-gray-400 text-xs mt-2">
          Tap 🔊 on any line to hear it spoken. Tap an underlined word for its meaning, Sanifu form and grammar.
        </p>
      </section>

      {(focus.length > 0 || otherGrammar.length > 0) && (
        <section>
          <h2 className="text-xs uppercase tracking-wide text-gray-400 font-semibold mb-2">
            Grammar in this lesson
          </h2>
          <GrammarChips slugs={focus.length ? focus : otherGrammar.slice(0, 4)} emphasize={focus} />
          {focus.length > 0 && otherGrammar.length > 0 && (
            <div className="mt-2">
              {showAllGrammar ? (
                <GrammarChips slugs={otherGrammar} size="xs" />
              ) : (
                <button
                  type="button"
                  onClick={() => setShowAllGrammar(true)}
                  className="text-xs text-green-700 hover:underline"
                >
                  + {otherGrammar.length} more structures you'll meet
                </button>
              )}
            </div>
          )}
        </section>
      )}

      <section>
        <div className="flex items-center justify-between gap-2 mb-4">
          <h2 className="text-xs uppercase tracking-wide text-gray-400 font-semibold">Conversation</h2>
          {isAdmin && (
            <button
              type="button"
              onClick={() => openDirect(lesson.id, 'dialogue')}
              className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-3 py-1 hover:bg-amber-100"
            >
              ✨ Direct this conversation
            </button>
          )}
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <DialoguePlayer key={`${attempt}-${roaming}`} turns={lesson.turns} onComplete={handleComplete} review={roaming} typing={typingModeFor(lesson.level)} />
        </div>
      </section>

      {(result || roaming) && (
        <section className="pb-16 space-y-4">
          {result && !roaming && (
          <div
            className={`rounded-xl border p-4 ${
              passedThisRun ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'
            }`}
          >
            <p className={`font-semibold ${passedThisRun ? 'text-green-800' : 'text-amber-900'}`}>
              {result.firstTryCorrect} / {result.total} on the first try ({pct(ratio)})
            </p>
            <p className={`text-sm mt-0.5 ${passedThisRun ? 'text-green-700/80' : 'text-amber-800/80'}`}>
              {passedThisRun
                ? lesson.practice?.length && !lessonPassed
                  ? 'Conversation passed. Now pass the practice session to unlock the next lesson.'
                  : 'Conversation passed.'
                : `You need ${pct(PASS_THRESHOLD)} to pass. Drill the lines you missed, then play it again.`}
            </p>
            <button
              onClick={replay}
              className="mt-3 px-4 py-1.5 rounded-full border border-current text-sm font-medium text-gray-700 hover:bg-white"
            >
              Play the conversation again
            </button>
          </div>
          )}

          {!roaming && <DrillPrompt lesson={lesson} rec={rec} />}

          {lesson.practice?.length ? (
            <Link
              to={`/lesson/${lesson.id}/practice`}
              className="block rounded-xl border border-green-200 bg-green-50 p-4 hover:border-green-400 transition-colors"
            >
              <p className="font-semibold text-green-800">Practice session →</p>
              <p className="text-sm text-green-700/80 mt-0.5">
                {lesson.practice.length} quick fill-the-gap lines using the words and verb forms from this conversation.
              </p>
            </Link>
          ) : null}

          {(lessonPassed || roaming) && next && (
            <Link
              to={`/lesson/${next.id}`}
              className="block rounded-xl border border-green-300 bg-white p-4 hover:border-green-500 transition-colors"
            >
              <p className="font-semibold text-green-800">Next lesson: {next.title} →</p>
            </Link>
          )}

          <div>
            <h2 className="text-xs uppercase tracking-wide text-gray-400 font-semibold mb-2">
              Key vocabulary ({lesson.vocabulary.length} terms)
            </h2>
            <div className="divide-y divide-gray-100">
              {lesson.vocabulary.map((entry) => (
                <VocabEntry key={entry.id} entry={entry} />
              ))}
            </div>
          </div>
          <div>
            <h2 className="text-xs uppercase tracking-wide text-gray-400 font-semibold mb-2">
              Flashcards
            </h2>
            <LessonFlashcards entries={lesson.vocabulary} />
          </div>
        </section>
      )}
    </div>
  );
}
