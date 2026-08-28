import { useEffect, useMemo, useState } from 'react';
import type { DialogueTurn } from '../types';
import { TappableSwahili } from './TappableSwahili';

interface DialoguePlayerProps {
  turns: DialogueTurn[];
  onComplete: () => void;
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
    if (done) onComplete();
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
    }
  }

  const settled = turns.slice(0, revealedCount);

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
        <div className="pt-1">
          <p className="text-xs uppercase tracking-wide text-gray-400 font-semibold mb-2">
            Your turn as {current.speaker} — what do you say?
          </p>
          <div className="flex flex-col gap-2">
            {shuffledOptions.map((opt) => {
              const isWrong = wrongPick === opt.swahili;
              const isCorrect = correctPick === opt.swahili;
              return (
                <button
                  key={opt.swahili}
                  onClick={() => pick(opt.swahili, opt.correct)}
                  disabled={Boolean(correctPick)}
                  className={`text-left px-4 py-2.5 rounded-full border text-sm font-medium transition-colors disabled:cursor-default ${
                    isCorrect
                      ? 'border-green-500 bg-green-50 text-green-800'
                      : isWrong
                      ? 'border-red-400 bg-red-50 text-red-700'
                      : 'border-gray-200 bg-white hover:border-green-400 hover:bg-green-50/50'
                  }`}
                >
                  {opt.swahili}
                </button>
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
          <TappableSwahili
            swahili={turn.swahili}
            words={turn.words}
            enabled={tappable}
            className="font-medium"
            variant={isUser ? 'dark' : 'light'}
          />
        </div>
        <p className={`text-xs text-gray-400 mt-1 ${isUser ? 'text-right' : ''}`}>
          {turn.english}
        </p>
      </div>
    </div>
  );
}
