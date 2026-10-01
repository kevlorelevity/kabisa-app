import { useEffect, useMemo, useState } from 'react';
import type { Lesson } from '../types';
import {
  advanceDrill,
  buildUpSteps,
  gapVariations,
  initDrill,
  type DrillPhrase,
  type GapVariation,
} from '../lib/drill';
import { speak } from '../lib/audio';
import { AudioButton } from './AudioButton';

interface DrillSessionProps {
  lesson: Lesson;
  phrases: DrillPhrase[];
  /** Fires once when the queue runs out, with the phrases that reached mastery. */
  onDone: (mastered: DrillPhrase[]) => void;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Fire-and-forget playback; missing audio is fine, the text is on screen. */
function say(text: string) {
  void speak(text);
}

export function DrillSession({ lesson, phrases, onDone }: DrillSessionProps) {
  const gaps = useMemo(() => phrases.map((p) => gapVariations(p, lesson)), [phrases, lesson]);
  const [state, setState] = useState(() => initDrill(phrases.length));
  const card = state.queue[0];
  const done = !card;
  const masteredCount = state.mastered.filter(Boolean).length;

  useEffect(() => {
    if (done) onDone(phrases.filter((_, i) => state.mastered[i]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  function resolve(result: 'done' | 'correct' | 'wrong') {
    setState((s) => advanceDrill(s, result, gaps.map((g) => g.length)));
  }

  if (done) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 text-center space-y-2">
        <p className="text-xs uppercase tracking-wide text-gray-400 font-semibold">Drill complete</p>
        <p className="text-3xl font-bold text-gray-900">
          {masteredCount} / {phrases.length}
        </p>
        <p className="text-sm text-gray-500">phrases recalled at every interval</p>
      </div>
    );
  }

  const phrase = phrases[card.phrase];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>
          {card.kind === 'buildup'
            ? 'Listen & build it up'
            : card.kind === 'recall'
            ? 'Say it before you hear it'
            : 'New variation'}
        </span>
        <span>
          {masteredCount} of {phrases.length} mastered
        </span>
      </div>
      <div className="h-1 rounded-full bg-gray-100 overflow-hidden">
        <div
          className="h-full bg-green-600 transition-all"
          style={{
            width: `${
              (state.levels.reduce((a, b) => a + Math.min(b, 3), 0) / (phrases.length * 3)) * 100
            }%`,
          }}
        />
      </div>

      {card.kind === 'buildup' && (
        <BuildUpCard key={state.cardsSeen} phrase={phrase} onDone={() => resolve('done')} />
      )}
      {card.kind === 'recall' && (
        <RecallCard key={state.cardsSeen} phrase={phrase} onResult={resolve} />
      )}
      {card.kind === 'gap' && gaps[card.phrase][card.variation] && (
        <GapCard
          key={state.cardsSeen}
          phrase={phrase}
          variation={gaps[card.phrase][card.variation]}
          onResult={resolve}
        />
      )}
      {card.kind === 'gap' && !gaps[card.phrase][card.variation] && (
        <RecallCard key={state.cardsSeen} phrase={phrase} onResult={resolve} />
      )}
    </div>
  );
}

// ---- cards ----

function BuildUpCard({ phrase, onDone }: { phrase: DrillPhrase; onDone: () => void }) {
  const steps = useMemo(() => buildUpSteps(phrase.swahili), [phrase.swahili]);
  const [step, setStep] = useState(0);
  const last = step === steps.length - 1;

  useEffect(() => {
    say(steps[step]);
  }, [step, steps]);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
      <p className="text-sm text-gray-500">
        “{phrase.english}” — listen, then repeat each piece out loud.
      </p>
      <div className="space-y-2">
        {steps.slice(0, step + 1).map((s, i) => (
          <div
            key={s}
            className={`flex items-center gap-2 ${i === step ? '' : 'opacity-40'}`}
          >
            <AudioButton text={s} size={i === step ? 'md' : 'sm'} />
            <span className={i === step ? 'text-xl font-semibold text-gray-900' : 'text-sm text-gray-600'}>
              {s}
            </span>
          </div>
        ))}
      </div>
      <button
        onClick={() => (last ? onDone() : setStep((n) => n + 1))}
        className="px-4 py-2 rounded-full bg-green-700 text-white text-sm font-medium hover:bg-green-800"
      >
        {last ? 'I said the whole line →' : 'I said it — add more →'}
      </button>
    </div>
  );
}

function RecallCard({
  phrase,
  onResult,
}: {
  phrase: DrillPhrase;
  onResult: (r: 'correct' | 'wrong') => void;
}) {
  const [revealed, setRevealed] = useState(false);

  function reveal() {
    setRevealed(true);
    say(phrase.swahili);
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
      <p className="text-xs uppercase tracking-wide text-gray-400 font-semibold">How do you say…</p>
      <p className="text-xl text-gray-800 font-medium">{phrase.english}</p>
      {!revealed ? (
        <>
          <p className="text-sm text-gray-500">Say it out loud in Swahili first, then check yourself.</p>
          <button
            onClick={reveal}
            className="px-4 py-2 rounded-full bg-green-700 text-white text-sm font-medium hover:bg-green-800"
          >
            Reveal & listen
          </button>
        </>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <AudioButton text={phrase.swahili} size="md" />
            <p className="text-xl font-semibold text-gray-900">{phrase.swahili}</p>
          </div>
          <p className="text-sm text-gray-500">Did you get it right?</p>
          <div className="flex gap-2">
            <button
              onClick={() => onResult('correct')}
              className="px-4 py-2 rounded-full bg-green-700 text-white text-sm font-medium hover:bg-green-800"
            >
              Yes, got it
            </button>
            <button
              onClick={() => onResult('wrong')}
              className="px-4 py-2 rounded-full border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50"
            >
              Not yet
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function GapCard({
  phrase,
  variation,
  onResult,
}: {
  phrase: DrillPhrase;
  variation: GapVariation;
  onResult: (r: 'correct' | 'wrong') => void;
}) {
  const chips = useMemo(() => shuffle(variation.options), [variation]);
  const [wrong, setWrong] = useState<string[]>([]);
  const [solved, setSolved] = useState(false);

  function pick(opt: string) {
    if (solved || wrong.includes(opt)) return;
    if (opt === variation.answer) {
      setSolved(true);
      say(phrase.swahili);
    } else {
      setWrong((w) => [...w, opt]);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-3">
        <p className="text-gray-700">{phrase.english}</p>
        <p className="text-xl font-semibold text-gray-900">
          {variation.before}
          {solved ? (
            <span className="text-green-700 underline decoration-green-300 decoration-2 underline-offset-4">
              {variation.answer}
            </span>
          ) : (
            <span
              aria-label="blank"
              className="inline-block min-w-20 px-2 mx-0.5 rounded-md bg-gray-100 text-gray-400 text-center tracking-widest"
            >
              …
            </span>
          )}
          {variation.after}
        </p>
        {solved && (
          <div className="flex items-center gap-1 text-sm text-gray-500 -ml-1.5">
            <AudioButton text={phrase.swahili} />
            <span>Hear the full line</span>
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {chips.map((opt) => {
          const isWrong = wrong.includes(opt);
          const isRight = solved && opt === variation.answer;
          return (
            <button
              key={opt}
              onClick={() => pick(opt)}
              disabled={solved || isWrong}
              className={`px-4 py-2 rounded-full border text-sm font-medium transition-colors disabled:cursor-default ${
                isRight
                  ? 'border-green-500 bg-green-50 text-green-800'
                  : isWrong
                  ? 'border-red-300 bg-red-50 text-red-400 line-through'
                  : solved
                  ? 'border-gray-100 bg-white text-gray-300'
                  : 'border-gray-200 bg-white hover:border-green-400 hover:bg-green-50/50'
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>
      {!solved && wrong.length > 0 && <p className="text-red-600 text-sm">Not quite — try again.</p>}
      {solved && (
        <button
          onClick={() => onResult(wrong.length === 0 ? 'correct' : 'wrong')}
          className="px-4 py-2 rounded-full bg-green-700 text-white text-sm font-medium hover:bg-green-800"
        >
          Next →
        </button>
      )}
    </div>
  );
}
