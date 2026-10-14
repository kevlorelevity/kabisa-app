import { getSupabase } from './supabase';

// -------- Per-level leaderboard --------
//
// The top 10 learners on the caller's current level, plus the caller's own
// place. Served by the level_leaderboard() database function (019), which
// returns only first names, country codes and XP.

export interface LeaderboardEntry {
  rank: number;
  firstName: string;
  nationality: string | null;
  xp: number;
  isMe: boolean;
}

export interface Leaderboard {
  level: number;
  /** Up to 10 entries. */
  top: LeaderboardEntry[];
  /** The caller's own row when they're outside the top 10 (null when inside it or not yet on the board). */
  me: LeaderboardEntry | null;
}

interface Row {
  lb_rank: number;
  lb_level: number;
  first_name: string | null;
  nationality: string | null;
  xp: number | null;
  is_me: boolean;
}

export const OPEN_LEADERBOARD_EVENT = 'ksa:open-leaderboard';

/** Ask the app to show the leaderboard (the Menu's "Top 10" item). */
export function openLeaderboard(): void {
  window.dispatchEvent(new Event(OPEN_LEADERBOARD_EVENT));
}

export function shapeLeaderboard(rows: Row[], fallbackLevel = 1): Leaderboard {
  const entries = [...rows]
    .sort((a, b) => a.lb_rank - b.lb_rank)
    .map(
      (r): LeaderboardEntry => ({
        rank: r.lb_rank,
        firstName: r.first_name?.trim() || 'Learner',
        nationality: r.nationality,
        xp: r.xp ?? 0,
        isMe: r.is_me,
      }),
    );
  const top = entries.filter((e) => e.rank <= 10).slice(0, 10);
  const mine = entries.find((e) => e.isMe);
  return {
    level: rows[0]?.lb_level ?? fallbackLevel,
    top,
    me: mine && mine.rank > 10 ? mine : null,
  };
}

export async function loadLeaderboard(): Promise<{ board: Leaderboard | null; error?: string }> {
  const supa = getSupabase();
  if (!supa) return { board: null, error: 'offline' };
  const { data, error } = await supa.rpc('level_leaderboard');
  if (error) return { board: null, error: error.message };
  return { board: shapeLeaderboard((data ?? []) as Row[]) };
}
