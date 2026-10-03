import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import type { GrammarBlock, GrammarTopic } from '../types';
import { getGrammarTopic } from '../hooks/useGrammar';
import { useGrammarFavorites } from '../lib/grammarFavorites';
import { levelInfo } from '../lib/levels';
import { AudioButton } from './AudioButton';
import { RichText } from './RichText';
import { EditPencil } from './EditPencil';

interface GrammarModalProps {
  topic: GrammarTopic;
  canGoBack: boolean;
  onBack: () => void;
  onNavigate: (slug: string) => void;
  onClose: () => void;
}

export function FavoriteStar({ slug, title, className = '' }: { slug: string; title: string; className?: string }) {
  const { isFavorite, toggle } = useGrammarFavorites();
  const on = isFavorite(slug);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        toggle(slug);
      }}
      aria-pressed={on}
      aria-label={on ? `Remove “${title}” from favourites` : `Add “${title}” to favourites`}
      title={on ? 'Remove from favourites' : 'Save to favourites'}
      className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-lg transition-colors ${
        on ? 'text-amber-500 bg-amber-50 hover:bg-amber-100' : 'text-gray-300 hover:text-amber-400 hover:bg-gray-50'
      } ${className}`}
    >
      {on ? '★' : '☆'}
    </button>
  );
}

function Block({ block }: { block: GrammarBlock }) {
  switch (block.type) {
    case 'p':
      return (
        <p className="text-gray-700 leading-relaxed">
          <RichText text={block.text} />
        </p>
      );
    case 'list':
      return (
        <ul className="list-disc pl-5 space-y-1 text-gray-700">
          {block.items.map((it, i) => (
            <li key={i}>
              <RichText text={it} />
            </li>
          ))}
        </ul>
      );
    case 'table':
      return (
        <figure className="space-y-1.5">
          {block.caption && <figcaption className="text-xs font-semibold text-gray-500">{block.caption}</figcaption>}
          <div className="overflow-x-auto -mx-1 px-1">
            <table className="w-full text-sm border-collapse min-w-[18rem]">
              <thead>
                <tr>
                  {block.headers.map((h, i) => (
                    <th key={i} className="text-left font-semibold text-gray-600 bg-gray-50 border-b border-gray-200 px-2.5 py-1.5">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.rows.map((row, r) => (
                  <tr key={r} className="border-b border-gray-100 last:border-0">
                    {row.map((cell, c) => (
                      <td key={c} className={`px-2.5 py-1.5 align-top ${c === 0 ? 'text-gray-500' : 'text-gray-800'}`}>
                        <RichText text={cell} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </figure>
      );
    case 'tip':
      return (
        <div className="rounded-lg border border-green-200 bg-green-50 px-3.5 py-2.5 text-sm text-green-900">
          <span className="font-semibold">Tip · </span>
          <RichText text={block.text} />
        </div>
      );
    case 'sanifu':
      return (
        <div className="rounded-lg border border-sky-200 bg-sky-50 px-3.5 py-2.5 text-sm text-sky-900">
          <span className="font-semibold">Sanifu look-up · </span>
          <RichText text={block.text} />
        </div>
      );
  }
}

/** The grammar explainer dialog. Rendered by GrammarProvider. */
export function GrammarModal({ topic, canGoBack, onBack, onNavigate, onClose }: GrammarModalProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const lvl = levelInfo(topic.level);

  useEffect(() => {
    closeRef.current?.focus();
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
  }, [topic.slug]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const related = topic.related.map((s) => getGrammarTopic(s)).filter((t) => t !== undefined);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-gray-900/40" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="grammar-modal-title"
        className="relative bg-white w-full sm:max-w-xl max-h-[88vh] sm:max-h-[85vh] rounded-t-2xl sm:rounded-2xl shadow-xl flex flex-col"
      >
        <div className="flex items-start gap-2 px-5 pt-4 pb-3 border-b border-gray-100">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-xs text-gray-400">
              {canGoBack && (
                <button type="button" onClick={onBack} className="text-green-700 hover:underline">
                  ← Back
                </button>
              )}
              <span>
                📘 Grammar · Level {topic.level} {lvl.emoji}
              </span>
            </div>
            <h2 id="grammar-modal-title" className="text-lg font-bold text-gray-900 leading-snug mt-0.5">
              {topic.title}{' '}
              <EditPencil target={{ targetType: 'grammar.title', label: 'Grammar title', currentText: topic.title, itemId: topic.slug }} />
            </h2>
            {topic.swahiliTitle && <p className="text-sm text-gray-500 italic">{topic.swahiliTitle}</p>}
          </div>
          <FavoriteStar slug={topic.slug} title={topic.title} />
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close grammar explainer"
            className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100"
          >
            ✕
          </button>
        </div>

        <div ref={bodyRef} className="overflow-y-auto px-5 py-4 space-y-4">
          <p className="text-gray-900 font-medium">
            {topic.summary}{' '}
            <EditPencil target={{ targetType: 'grammar.summary', label: 'Grammar summary', currentText: topic.summary, itemId: topic.slug }} />
          </p>
          {topic.blocks.map((b, i) => (
            <div key={i} className="relative">
              <Block block={b} />
              <div className="mt-1">
                <EditPencil
                  target={{
                    targetType: `grammar.block.${b.type}`,
                    label: `Grammar ${b.type === 'p' ? 'paragraph' : b.type} #${i + 1}`,
                    currentText:
                      b.type === 'table'
                        ? [b.caption ?? '', b.headers.join(' | '), ...b.rows.map((r) => r.join(' | '))].filter(Boolean).join('\n')
                        : b.type === 'list'
                        ? b.items.join('\n')
                        : b.text,
                    itemId: `${topic.slug}#${i}`,
                  }}
                />
              </div>
            </div>
          ))}

          {topic.examples.length > 0 && (
            <section>
              <h3 className="text-xs uppercase tracking-wide text-gray-400 font-semibold mb-2">Examples</h3>
              <ul className="space-y-2">
                {topic.examples.map((ex, i) => (
                  <li key={i} className="rounded-lg bg-gray-50 px-3 py-2">
                    <div className="flex items-start gap-1">
                      <AudioButton text={ex.swahili} className="-ml-1.5 -my-0.5" />
                      <div>
                        <p className="font-semibold text-gray-900">{ex.swahili}</p>
                        <p className="text-sm text-gray-600">{ex.english}</p>
                        {ex.note && <p className="text-xs text-gray-400 mt-0.5">{ex.note}</p>}
                        <EditPencil
                          target={{
                            targetType: 'grammar.example',
                            label: 'Grammar example',
                            currentText: `${ex.swahili} — ${ex.english}${ex.note ? ` (${ex.note})` : ''}`,
                            itemId: `${topic.slug}#ex${i}`,
                          }}
                        />
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {related.length > 0 && (
            <section>
              <h3 className="text-xs uppercase tracking-wide text-gray-400 font-semibold mb-2">Related</h3>
              <div className="flex flex-wrap gap-1.5">
                {related.map((r) => (
                  <button
                    key={r.slug}
                    type="button"
                    onClick={() => onNavigate(r.slug)}
                    className="text-xs px-2.5 py-1 rounded-full border border-green-200 text-green-800 hover:border-green-400 hover:bg-green-50"
                  >
                    📘 {r.title}
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>

        <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between text-sm">
          <Link to="/grammar" onClick={onClose} className="text-green-700 hover:underline">
            All grammar explainers →
          </Link>
          <button type="button" onClick={onClose} className="px-4 py-1.5 rounded-full bg-green-700 text-white font-medium hover:bg-green-800">
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
