import { useEffect, useMemo, useRef, useState } from 'react';
import type { GrammarTopic, Lesson } from '../types';
import { getGrammarTopic } from '../hooks/useGrammar';
import { useOverridesVersion } from '../lib/contentOverrides';
import { Block, StudioLink } from './GrammarModal';
import { EditPencil } from './EditPencil';
import { grammarBlockTarget, grammarSummaryTarget, grammarTitleTarget } from './grammarTargets';
import { RichText } from './RichText';
import { useGrammarModal } from './grammarContext';

interface Example {
  swahili: string;
  english: string;
  word: string;
  gloss: string;
}

/** Lines of this lesson where a word is linked to the topic — the grammar "in action". */
function examplesFor(lesson: Lesson, slug: string, max = 4): Example[] {
  const out: Example[] = [];
  for (const t of lesson.turns) {
    const w = t.words.find((x) => x.grammar?.includes(slug));
    if (w && !out.some((e) => e.swahili === t.swahili)) out.push({ swahili: t.swahili, english: t.english, word: w.text, gloss: w.gloss });
    if (out.length >= max) break;
  }
  return out;
}

/** "Mwambie or Umwambie? Commands, …" → "Mwambie or Umwambie?" — short enough for a tab. */
function shortTitle(t: GrammarTopic): string {
  const colon = t.title.indexOf(':');
  if (colon > 0) return t.title.slice(0, colon);
  const q = t.title.indexOf('?');
  if (q > 0) return t.title.slice(0, q + 1);
  return t.title.length > 30 ? `${t.title.slice(0, 28)}…` : t.title;
}

function Highlighted({ line, word }: { line: string; word: string }) {
  const at = line.indexOf(word);
  if (at === -1) return <>{line}</>;
  return (
    <>
      {line.slice(0, at)}
      <strong className="text-green-800 underline decoration-green-300 decoration-2 underline-offset-2">{word}</strong>
      {line.slice(at + word.length)}
    </>
  );
}

/**
 * "The grammar you'll learn": before the conversation, one page per structure the lesson
 * focuses on — how it works (from the grammar guide) and where it comes up in this lesson.
 */
export function GrammarPrimer({ lesson, slugs, onStart }: { lesson: Lesson; slugs: string[]; onStart?: () => void }) {
  useOverridesVersion();
  const { openGrammar } = useGrammarModal();
  const topics = useMemo(
    () => slugs.map((s) => getGrammarTopic(s)).filter((t): t is GrammarTopic => Boolean(t)),
    [slugs],
  );
  const [page, setPage] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  // Back / Next sit at the bottom of a long page: bring the new page's top into view.
  const turnTo = (i: number) => {
    setPage(i);
    requestAnimationFrame(() => cardRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' }));
  };
  const at = Math.min(page, Math.max(topics.length - 1, 0));
  // Slide the tab strip sideways so the selected page's tab sits at its left edge.
  useEffect(() => {
    const strip = tabsRef.current;
    const tab = strip?.querySelector<HTMLElement>(`[data-tab-index="${at}"]`);
    if (!strip || !tab) return;
    const left = Math.max(tab.offsetLeft - 12, 0);
    if (typeof strip.scrollTo === 'function') strip.scrollTo({ left, behavior: 'smooth' });
    else strip.scrollLeft = left;
  }, [at]);
  if (!topics.length) return null;
  const topic = topics[at];
  const examples = examplesFor(lesson, topic.slug);
  const last = at === topics.length - 1;

  return (
    <section data-testid="grammar-primer" aria-labelledby="grammar-primer-title" className="space-y-3">
      <div>
        <h2 id="grammar-primer-title" className="text-lg font-bold text-gray-900">
          The grammar you’ll learn
        </h2>
        <p className="text-sm text-gray-500">
          Read this before the conversation — {topics.length === 1 ? 'it explains' : `${topics.length} short pages explain`} how
          {topics.length === 1 ? ' this structure works' : ' each structure works'} and where you’ll use it.
        </p>
      </div>

      {lesson.primer && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 leading-relaxed" data-testid="lesson-primer">
          <span className="font-semibold">Before you start · </span>
          {lesson.primer.text}{' '}
          <EditPencil target={{ targetType: 'lesson.primer', label: 'Before you start', currentText: lesson.primer.text, lessonId: lesson.id }} />
        </div>
      )}

      <div ref={cardRef} className="rounded-xl border border-gray-200 bg-white scroll-mt-28">
        {topics.length > 1 && (
          <div ref={tabsRef} className="relative flex gap-1 border-b border-gray-100 px-3 pt-3 overflow-x-auto scroll-smooth" role="tablist" aria-label="Grammar pages">
            {topics.map((t, i) => (
              <button
                key={t.slug}
                type="button"
                role="tab"
                aria-selected={i === at}
                data-tab-index={i}
                onClick={() => setPage(i)}
                className={`shrink-0 rounded-t-lg px-3 py-2 text-xs font-semibold border-b-2 -mb-px ${
                  i === at ? 'border-green-700 text-green-800' : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                {i + 1}. {shortTitle(t)}
              </button>
            ))}
          </div>
        )}

        <div className="p-4 sm:p-5 space-y-4" role="tabpanel" aria-label={topic.title}>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-400 font-semibold">
              {topics.length > 1 ? `Page ${at + 1} of ${topics.length}` : 'Grammar'}
              {topic.swahiliTitle ? ` · ${topic.swahiliTitle}` : ''}
            </p>
            <h3 className="mt-0.5 text-base font-bold text-gray-900">
              {topic.title} <EditPencil target={grammarTitleTarget(topic)} />
            </h3>
            <p className="mt-1 text-gray-700 leading-relaxed">
              <RichText text={topic.summary} /> <EditPencil target={grammarSummaryTarget(topic)} />
            </p>
          </div>

          <div className="space-y-3">
            {topic.blocks.map((b, i) => (
              <div key={i}>
                <Block block={b} />
                <EditPencil target={grammarBlockTarget(topic, b, i)} className="mt-1" />
              </div>
            ))}
            <StudioLink slug={topic.slug} />
          </div>

          {examples.length > 0 && (
            <div className="rounded-lg bg-gray-50 px-4 py-3 space-y-2">
              <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">In this conversation</p>
              <ul className="space-y-2">
                {examples.map((e) => (
                  <li key={e.swahili} className="text-sm">
                    <p className="text-gray-900">
                      <Highlighted line={e.swahili} word={e.word} />
                    </p>
                    <p className="text-gray-500">{e.english}</p>
                    <p className="text-xs text-gray-400">
                      <span className="font-semibold text-gray-500">{e.word}</span> — {e.gloss}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <button
              type="button"
              onClick={() => openGrammar(topic.slug)}
              className="text-xs font-semibold text-green-700 hover:underline"
            >
              📘 Open the full guide
            </button>
            <div className="flex gap-2">
              {at > 0 && (
                <button
                  type="button"
                  onClick={() => turnTo(at - 1)}
                  className="px-4 py-2 rounded-full border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  ← Back
                </button>
              )}
              {!last ? (
                <button
                  type="button"
                  onClick={() => turnTo(at + 1)}
                  className="px-4 py-2 rounded-full bg-green-700 text-white text-sm font-semibold hover:bg-green-800"
                >
                  Next: {shortTitle(topics[at + 1])} →
                </button>
              ) : (
                onStart && (
                  <button
                    type="button"
                    onClick={onStart}
                    className="px-4 py-2 rounded-full bg-green-700 text-white text-sm font-semibold hover:bg-green-800"
                  >
                    Start the conversation ↓
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
