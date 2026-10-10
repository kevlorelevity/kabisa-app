import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { PracticeItem, PracticeOption } from '../types';
import type { AttemptResult } from '../lib/lessonScores';
import { AudioButton } from './AudioButton';
import { GrammarChips } from './GrammarChips';
import { EditPencil } from './EditPencil';
import { practiceTarget } from './adminTargets';
import { TypedAnswer } from './TypedAnswer';
import type { TypingMode } from '../lib/typing';

interface PracticeSessionProps {
  items: PracticeItem[];
  /** Called once with the first-try score when the last item is answered. */
  onFinish?: (result: AttemptResult) => void;
  /** Extra content (pass/fail, next steps) shown on the results card. */
  resultSlot?: ReactNode;
  /** Admin Roam: every item arrives already answered (in authored order); nothing is scored. */
  review?: boolean;
  /** Levels 5+: type the gap ('partial') or the whole sentence ('complete') instead of tapping chips. */
  typing?: TypingMode;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function PracticeSession({ items, onFinish, resultSlot, review = false, typing }: PracticeSessionProps) {
  // Bumping `round` reshuffles item order and chip order for "Practice again".
  const [round, setRound] = useState(0);
  const order = useMemo(() => (review ? items : shuffle(items)), [items, round, review]); // eslint-disable-line react-hooks/exhaustive-deps
  const [index, setIndex] = useState(0);
  const [wrongPicks, setWrongPicks] = useState<string[]>([]);
  const [solved, setSolved] = useState(review);
  const [firstTry, setFirstTry] = useState(0);
  const [missed, setMissed] = useState<string[]>([]);
  const [finished, setFinished] = useState(false);

  const item = order[index];
  const chips = useMemo(() => (item ? shuffle(item.options) : []), [item]);
  const endRef = useRef<HTMLDivElement>(null);

  // Phones: the chips / Next button sit in a tray pinned to the bottom of the
  // screen; move the floating Feedback button out of its way while it's there.
  useEffect(() => {
    if (finished || items.length === 0) return;
    document.body.classList.add('ksa-answer-tray');
    return () => document.body.classList.remove('ksa-answer-tray');
  }, [finished, items.length]);

  // Bring the explanation (and the next item) into view — not on arrival, so the intro stays readable.
  const started = useRef(false);
  useEffect(() => {
    if (!started.current) {
      started.current = true;
      return;
    }
    endRef.current?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
  }, [solved, index]);

  if (items.length === 0) return null;

  if (finished && review) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center space-y-3">
        <p className="text-xs uppercase tracking-wide text-amber-700 font-semibold">Roam · end of practice</p>
        <p className="text-sm text-amber-900">
          You've seen all {items.length} lines with their answers. Nothing was scored.
        </p>
        <button
          onClick={() => {
            setIndex(0);
            setSolved(true);
            setFinished(false);
          }}
          className="mt-2 px-4 py-2 rounded-full bg-amber-500 text-white text-sm font-medium hover:bg-amber-600"
        >
          Back to the first line
        </button>
      </div>
    );
  }

  if (finished) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 text-center space-y-3">
        <p className="text-xs uppercase tracking-wide text-gray-400 font-semibold">
          Practice complete
        </p>
        <p className="text-3xl font-bold text-gray-900">
          {firstTry} / {items.length}
        </p>
        <p className="text-sm text-gray-500">right on the first try</p>
        {resultSlot}
        <button
          onClick={() => {
            setRound((r) => r + 1);
            setIndex(0);
            setWrongPicks([]);
            setSolved(review);
            setFirstTry(0);
            setMissed([]);
            setFinished(false);
          }}
          className="mt-2 px-4 py-2 rounded-full bg-green-700 text-white text-sm font-medium hover:bg-green-800"
        >
          Practice again
        </button>
      </div>
    );
  }

  function pick(opt: PracticeOption) {
    if (solved || wrongPicks.includes(opt.text)) return;
    if (opt.correct) {
      if (wrongPicks.length === 0) setFirstTry((n) => n + 1);
      setSolved(true);
    } else {
      setWrongPicks((w) => [...w, opt.text]);
      setMissed((m) => (m.includes(item.id) ? m : [...m, item.id]));
    }
  }

  function typedMiss() {
    setWrongPicks((w) => (w.length ? w : ['(typed)']));
    setMissed((m) => (m.includes(item.id) ? m : [...m, item.id]));
  }

  function typedSolved() {
    if (wrongPicks.length === 0) setFirstTry((n) => n + 1);
    setSolved(true);
  }

  function next() {
    if (index + 1 >= order.length) {
      setFinished(true);
      if (review) return;
      onFinish?.({
        firstTryCorrect: firstTry,
        total: order.length,
        attemptedIds: order.map((i) => i.id),
        missedIds: missed,
      });
      return;
    }
    setIndex((i) => i + 1);
    setWrongPicks([]);
    setSolved(review);
  }

  const answer = item.options.find((o) => o.correct)!;
  const lastWrong = wrongPicks.length
    ? item.options.find((o) => o.text === wrongPicks[wrongPicks.length - 1])
    : undefined;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>
          {item.mode === 'translate' ? 'Say it in Swahili' : 'Fill the gap'}
        </span>
        <span>
          {index + 1} of {order.length}
        </span>
      </div>
      <div className="h-1 rounded-full bg-gray-100 overflow-hidden">
        <div
          className="h-full bg-green-600 transition-all"
          style={{ width: `${((index + (solved ? 1 : 0)) / order.length) * 100}%` }}
        />
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-3">
        {(item.mode === 'translate' || (typing === 'complete' && !solved)) && (
          <p className="text-gray-700" data-testid="practice-english">
            {item.english}
          </p>
        )}
        {typing === 'complete' && !solved ? (
          <p className="text-sm text-gray-400" data-testid="practice-sentence">Type the whole sentence in Swahili.</p>
        ) : (
        <p className="text-xl font-semibold text-gray-900" data-testid="practice-sentence">
          {item.before}
          {solved ? (
            <span className="text-green-700 underline decoration-green-300 decoration-2 underline-offset-4">
              {answer.text}
            </span>
          ) : (
            <span
              aria-label="blank"
              className="inline-block min-w-20 px-2 mx-0.5 rounded-md bg-gray-100 text-gray-400 text-center tracking-widest"
            >
              …
            </span>
          )}
          {item.after}
        </p>
        )}
        <div className="flex gap-1">
          <EditPencil target={practiceTarget(item)} />
        </div>
        {item.mode === 'complete' && solved && (
          <p className="text-sm text-gray-500">{item.english}</p>
        )}
        {solved && (
          <div className="flex items-center gap-1 text-sm text-gray-500 -ml-1.5">
            <AudioButton text={`${item.before}${answer.text}${item.after}`} />
            <span>Hear the full line</span>
          </div>
        )}
      </div>

      {solved && (
        <div className="text-sm text-gray-700 bg-green-50 border border-green-100 rounded-lg px-4 py-3 space-y-2">
          <p>
            {item.explanation}{' '}
            <EditPencil
              target={{ targetType: 'practice.explanation', label: 'Practice · explanation', currentText: item.explanation, itemId: item.id }}
            />
          </p>
          {item.note && (
            <p className="text-xs text-amber-900">
              <span className="font-semibold">💡 Note · </span>
              {item.note}
            </p>
          )}
          {item.grammar?.length ? <GrammarChips slugs={item.grammar.slice(0, 3)} size="xs" /> : null}
          {review && (
            <p className="text-xs text-gray-500 pt-1" aria-label="Answer choices">
              Choices:{' '}
              {item.options.map((o, i) => (
                <span key={o.text}>
                  {i > 0 && ' · '}
                  <span className={o.correct ? 'text-green-800 font-semibold' : 'line-through text-gray-400'}>
                    {o.correct ? '✓ ' : ''}
                    {o.text}
                  </span>
                </span>
              ))}
            </p>
          )}
        </div>
      )}

      <div ref={endRef} aria-hidden="true" />

      <div
        data-testid="practice-tray"
        className="sticky bottom-0 z-20 -mx-4 px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] bg-white/95 backdrop-blur border-t border-gray-200 shadow-[0_-6px_16px_-10px_rgba(0,0,0,0.25)] sm:static sm:mx-0 sm:px-0 sm:pt-0 sm:pb-0 sm:bg-transparent sm:backdrop-blur-none sm:border-0 sm:shadow-none"
      >
        {solved ? (
          <div className="flex gap-2">
          {review && index > 0 && (
            <button
              onClick={() => setIndex((i) => i - 1)}
              className="px-5 py-3 sm:py-2 rounded-full border border-gray-300 text-gray-700 text-base sm:text-sm font-medium hover:bg-gray-50"
            >
              ← Back
            </button>
          )}
          <button
            onClick={next}
            className="w-full sm:w-auto px-5 py-3 sm:py-2 rounded-full bg-green-700 text-white text-base sm:text-sm font-semibold sm:font-medium hover:bg-green-800"
          >
            {index + 1 >= order.length ? (review ? 'Finish' : 'See results') : 'Next →'}
          </button>
          </div>
        ) : typing ? (
          <TypedAnswer
            key={`${round}-${item.id}`}
            wide={typing === 'complete'}
            accepted={typing === 'complete' ? [`${item.before}${answer.text}${item.after}`] : [answer.text]}
            placeholder={typing === 'complete' ? 'Type the sentence…' : 'Type the missing word…'}
            onMiss={typedMiss}
            onSolved={typedSolved}
          />
        ) : (
          <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {chips.map((opt) => {
                  const isWrong = wrongPicks.includes(opt.text);
                  const isCorrect = solved && opt.correct;
                  return (
                    <button
                      key={opt.text}
                      onClick={() => pick(opt)}
                      disabled={solved || isWrong}
                      className={`px-4 py-2 rounded-full border text-sm font-medium transition-colors disabled:cursor-default ${
                        isCorrect
                          ? 'border-green-500 bg-green-50 text-green-800'
                          : isWrong
                          ? 'border-red-300 bg-red-50 text-red-400 line-through'
                          : solved
                          ? 'border-gray-100 bg-white text-gray-300'
                          : 'border-gray-200 bg-white hover:border-green-400 hover:bg-green-50/50'
                      }`}
                    >
                      {opt.text}
                    </button>
                  );
                })}
              </div>

              {!solved && lastWrong && (
                <p className="text-red-600 text-sm">
                  {lastWrong.feedback ?? 'Not quite.'} Try again.
                </p>
              )}

          </div>
        )}
      </div>
    </div>
  );
}
