import { describe, expect, it } from 'vitest';
import { shapeLeaderboard } from './leaderboard';

const row = (lb_rank: number, is_me = false, xp = 100 - lb_rank) => ({
  lb_rank,
  lb_level: 3,
  first_name: `P${lb_rank}`,
  nationality: 'KE',
  xp,
  is_me,
});

describe('leaderboard', () => {
  it('shows the top 10 and the learner below it when outside the top 10', () => {
    const rows = [...Array.from({ length: 10 }, (_, i) => row(i + 1)), row(14, true)];
    const b = shapeLeaderboard(rows);
    expect(b.level).toBe(3);
    expect(b.top).toHaveLength(10);
    expect(b.me).toMatchObject({ rank: 14, isMe: true });
  });

  it('has no separate row when the learner is in the top 10', () => {
    const b = shapeLeaderboard([row(1), row(2, true), row(3)]);
    expect(b.top.map((e) => e.isMe)).toEqual([false, true, false]);
    expect(b.me).toBeNull();
  });

  it('copes with an empty board and missing names', () => {
    expect(shapeLeaderboard([], 2)).toEqual({ level: 2, top: [], me: null });
    expect(shapeLeaderboard([{ ...row(1), first_name: ' ' }]).top[0].firstName).toBe('Learner');
  });
});
