import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getGrammarTopics } from '../hooks/useGrammar';
import { useGrammarFavorites } from '../lib/grammarFavorites';
import { LEVELS } from '../lib/levels';
import { useGrammarModal } from '../components/grammarContext';
import { FavoriteStar } from '../components/GrammarModal';
import { useOverridesVersion } from '../lib/contentOverrides';
import type { GrammarTopic } from '../types';

type Filter = 'all' | 'favorites';

function matches(t: GrammarTopic, q: string): boolean {
  if (!q) return true;
  const hay = [t.title, t.swahiliTitle ?? '', t.summary, ...t.tags, ...t.examples.map((e) => `${e.swahili} ${e.english}`)]
    .join(' ')
    .toLowerCase();
  return q
    .toLowerCase()
    .split(/\s+/)
    .every((w) => hay.includes(w));
}

/** The central list of every grammar explainer, with search and favourites. */
export function GrammarView() {
  useOverridesVersion(); // re-render on admin live edits
  const { slug } = useParams<{ slug?: string }>();
  const { openGrammar } = useGrammarModal();
  const { favorites } = useGrammarFavorites();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const topics = getGrammarTopics();

  // Deep link: /grammar/:slug opens that explainer on top of the list.
  useEffect(() => {
    if (slug) openGrammar(slug);
  }, [slug, openGrammar]);

  const visible = useMemo(
    () => topics.filter((t) => (filter === 'favorites' ? favorites.includes(t.slug) : true) && matches(t, query.trim())),
    [topics, filter, favorites, query],
  );

  const byLevel = LEVELS.map((lvl) => ({ lvl, items: visible.filter((t) => t.level === lvl.level) })).filter((g) => g.items.length);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Grammar explainers</h1>
        <p className="text-gray-500 text-sm mt-1">
          Every structure you meet in the lessons, explained once and clearly — Kenyan usage first, Sanifu as a
          look-up. Tap ☆ to save the ones you want to review.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search: past tense, kwamba, possessives…"
          aria-label="Search grammar explainers"
          className="flex-1 rounded-full border border-gray-200 px-4 py-2 text-sm focus:outline-none focus:border-green-500"
        />
        <div className="flex gap-1.5" role="tablist" aria-label="Filter">
          {(['all', 'favorites'] as const).map((f) => (
            <button
              key={f}
              role="tab"
              aria-selected={filter === f}
              onClick={() => setFilter(f)}
              className={`px-3.5 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                filter === f ? 'bg-green-700 border-green-700 text-white' : 'bg-white border-gray-200 text-gray-600 hover:border-green-400'
              }`}
            >
              {f === 'all' ? `All (${topics.length})` : `★ Favourites (${favorites.length})`}
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="text-center py-12 text-sm text-gray-400">
          {filter === 'favorites' && favorites.length === 0
            ? 'No favourites yet. Open any explainer and tap ☆ to save it here.'
            : 'Nothing matches that search.'}
        </div>
      ) : (
        byLevel.map(({ lvl, items }) => (
          <section key={lvl.level}>
            <h2 className="text-xs uppercase tracking-wide text-gray-400 font-semibold mb-2">
              Level {lvl.level} · {lvl.emoji} {lvl.name}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {items.map((t) => (
                <div
                  key={t.slug}
                  role="button"
                  tabIndex={0}
                  onClick={() => openGrammar(t.slug)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      openGrammar(t.slug);
                    }
                  }}
                  className="flex items-start gap-2 rounded-xl border border-gray-200 bg-white p-4 cursor-pointer hover:border-green-400 hover:shadow-sm transition-all"
                >
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm text-gray-900 leading-snug">{t.title}</h3>
                    {t.swahiliTitle && <p className="text-xs text-gray-400 italic">{t.swahiliTitle}</p>}
                    <p className="text-xs text-gray-500 mt-1.5 line-clamp-2">{t.summary}</p>
                  </div>
                  <FavoriteStar slug={t.slug} title={t.title} className="-mr-1 -mt-1" />
                </div>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
