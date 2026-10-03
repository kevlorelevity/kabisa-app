import { getGrammarTopic } from '../hooks/useGrammar';
import { useGrammarModal } from './grammarContext';

interface GrammarChipsProps {
  slugs: string[];
  /** Highlighted slugs (e.g. a lesson's grammar focus) render as solid chips. */
  emphasize?: string[];
  size?: 'xs' | 'sm';
  /** 'dark' for use inside the dark tap-to-explain tooltip. */
  variant?: 'light' | 'dark';
  onOpen?: () => void;
}

/** Small "📘 Topic" buttons that open the grammar explainer modal. */
export function GrammarChips({ slugs, emphasize = [], size = 'sm', variant = 'light', onOpen }: GrammarChipsProps) {
  const { openGrammar } = useGrammarModal();
  const topics = slugs.map((s) => getGrammarTopic(s)).filter((t) => t !== undefined);
  if (topics.length === 0) return null;
  return (
    <span className="inline-flex flex-wrap gap-1.5">
      {topics.map((t) => {
        const strong = emphasize.includes(t.slug);
        const cls =
          variant === 'dark'
            ? 'border-white/25 bg-white/10 text-green-200 hover:bg-white/20'
            : strong
            ? 'border-green-700 bg-green-700 text-white hover:bg-green-800'
            : 'border-green-200 bg-white text-green-800 hover:border-green-400 hover:bg-green-50';
        return (
          <button
            key={t.slug}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpen?.();
              openGrammar(t.slug);
            }}
            className={`inline-flex items-center gap-1 rounded-full border transition-colors text-left ${
              size === 'xs' ? 'text-[11px] px-2 py-0.5' : 'text-xs px-2.5 py-1'
            } ${cls}`}
          >
            <span aria-hidden="true">📘</span>
            {t.title}
          </button>
        );
      })}
    </span>
  );
}
