import { useEffect, useMemo, useRef, useState } from 'react';
import type { DialogueTurn } from '../types';
import type { AttemptResult } from '../lib/lessonScores';
import { TappableSwahili } from './TappableSwahili';
import { AudioButton } from './AudioButton';
import { EditPencil } from './EditPencil';

interface DialoguePlayerProps {
  turns: DialogueTurn[];
  /** Fires once at the end with the learner's first-try score on their own lines. */
  onComplete: (result: AttemptResult) => void;
}

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

/** Auto turns pause briefly before appearing, so a reply reads as a reply rather than a jump-cut. */
const AUTO_TURN_DELAY_MS = 500;
/** How long a correct pick stays highlighted green before the transcript advances. */
const CORRECT_ADVANCE_DELAY_MS = 600;

export function DialoguePlayer({ turns, onComplete }: DialoguePlayerProps) {
  const [revealedCount, setRevealedCount] = useState(0);
  const [wrongPick, setWrongPick] = useState<string | null>(null);
  const [correctPick, setCorrectPick] = useState<string | null>(null);
  // User turns where the first pick was wrong — drives the score and the drill.
  const [missed, setMissed] = useState<string[]>([]);

  const done = revealedCount >= turns.length;
  const current = done ? null : turns[revealedCount];

  const shuffledOptions = useMemo(() => {
    if (!current?.options) return [];
    return shuffle(current.options);
  }, [current]);

  // Auto turns (the other speaker's scripted reply) advance on their own
  // after a short pause. User turns wait for a correct MCQ pick.
  useEffect(() => {
    if (!current || current.role !== 'auto') return;
    const t = setTimeout(() => {
      setRevealedCount((n) => n + 1);
    }, AUTO_TURN_DELAY_MS);
    return () => clearTimeout(t);
  }, [current]);

  useEffect(() => {
    if (!done) return;
    const userTurns = turns.filter((t) => t.role === 'user').map((t) => t.id);
    onComplete({
      firstTryCorrect: userTurns.length - missed.length,
      total: userTurns.length,
      attemptedIds: userTurns,
      missedIds: missed,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  function pick(swahili: string, correct: boolean) {
    if (correctPick) return; // already advancing
    if (correct) {
      setWrongPick(null);
      setCorrectPick(swahili);
      setTimeout(() => {
        setCorrectPick(null);
        setRevealedCount((n) => n + 1);
      }, CORRECT_ADVANCE_DELAY_MS);
    } else {
      setWrongPick(swahili);
      const id = current?.id;
      if (id) setMissed((m) => (m.includes(id) ? m : [...m, id]));
    }
  }

  const settled = turns.slice(0, revealedCount);
  const endRef = useRef<HTMLDivElement>(null);
  const answering = current?.role === 'user';

  // Keep the newest line and the answer options in view as the chat grows.
  useEffect(() => {
    if (revealedCount === 0) return;
    endRef.current?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
  }, [revealedCount, answering]);

  // While the answer tray is pinned to the bottom, tell the page so the
  // floating Feedback button moves out of its way on phones.
  useEffect(() => {
    if (!answering) return;
    document.body.classList.add('ksa-answer-tray');
    return () => document.body.classList.remove('ksa-answer-tray');
  }, [answering]);

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {settled.map((turn) => (
          <TurnBubble key={turn.id} turn={turn} tappable />
        ))}

        {current?.role === 'auto' && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-2xl rounded-bl-sm bg-gray-100 px-4 py-2.5">
              <span className="inline-flex gap-1 py-1">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" />
              </span>
            </div>
          </div>
        )}
      </div>

      {current?.role === 'user' && (
        <div
          data-testid="answer-tray"
          className="sticky bottom-0 z-20 -mx-4 px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] bg-white/95 backdrop-blur border-t border-gray-200 shadow-[0_-6px_16px_-10px_rgba(0,0,0,0.25)] sm:mx-0 sm:px-0 sm:pt-1 sm:pb-0 sm:bg-transparent sm:backdrop-blur-none sm:border-0 sm:shadow-none sm:static"
        >
          <p className="text-xs uppercase tracking-wide text-gray-400 font-semibold mb-1.5 sm:mb-2">
            Your turn as {current.speaker} — what do you say?
          </p>
          <div className="flex flex-col gap-1.5 sm:gap-2">
            {shuffledOptions.map((opt) => {
              const isWrong = wrongPick === opt.swahili;
              const isCorrect = correctPick === opt.swahili;
              return (
                <div key={opt.swahili} className="flex items-center gap-1.5">
                <button
                  onClick={() => pick(opt.swahili, opt.correct)}
                  disabled={Boolean(correctPick)}
                  className={`flex-1 text-left px-4 py-2.5 rounded-full border text-sm font-medium transition-colors disabled:cursor-default ${
                    isCorrect
                      ? 'border-green-500 bg-green-50 text-green-800'
                      : isWrong
                      ? 'border-red-400 bg-red-50 text-red-700'
                      : 'border-gray-200 bg-white hover:border-green-400 hover:bg-green-50/50'
                  }`}
                >
                  {opt.swahili}
                </button>
                <EditPencil
                  target={{
                    targetType: opt.correct ? 'turn.option.correct' : 'turn.option.distractor',
                    label: `${opt.correct ? 'Correct answer' : 'Wrong option'} · ${current.speaker}'s turn`,
                    currentText: opt.swahili,
                    itemId: current.id,
                  }}
                />
                </div>
              );
            })}
          </div>
          {wrongPick && !correctPick && (
            <p className="text-red-600 text-xs mt-2">
              Not quite — that's not what {current.speaker} says here. Try again.
            </p>
          )}
        </div>
      )}

      <div ref={endRef} aria-hidden="true" />

      {done && (
        <p className="text-green-700 text-sm font-medium pt-1">
          Conversation complete! Tap any word above to review what it means.
        </p>
      )}
    </div>
  );
}

function TurnBubble({ turn, tappable }: { turn: DialogueTurn; tappable: boolean }) {
  const isUser = turn.role === 'user';
  const [showSanifu, setShowSanifu] = useState(false);
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className="max-w-[80%]">
        <p
          className={`text-xs font-semibold mb-1 ${
            isUser ? 'text-right text-green-700' : 'text-gray-500'
          }`}
        >
          {turn.speaker}
        </p>
        <div
          className={`rounded-2xl px-4 py-2.5 ${
            isUser
              ? 'rounded-br-sm bg-green-700 text-white'
              : 'rounded-bl-sm bg-gray-100 text-gray-900'
          }`}
        >
          <div className="flex items-start gap-1.5">
            <TappableSwahili
              swahili={turn.swahili}
              words={turn.words}
              enabled={tappable}
              className="font-medium flex-1"
              variant={isUser ? 'dark' : 'light'}
            />
            <AudioButton text={turn.swahili} variant={isUser ? 'dark' : 'light'} className="-mr-2 -my-0.5" />
          </div>
        </div>
        <div className={`flex gap-1 mt-1 ${isUser ? 'justify-end' : ''}`}>
          <EditPencil hint="SW" target={{ targetType: 'turn.swahili', label: `Line · ${turn.speaker}`, currentText: turn.swahili, itemId: turn.id }} />
          <EditPencil hint="EN" target={{ targetType: 'turn.english', label: `English translation · ${turn.speaker}`, currentText: turn.english, itemId: turn.id }} />
        </div>
        <p className={`text-xs text-gray-400 mt-1 ${isUser ? 'text-right' : ''}`}>
          {turn.english}
          {turn.sanifu && (
            <button
              type="button"
              onClick={() => setShowSanifu((v) => !v)}
              className="ml-2 text-sky-700 hover:underline"
            >
              {showSanifu ? 'Sanifu ↑' : 'Sanifu →'}
            </button>
          )}
        </p>
        {showSanifu && turn.sanifu && (
          <p className={`text-xs text-sky-800 mt-0.5 ${isUser ? 'text-right' : ''}`}>
            <span className="font-semibold">Sanifu:</span> {turn.sanifu}
          </p>
        )}
      </div>
    </div>
  );
}
