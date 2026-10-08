import { useEffect, useState } from 'react';
import { NOTES, notesSince, type ReleaseNote } from '../lib/releaseNotes';

// -------- "What's new" + refresh nudge --------
//
// public/release-notes.json lists user-facing changes, newest first. Every
// deploy with an end-user-facing improvement adds an entry (see README).
//  - After an update, a returning learner sees the notes they haven't seen yet.
//  - A tab still running an old build fetches the live notes and pops them up
//    with a "Refresh now" button; builds without new notes get a quiet banner.

const SEEN_KEY = 'ksa_notes_seen';
const CHECK_EVERY_MS = 5 * 60 * 1000;

function readSeen(): string | null {
  try {
    return localStorage.getItem(SEEN_KEY);
  } catch {
    return null;
  }
}

function writeSeen(id: string | undefined): void {
  if (!id) return;
  try {
    localStorage.setItem(SEEN_KEY, id);
  } catch {
    /* ignore */
  }
}

function hasProgress(): boolean {
  try {
    const raw = localStorage.getItem('ksa_lesson_scores');
    return Boolean(raw && raw !== '{}');
  } catch {
    return false;
  }
}

/** The hashed entry script this tab is running, e.g. /assets/index-AbC123.js. */
function currentBuild(): string | null {
  const s = document.querySelector<HTMLScriptElement>('script[type="module"][src*="/assets/"]');
  return s ? new URL(s.src, location.href).pathname : null;
}

async function latestBuild(): Promise<string | null> {
  try {
    const html = await fetch('/', { cache: 'no-store' }).then((r) => r.text());
    return html.match(/\/assets\/index-[\w-]+\.js/)?.[0] ?? null;
  } catch {
    return null;
  }
}

async function liveNotes(): Promise<ReleaseNote[]> {
  try {
    const r = await fetch('/release-notes.json', { cache: 'no-store' });
    return r.ok ? ((await r.json()) as ReleaseNote[]) : [];
  } catch {
    return [];
  }
}

type Popup = { mode: 'updated' | 'refresh'; notes: ReleaseNote[]; latestId: string } | null;

function initialPopup(): Popup {
  const latest = NOTES[0]?.id;
  if (!latest) return null;
  const seen = readSeen();
  if (!seen && !hasProgress()) return null; // brand-new learner: nothing to announce
  if (seen === latest) return null;
  const fresh = seen ? notesSince(NOTES, seen) : NOTES.slice(0, 1);
  return fresh.length ? { mode: 'updated', notes: fresh, latestId: latest } : null;
}

export function UpdateBanner() {
  // Just updated? Show what's new since this learner last looked.
  const [popup, setPopup] = useState<Popup>(initialPopup);
  const [stale, setStale] = useState(false);

  useEffect(() => {
    if (!readSeen() && !hasProgress()) writeSeen(NOTES[0]?.id);
  }, []);

  // Old build still open? Nudge to refresh, with the notes when there are any.
  useEffect(() => {
    const mine = currentBuild();
    if (!mine) return; // dev server
    let alive = true;
    const check = async () => {
      const latest = await latestBuild();
      if (!alive || !latest || latest === mine) return;
      const live = await liveNotes();
      const fresh = notesSince(live, NOTES[0]?.id ?? null);
      if (!alive) return;
      if (fresh.length && live[0]) setPopup({ mode: 'refresh', notes: fresh, latestId: live[0].id });
      else setStale(true);
    };
    const onVisible = () => document.visibilityState === 'visible' && void check();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    const t = setInterval(check, CHECK_EVERY_MS);
    return () => {
      alive = false;
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
      clearInterval(t);
    };
  }, []);

  return (
    <>
      {stale && !popup && (
        <div role="status" className="bg-amber-100 border-b border-amber-300 text-amber-900 text-sm">
          <div className="max-w-4xl mx-auto px-4 py-2 flex items-center justify-between gap-3">
            <span>A new version of Kabisa is available.</span>
            <button
              type="button"
              onClick={() => location.reload()}
              className="shrink-0 rounded-full bg-amber-500 px-3 py-1 font-semibold text-white hover:bg-amber-600"
            >
              Reload
            </button>
          </div>
        </div>
      )}
      {popup && (
        <div className="fixed inset-x-0 bottom-0 z-[55] p-3 sm:p-5 flex justify-center pointer-events-none">
          <div
            role="dialog"
            aria-label="What's new in Kabisa"
            className="pointer-events-auto w-full max-w-sm rounded-2xl border border-green-200 bg-white shadow-2xl p-4 space-y-3"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-xs font-bold uppercase tracking-widest text-green-700">
                {popup.mode === 'refresh' ? 'New update ready' : 'What’s new'}
              </p>
              <button
                type="button"
                aria-label="Close"
                onClick={() => {
                  if (popup.mode === 'updated') writeSeen(popup.latestId);
                  else setStale(true);
                  setPopup(null);
                }}
                className="text-gray-400 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            {popup.notes.map((n) => (
              <div key={n.id} className="space-y-1">
                <p className="font-semibold text-gray-900 leading-snug">{n.title}</p>
                <ul className="space-y-1 text-sm text-gray-600 list-disc pl-5">
                  {n.items.map((it) => (
                    <li key={it}>{it}</li>
                  ))}
                </ul>
              </div>
            ))}
            {popup.mode === 'refresh' ? (
              <button
                type="button"
                onClick={() => {
                  writeSeen(popup.latestId);
                  location.reload();
                }}
                className="w-full rounded-full bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800"
              >
                Refresh now
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  writeSeen(popup.latestId);
                  setPopup(null);
                }}
                className="w-full rounded-full bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800"
              >
                Nice — let’s go!
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
