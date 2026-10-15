import type { Lesson } from '../types';
import { EditPencil } from '../components/EditPencil';
import { useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useLessonWithNeighbors } from '../hooks/useLessons';
import { DialoguePlayer } from '../components/DialoguePlayer';
import { VocabEntry } from '../components/VocabEntry';
import { LessonFlashcards } from '../components/LessonFlashcards';
import { DrillPrompt, ExitButton, LessonGateStatus, LockedLesson, PracticeKey } from '../components/LessonGate';
import { setLessonComplete } from '../storage';
import { GrammarChips } from '../components/GrammarChips';
import { GrammarPrimer } from '../components/GrammarPrimer';
import { LevelUpModal } from '../components/LevelUp';
import { THEME_LABELS, claimLevelUp, levelInfo, themeVisit } from '../lib/levels';
import {
  PASS_THRESHOLD,
  getLessonScores,
  isLessonPassed,
  isLessonUnlocked,
  pct,
  recordDialogueAttempt,
  sectionPassed,
  type AttemptResult,
} from '../lib/lessonScores';
import { useRoam } from '../lib/roam';
import { typingModeFor } from '../lib/typing';
import { fmtScore } from '../lib/aiCheck';
import { useAdmin } from '../components/adminContext';

export function LessonView() {
  const { id } = useParams<{ id: string }>();
  const roaming = useRoam();
  const { isAdmin, openDirect, openCast } = useAdmin();
  const { lessons, lesson, previous, next } = useLessonWithNeighbors(id ?? '');
  // Only reflects THIS playthrough — the persisted scores drive the gate.
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [rec, setRec] = useState(() => getLessonScores(id ?? ''));
  // Bumping this remounts DialoguePlayer for a fresh attempt.
  const [attempt, setAttempt] = useState(0);
  const [levelUp, setLevelUp] = useState<number | null>(null);
  const [showAllGrammar, setShowAllGrammar] = useState(false);
  // Typing levels play the conversation twice: round 1 with answer choices, round 2 typed (scored).
  const [round, setRound] = useState<1 | 2>(1);
  const [round1, setRound1] = useState<AttemptResult | null>(null);
  // A repeat of a conversation the learner already passed can be left at any time.
  const [exited, setExited] = useState(false);
  const convoRef = useRef<HTMLElement>(null);
  const afterRef = useRef<HTMLElement>(null);

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

  function replay(from: 1 | 2 = 1) {
    setExited(false);
    setResult(null);
    if (from === 1) setRound1(null);
    setRound(from);
    setAttempt((n) => n + 1);
    if (from === 1) window.scrollTo({ top: 0, behavior: 'smooth' });
    else convoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function startRound2() {
    setRound(2);
    setAttempt((n) => n + 1);
    convoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  const typingMode = typingModeFor(lesson.level);
  const canExit = !roaming && !exited && !result && sectionPassed(rec.dialogue);
  const twoRounds = Boolean(typingMode) && !roaming;
  const ratio = result ? (result.total ? result.firstTryCorrect / result.total : 1) : 0;
  const passedThisRun = result ? ratio >= PASS_THRESHOLD : false;
  const lessonPassed = isLessonPassed(lesson, rec);
  const lvl = levelInfo(lesson.level);
  const theme = lesson.theme ? THEME_LABELS[lesson.theme] : undefined;
  const visit = themeVisit(lessons, lesson);
  const focus = lesson.grammarFocus ?? [];
  // Only grammar the lesson really uses (its lines and practice), most-used first.
  const otherGrammar = usedGrammar(lesson).filter((g) => !focus.includes(g));

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

      <GrammarPrimer
        lesson={lesson}
        slugs={focus.length ? focus : otherGrammar.slice(0, 2)}
        onStart={() => convoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
      />
      {otherGrammar.length > (focus.length ? 0 : 2) && (
        <div className="-mt-4">
          {showAllGrammar ? (
            <div className="space-y-1.5">
              <p className="text-xs text-gray-500">Also in this lesson:</p>
              <GrammarChips slugs={focus.length ? otherGrammar : otherGrammar.slice(2)} size="xs" />
            </div>
          ) : (
            <button type="button" onClick={() => setShowAllGrammar(true)} className="text-xs text-green-700 hover:underline">
              + {focus.length ? otherGrammar.length : otherGrammar.length - 2} more structures you'll meet
            </button>
          )}
        </div>
      )}

      <section ref={convoRef} className="scroll-mt-20">
        <div className="flex items-center justify-between gap-2 mb-4">
          <h2 className="text-xs uppercase tracking-wide text-gray-400 font-semibold">Conversation</h2>
          {canExit && (
            <ExitButton
              label="Exit — already passed"
              hint="You've passed this conversation before — leave this replay any time."
              onExit={() => {
                setExited(true);
                setTimeout(() => afterRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
              }}
            />
          )}
          {isAdmin && (
            <div className="flex flex-wrap justify-end gap-1.5">
              <button
                type="button"
                onClick={() => openCast(lesson.id)}
                className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-3 py-1 hover:bg-amber-100"
              >
                ✎ Names & voices
              </button>
              <button
                type="button"
                onClick={() => openDirect(lesson.id, 'dialogue')}
                className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-3 py-1 hover:bg-amber-100"
              >
                ✨ Direct this conversation
              </button>
            </div>
          )}
        </div>
        {exited ? (
          <div className="rounded-xl border border-green-200 bg-green-50 p-4" data-testid="convo-exited">
            <p className="font-semibold text-green-800">
              ✓ You’ve passed this conversation{rec.dialogue ? ` — best ${pct(rec.dialogue.best)}` : ''}.
            </p>
            <button
              type="button"
              onClick={() => replay(1)}
              className="mt-3 px-4 py-1.5 rounded-full border border-green-700 text-sm font-medium text-green-800 hover:bg-white"
            >
              Play it again
            </button>
          </div>
        ) : (
        <>
        {twoRounds && <RoundSteps round={round} round1Done={Boolean(round1)} round2Done={Boolean(result)} />}
        <div className="bg-gray-50 rounded-lg p-4">
          <DialoguePlayer
            key={`${attempt}-${roaming}-${round}`}
            turns={lesson.turns}
            voices={lesson.voices}
            focus={lesson.grammarFocus}
            onComplete={twoRounds && round === 1 ? (r) => setRound1(r) : handleComplete}
            review={roaming}
            typing={twoRounds && round === 1 ? undefined : typingMode}
            roundLabel={twoRounds ? (round === 1 ? 'Round 1 of 2' : 'Round 2 of 2') : undefined}
          />
        </div>
        {twoRounds && round === 1 && round1 && (
          <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4" data-testid="round1-done">
            <p className="font-semibold text-green-800">
              ✓ Round 1 of 2 done — {fmtScore(round1.firstTryCorrect)} / {round1.total} right on the first try
            </p>
            <p className="text-sm text-green-700/90 mt-0.5">
              Next up, round 2: the same conversation, but now you type your lines. Round 2 is the one that counts.
            </p>
            <button
              onClick={startRound2}
              className="mt-3 px-4 py-2 rounded-full bg-green-700 text-white text-sm font-semibold hover:bg-green-800"
            >
              Start round 2 — type it →
            </button>
          </div>
        )}
        </>
        )}
      </section>

      {(result || roaming || exited) && (
        <section ref={afterRef} className="pb-16 space-y-4 scroll-mt-20">
          {result && !roaming && (
          <div
            className={`rounded-xl border p-4 ${
              passedThisRun ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'
            }`}
          >
            <p className={`font-semibold ${passedThisRun ? 'text-green-800' : 'text-amber-900'}`}>
              {fmtScore(result.firstTryCorrect)} / {result.total} on the first try ({pct(ratio)})
            </p>
            <p className={`text-sm mt-0.5 ${passedThisRun ? 'text-green-700/80' : 'text-amber-800/80'}`}>
              {passedThisRun
                ? lesson.practice?.length && !lessonPassed
                  ? 'Conversation passed — step 1 of 2 done. The practice session below is your key to the next lesson.'
                  : 'Conversation passed.'
                : `You need ${pct(PASS_THRESHOLD)} to pass. Drill the lines you missed, then play it again.`}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={() => replay(1)}
                className="px-4 py-1.5 rounded-full border border-current text-sm font-medium text-gray-700 hover:bg-white"
              >
                Play the conversation again
              </button>
              {twoRounds && (
                <button
                  onClick={() => replay(2)}
                  className="px-4 py-1.5 rounded-full border border-current text-sm font-medium text-gray-700 hover:bg-white"
                >
                  Type it again (round 2)
                </button>
              )}
            </div>
          </div>
          )}

          {!roaming && !lessonPassed && !sectionPassed(rec.practice) && <PracticeKey lesson={lesson} next={next} rec={rec} />}

          {!roaming && <DrillPrompt lesson={lesson} rec={rec} />}

          {(roaming || lessonPassed || sectionPassed(rec.practice)) && <PracticeKey lesson={lesson} next={next} rec={rec} />}

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

/** "1 · Choose → 2 · Type": where the learner is in a typing-level conversation. */
function RoundSteps({ round, round1Done, round2Done }: { round: 1 | 2; round1Done: boolean; round2Done: boolean }) {
  const step = (n: 1 | 2, label: string, done: boolean) => {
    const current = round === n && !done;
    return (
      <li
        className={`flex-1 rounded-full px-3 py-1.5 text-xs font-semibold text-center border ${
          done
            ? 'bg-green-100 border-green-300 text-green-800'
            : current
            ? 'bg-white border-green-600 text-green-800 ring-2 ring-green-100'
            : 'bg-white border-gray-200 text-gray-400'
        }`}
        aria-current={current ? 'step' : undefined}
      >
        {done ? '✓ ' : `${n} · `}
        {label}
      </li>
    );
  };
  return (
    <ol className="flex items-center gap-2 mb-3" aria-label="Rounds" data-testid="round-steps">
      {step(1, 'Choose the line', round1Done || round === 2)}
      <span aria-hidden="true" className="text-gray-300">→</span>
      {step(2, 'Type it', round2Done)}
    </ol>
  );
}

/** Grammar topics the lesson's lines and practice items link to, most-used first. */
function usedGrammar(lesson: Lesson): string[] {
  const count = new Map<string, number>();
  const add = (gs?: string[]) => gs?.forEach((g) => count.set(g, (count.get(g) ?? 0) + 1));
  for (const t of lesson.turns) for (const w of t.words) add(w.grammar);
  for (const p of lesson.practice ?? []) add(p.grammar);
  return [...count.entries()].sort((a, b) => b[1] - a[1]).map(([g]) => g);
}
