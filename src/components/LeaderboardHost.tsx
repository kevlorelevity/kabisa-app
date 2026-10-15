import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getCountry } from '../lib/countries';
import { levelInfo } from '../lib/levels';
import { OPEN_LEADERBOARD_EVENT, loadLeaderboard, type Leaderboard, type LeaderboardEntry } from '../lib/leaderboard';

const MEDALS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };
const SHOWN_KEY = 'ksa_leaderboard_shown';

function shownThisSession(userId: string): boolean {
  try {
    return sessionStorage.getItem(SHOWN_KEY) === userId;
  } catch {
    return false;
  }
}
function markShown(userId: string): void {
  try {
    sessionStorage.setItem(SHOWN_KEY, userId);
  } catch {
    /* ignore */
  }
}

function EntryRow({ e }: { e: LeaderboardEntry }) {
  const flag = getCountry(e.nationality)?.flag;
  return (
    <li
      className={`flex items-center gap-3 rounded-lg px-3 py-2 ${
        e.isMe ? 'bg-green-50 ring-1 ring-green-300' : ''
      }`}
    >
      <span className="w-7 text-center tabular-nums text-sm font-semibold text-gray-500">
        {MEDALS[e.rank] ?? e.rank}
      </span>
      <span className="w-6 text-lg leading-none" aria-hidden={!flag}>
        {flag ?? ''}
      </span>
      <span className={`flex-1 min-w-0 truncate ${e.isMe ? 'font-semibold text-green-800' : 'text-gray-900'}`}>
        {e.firstName}
        {e.isMe && <span className="ml-1 text-xs font-medium text-green-700">(you)</span>}
      </span>
      <span className="tabular-nums text-sm font-medium text-gray-900">
        {e.xp.toLocaleString()} <span className="text-xs font-normal text-gray-400">Gonga</span>
      </span>
    </li>
  );
}

function LeaderboardModal({ board, onClose }: { board: Leaderboard; onClose: () => void }) {
  const info = levelInfo(board.level);
  const inTop = board.top.some((e) => e.isMe);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-gray-900/50" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="leaderboard-title"
        className="relative w-full max-w-sm rounded-2xl bg-white shadow-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto"
      >
        <div className="text-center space-y-1">
          <div className="text-3xl" aria-hidden="true">
            {info.emoji}
          </div>
          <h2 id="leaderboard-title" className="text-lg font-bold text-gray-900">
            Top 10 · Level {board.level}
          </h2>
          <p className="text-sm text-gray-500">{info.name}</p>
        </div>

        {board.top.length === 0 ? (
          <p className="text-center text-sm text-gray-500 py-4">
            Nobody’s on this level’s board yet. Finish a conversation to claim the top spot.
          </p>
        ) : (
          <ol className="space-y-1">
            {board.top.map((e) => (
              <EntryRow key={`${e.rank}-${e.firstName}`} e={e} />
            ))}
            {board.me && (
              <>
                <li className="text-center text-gray-300 leading-none py-1" aria-hidden="true">
                  ⋮
                </li>
                <EntryRow e={board.me} />
              </>
            )}
          </ol>
        )}

        <p className="text-center text-xs text-gray-500">
          {inTop
            ? board.top[0]?.isMe
              ? 'You’re leading this level. Kabisa!'
              : 'You’re in the top 10. Keep going to climb higher.'
            : board.me
            ? `${board.me.rank - 10} place${board.me.rank - 10 === 1 ? '' : 's'} to go to reach the top 10.`
            : 'Finish a conversation or practice to join the board.'}
        </p>

        <button
          type="button"
          onClick={onClose}
          autoFocus
          className="w-full rounded-full bg-green-700 py-2.5 text-sm font-semibold text-white hover:bg-green-800"
        >
          Let’s learn
        </button>
      </div>
    </div>
  );
}

/**
 * Shows the learner's level leaderboard once per sign-in session, and again
 * whenever the Menu's "Top 10" item asks for it.
 */
export function LeaderboardHost() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [board, setBoard] = useState<Leaderboard | null>(null);
  const [open, setOpen] = useState(false);

  const show = useCallback(async () => {
    const res = await loadLeaderboard();
    if (res.board) {
      setBoard(res.board);
      setOpen(true);
    }
  }, []);

  useEffect(() => {
    if (!userId || shownThisSession(userId)) return;
    markShown(userId);
    // Give progress sync a moment to upload this device's latest level / XP first.
    const t = window.setTimeout(() => void show(), 1200);
    return () => window.clearTimeout(t);
  }, [userId, show]);

  useEffect(() => {
    const onOpen = () => void show();
    window.addEventListener(OPEN_LEADERBOARD_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_LEADERBOARD_EVENT, onOpen);
  }, [show]);

  if (!open || !board) return null;
  return <LeaderboardModal board={board} onClose={() => setOpen(false)} />;
}
