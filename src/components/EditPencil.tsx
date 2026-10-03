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
