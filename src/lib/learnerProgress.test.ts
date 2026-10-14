import { describe, expect, it } from 'vitest';
import { buildLearnerRows, lessonStats, summarize, type RawAccount, type RawScore } from './learnerProgress';

const acct = (id: string, extra: Partial<RawAccount> = {}): RawAccount => ({
  id,
  email: `${id}@example.com`,
  first_name: null,
  last_name: null,
  role: 'learner',
  created_at: '2026-10-01T00:00:00Z',
  ...extra,
});
const score = (account_id: string, lesson_id: string, extra: Partial<RawScore> = {}): RawScore => ({
  account_id,
  lesson_id,
  dialogue_best: 0.8,
  practice_best: 0.9,
  attempts: 2,
  passed: true,
  updated_at: '2026-10-10T10:00:00Z',
  ...extra,
});

describe('learner progress', () => {
  const rows = buildLearnerRows(
    [acct('a', { first_name: 'Amina' }), acct('b'), acct('c', { role: 'admin', created_at: '2026-10-09T00:00:00Z' })],
    [{ account_id: 'a', display_name: 'Ami', nationality: 'KE' }],
    [
      {
        account_id: 'a', level: 2, level_name: 'Sukuma Sprout', xp: 700, lessons_passed: 3, lessons_started: 4,
        lessons_total: 47, next_lesson_id: 'x', course_complete: false, updated_at: '2026-10-11T09:00:00Z',
      },
    ],
    [score('a', 'uber'), score('a', 'uber-2', { passed: false, dialogue_best: 0.4, practice_best: null }), score('c', 'uber', { updated_at: '2026-10-12T00:00:00Z' })],
  );

  it('names learners from profile, then account name, then email', () => {
    expect(rows.find((r) => r.id === 'a')!.name).toBe('Ami');
    expect(rows.find((r) => r.id === 'b')!.name).toBe('b');
  });

  it('sorts by last activity and puts never-started learners last', () => {
    expect(rows.map((r) => r.id)).toEqual(['c', 'a', 'b']);
    expect(rows[2].lastActive).toBeNull();
  });

  it('falls back to lesson scores when no progress row exists', () => {
    const c = rows.find((r) => r.id === 'c')!;
    expect(c.level).toBe(1);
    expect(c.lessonsPassed).toBe(1);
    expect(c.isAdmin).toBe(true);
  });

  it('averages only the scores a learner has', () => {
    const a = rows.find((r) => r.id === 'a')!;
    expect(a.avgDialogue).toBeCloseTo(0.6);
    expect(a.avgPractice).toBeCloseTo(0.9);
    expect(a.attempts).toBe(4);
  });

  it('summarises the funnel', () => {
    const s = summarize(rows, new Date('2026-10-13T00:00:00Z'));
    expect(s).toMatchObject({ signedUp: 3, started: 2, passedOne: 2, reachedLevel2: 1, active7d: 2, new7d: 1 });
  });

  it('collects per-lesson stats and who is up next', () => {
    const st = lessonStats(rows);
    expect(st.get('uber')).toMatchObject({ tried: 2, passed: 2 });
    expect(st.get('uber-2')!.avgPractice).toBeNull();
    expect(st.get('x')!.waiting).toBe(1);
  });
});
