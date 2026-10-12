import { useState } from 'react';
import { useAdmin, type SuggestTarget } from './adminContext';

/** ✎ next to a content element — admins only. Opens the suggestion modal for that exact element. */
export function EditPencil({
  target,
  className = '',
  tone = 'light',
  hint,
}: {
  target: SuggestTarget;
  className?: string;
  tone?: 'light' | 'dark';
  /** Tiny label next to the pencil when several sit together, e.g. 'SW' / 'EN'. */
  hint?: string;
}) {
  const { isAdmin, openSuggest } = useAdmin();
  if (!isAdmin) return null;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        openSuggest(target);
      }}
      title="Suggest a change"
      aria-label={`Suggest a change: ${target.label}`}
      className={`inline-flex h-5 ${hint ? 'px-1.5 gap-0.5' : 'w-5'} shrink-0 items-center justify-center rounded-full align-middle text-[11px] leading-none transition-colors ${
        tone === 'dark'
          ? 'bg-amber-300/90 text-gray-900 hover:bg-amber-200'
          : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
      } ${className}`}
    >
      ✎{hint && <span className="text-[9px] font-bold tracking-wide">{hint}</span>}
    </button>
  );
}

/** 🗑 next to a practice line or flashcard — admins only, with a one-tap confirm. */
export function DeleteItem({ lessonId, itemId, label }: { lessonId: string; itemId: string; label: string }) {
  const { isAdmin, removeItem } = useAdmin();
  const [asking, setAsking] = useState(false);
  if (!isAdmin) return null;
  if (asking)
    return (
      <span className="inline-flex items-center gap-1 text-xs">
        <span className="text-gray-500">Delete for everyone?</span>
        <button
          type="button"
          onClick={() => {
            removeItem(lessonId, itemId, label);
            setAsking(false);
          }}
          className="rounded-full bg-red-600 px-2 py-0.5 font-semibold text-white"
        >
          Delete
        </button>
        <button type="button" onClick={() => setAsking(false)} className="rounded-full border border-gray-300 px-2 py-0.5 text-gray-600">
          Keep
        </button>
      </span>
    );
  return (
    <button
      type="button"
      onClick={() => setAsking(true)}
      title={`Delete: ${label}`}
      aria-label={`Delete: ${label}`}
      className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-gray-100 text-[11px] text-gray-500 hover:bg-red-100 hover:text-red-700"
    >
      🗑
    </button>
  );
}
