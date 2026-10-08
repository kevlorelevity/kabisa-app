import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/profileContext';
import { loadIsAdmin, submitSuggestion, type SuggestionKind } from '../lib/admin';
import { addOverrides, resolveOverride, scopeContent, type ScopeType } from '../lib/contentOverrides';
import { AdminContext, type SuggestTarget } from './adminContext';
import { setRoamAllowed } from '../lib/roam';

const KINDS: Array<{ id: SuggestionKind; label: string }> = [
  { id: 'phrasing', label: 'Phrasing' },
  { id: 'translation', label: 'Translation' },
  { id: 'grammar', label: 'Grammar' },
  { id: 'layout', label: 'Layout' },
  { id: 'other', label: 'Other' },
];

function SuggestModal({ target, onClose }: { target: SuggestTarget; onClose: () => void }) {
  const { pathname } = useLocation();
  const { profile, persona } = useProfile();
  const [kind, setKind] = useState<SuggestionKind>('phrasing');
  const [suggestion, setSuggestion] = useState('');
  const [proposed, setProposed] = useState(target.currentText);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'failed'>('idle');
  const [result, setResult] = useState<{ applied: boolean; synced: boolean; textChanged: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lessonId = target.lessonId ?? pathname.match(/^\/lesson\/([^/]+)/)?.[1];
  const textChanged = proposed.trim() !== '' && proposed.trim() !== target.currentText.trim();
  const canSave = suggestion.trim() !== '' || textChanged;

  // Which bundled content this element lives in (for live edits).
  const scope = useMemo(() => {
    let type: ScopeType | null = null;
    let id: string | undefined;
    if (target.targetType.startsWith('grammar')) {
      type = 'grammar';
      id = target.itemId?.split('#')[0];
    } else if (target.targetType === 'level') {
      type = 'level';
      id = target.itemId?.replace(/^level-/, '');
    } else if (lessonId) {
      type = 'lesson';
      id = lessonId;
    }
    const content = type && id ? scopeContent(type, id) : undefined;
    return type && id && content ? { type, id, content } : null;
  }, [target, lessonId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function save() {
    if (!canSave) return;
    setStatus('saving');
    setError(null);
    const itemId = target.targetType.startsWith('grammar') || target.targetType === 'level' ? undefined : target.itemId;
    const override = textChanged ? resolveOverride(scope, itemId, target.currentText.trim(), proposed.trim(), persona) : null;
    const res = await submitSuggestion({
      ...target,
      lessonId,
      kind,
      suggestion: suggestion.trim() || undefined,
      proposedText: textChanged ? proposed.trim() : undefined,
      override: override ?? undefined,
      page: window.location.href,
      reviewerName: profile?.displayName,
    });
    if (!res.ok) {
      setStatus('failed');
      setError(res.error ?? 'unknown');
      return;
    }
    if (res.applied && override && res.overrideId) addOverrides([{ id: res.overrideId, ...override }]);
    setResult({ applied: res.applied, synced: res.synced, textChanged });
    setStatus('saved');
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-gray-900/40" onClick={onClose} aria-hidden="true" />
      <div role="dialog" aria-modal="true" aria-label="Suggest a change" className="relative w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl bg-white p-5 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">✎ Admin · suggest a change</p>
            <p className="text-sm text-gray-500 mt-0.5">
              {target.label}
              {lessonId ? ` · ${lessonId}` : ''}
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-700">
            ✕
          </button>
        </div>

        {status === 'saved' && result ? (
          <div className="text-center py-4 space-y-2">
            <p className="text-3xl" aria-hidden="true">
              {result.applied ? '⚡' : '✅'}
            </p>
            <p className="font-semibold text-gray-900">{result.applied ? 'Live now — for everyone' : 'Suggestion saved'}</p>
            <p className="text-sm text-gray-500">
              {result.applied
                ? 'The new text is showing in the app already. It’s also logged in the review spreadsheet.'
                : result.textChanged
                ? 'This element can’t be edited in place yet, so it’s logged for a code change.'
                : result.synced
                ? 'Added to the review spreadsheet.'
                : 'Stored — the spreadsheet link isn’t connected yet.'}
            </p>
            <button onClick={onClose} className="mt-1 px-4 py-1.5 rounded-full bg-green-700 text-white text-sm">
              Done
            </button>
          </div>
        ) : (
          <>
            <blockquote className="rounded-lg border-l-4 border-amber-300 bg-amber-50 px-3 py-2 text-sm text-gray-800 whitespace-pre-wrap">
              {target.currentText || <span className="text-gray-400">(no text)</span>}
            </blockquote>
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Type of change">
              {KINDS.map((k) => (
                <button
                  key={k.id}
                  type="button"
                  role="radio"
                  aria-checked={kind === k.id}
                  onClick={() => setKind(k.id)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border ${
                    kind === k.id ? 'bg-amber-500 border-amber-500 text-white' : 'border-gray-200 text-gray-600 hover:border-amber-400'
                  }`}
                >
                  {k.label}
                </button>
              ))}
            </div>
            <label className="block">
              <span className="text-sm font-semibold text-gray-800">
                What should change, and why? <span className="font-normal text-gray-400">(optional)</span>
              </span>
              <textarea
                value={suggestion}
                onChange={(e) => setSuggestion(e.target.value)}
                rows={3}
                placeholder="e.g. Nobody in Nairobi says this — people say … / The English is too literal / Put this above the table"
                className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-gray-800">
                New text{' '}
                <span className="font-normal text-gray-400">
                  {scope ? '— edit in place; goes live as soon as you save' : '(optional)'}
                </span>
              </span>
              <textarea
                value={proposed}
                onChange={(e) => setProposed(e.target.value)}
                rows={3}
                autoFocus
                className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
              />
            </label>
            {status === 'failed' && (
              <p className="text-sm text-red-600">
                Couldn’t save ({error}).{' '}
                {error === 'not_admin'
                  ? 'This account isn’t an admin.'
                  : error === 'not_signed_in' || error === 'invalid_session'
                  ? 'Please sign in again.'
                  : 'Please try again.'}
              </p>
            )}
            <button
              onClick={() => void save()}
              disabled={!canSave || status === 'saving'}
              className="w-full rounded-full bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-40"
            >
              {status === 'saving' ? 'Saving…' : textChanged && scope ? 'Save & publish' : 'Save suggestion'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/** Loads the admin flag for the signed-in account and hosts the suggestion modal. */
export function AdminProvider({ children, forceAdmin }: { children: ReactNode; forceAdmin?: boolean }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [isAdmin, setIsAdmin] = useState(false);
  const [target, setTarget] = useState<SuggestTarget | null>(null);

  useEffect(() => {
    let alive = true;
    loadIsAdmin(userId).then((a) => alive && setIsAdmin(a));
    return () => {
      alive = false;
    };
  }, [userId]);

  const effectiveAdmin = forceAdmin ?? isAdmin;
  useEffect(() => setRoamAllowed(effectiveAdmin), [effectiveAdmin]);

  const openSuggest = useCallback((t: SuggestTarget) => setTarget(t), []);
  const close = useCallback(() => setTarget(null), []);
  const value = useMemo(() => ({ isAdmin: forceAdmin ?? isAdmin, openSuggest }), [forceAdmin, isAdmin, openSuggest]);

  return (
    <AdminContext.Provider value={value}>
      {children}
      {target && <SuggestModal target={target} onClose={close} />}
    </AdminContext.Provider>
  );
}
