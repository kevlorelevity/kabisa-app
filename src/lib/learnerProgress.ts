import { getSupabase } from './supabase';

// -------- Learner progress for admins --------
//
// Reads every learner's synced progress (account, profile, learner_progress,
// lesson_score — admins can read all rows under RLS) and shapes it for the
// admin "Learner progress" page. Read-only.

export interface RawAccount {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  role: string;
  created_at: string;
}
export interface RawProfile {
  account_id: string;
  display_name: string | null;
  nationality: string | null;
}
export interface RawProgress {
  account_id: string;
  level: number | null;
  level_name: string | null;
  xp: number | null;
  lessons_passed: number | null;
  lessons_started: number | null;
  lessons_total: number | null;
  next_lesson_id: string | null;
  course_complete: boolean | null;
  updated_at: string | null;
}
export interface RawScore {
  account_id: string;
  lesson_id: string;
  dialogue_best: number | null;
  practice_best: number | null;
  attempts: number | null;
  passed: boolean | null;
  updated_at: string | null;
}

export interface LearnerScore {
  lessonId: string;
  dialogue: number | null;
  practice: number | null;
  attempts: number;
  passed: boolean;
  updatedAt: string | null;
}

export interface LearnerRow {
  id: string;
  name: string;
  email: string;
  nationality: string | null;
  isAdmin: boolean;
  joined: string;
  /** null = never opened a lesson. */
  level: number | null;
  levelName: string | null;
  xp: number;
  lessonsPassed: number;
  lessonsTried: number;
  lessonsTotal: number | null;
  avgDialogue: number | null;
  avgPractice: number | null;
  attempts: number;
  nextLessonId: string | null;
  courseComplete: boolean;
  lastActive: string | null;
  scores: LearnerScore[];
}

export interface LessonStat {
  lessonId: string;
  tried: number;
  passed: number;
  avgDialogue: number | null;
  avgPractice: number | null;
  avgAttempts: number;
  /** Learners whose next lesson is this one (where they are "stuck" or heading). */
  waiting: number;
}

export interface ProgressSummary {
  signedUp: number;
  started: number;
  passedOne: number;
  reachedLevel2: number;
  active7d: number;
  new7d: number;
  courseComplete: number;
}

const avg = (xs: number[]): number | null => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const later = (a: string | null, b: string | null): string | null => (!a ? b : !b ? a : a > b ? a : b);

function displayName(a: RawAccount, p?: RawProfile): string {
  const fromProfile = p?.display_name?.trim();
  if (fromProfile) return fromProfile;
  const full = [a.first_name, a.last_name].filter(Boolean).join(' ').trim();
  if (full) return full;
  return (a.email ?? '').split('@')[0] || 'Unnamed learner';
}

export function buildLearnerRows(
  accounts: RawAccount[],
  profiles: RawProfile[],
  progress: RawProgress[],
  scores: RawScore[],
): LearnerRow[] {
  const prof = new Map(profiles.map((p) => [p.account_id, p]));
  const prog = new Map(progress.map((p) => [p.account_id, p]));
  const byAccount = new Map<string, RawScore[]>();
  for (const s of scores) {
    const list = byAccount.get(s.account_id) ?? [];
    list.push(s);
    byAccount.set(s.account_id, list);
  }
  const rows = accounts.map((a): LearnerRow => {
    const p = prog.get(a.id);
    const own = byAccount.get(a.id) ?? [];
    const lastScore = own.reduce<string | null>((m, s) => later(m, s.updated_at), null);
    const dialogues = own.map((s) => s.dialogue_best).filter((v): v is number => v != null);
    const practices = own.map((s) => s.practice_best).filter((v): v is number => v != null);
    return {
      id: a.id,
      name: displayName(a, prof.get(a.id)),
      email: a.email ?? '',
      nationality: prof.get(a.id)?.nationality ?? null,
      isAdmin: a.role === 'admin',
      joined: a.created_at,
      level: p?.level ?? (own.length ? 1 : null),
      levelName: p?.level_name ?? null,
      xp: p?.xp ?? 0,
      lessonsPassed: p?.lessons_passed ?? own.filter((s) => s.passed).length,
      lessonsTried: own.length,
      lessonsTotal: p?.lessons_total ?? null,
      avgDialogue: avg(dialogues),
      avgPractice: avg(practices),
      attempts: own.reduce((n, s) => n + (s.attempts ?? 0), 0),
      nextLessonId: p?.next_lesson_id ?? null,
      courseComplete: Boolean(p?.course_complete),
      lastActive: later(p?.updated_at ?? null, lastScore),
      scores: own
        .map((s) => ({
          lessonId: s.lesson_id,
          dialogue: s.dialogue_best,
          practice: s.practice_best,
          attempts: s.attempts ?? 0,
          passed: Boolean(s.passed),
          updatedAt: s.updated_at,
        }))
        .sort((x, y) => (y.updatedAt ?? '').localeCompare(x.updatedAt ?? '')),
    };
  });
  // Most recently active first; never-started learners last, newest sign-ups first.
  return rows.sort((x, y) => {
    if (x.lastActive && y.lastActive) return y.lastActive.localeCompare(x.lastActive);
    if (x.lastActive) return -1;
    if (y.lastActive) return 1;
    return y.joined.localeCompare(x.joined);
  });
}

export function summarize(rows: LearnerRow[], now: Date = new Date()): ProgressSummary {
  const weekAgo = new Date(now.getTime() - 7 * 24 * 3600 * 1000).toISOString();
  return {
    signedUp: rows.length,
    started: rows.filter((r) => r.lastActive).length,
    passedOne: rows.filter((r) => r.lessonsPassed > 0).length,
    reachedLevel2: rows.filter((r) => (r.level ?? 0) >= 2).length,
    active7d: rows.filter((r) => r.lastActive && r.lastActive >= weekAgo).length,
    new7d: rows.filter((r) => r.joined >= weekAgo).length,
    courseComplete: rows.filter((r) => r.courseComplete).length,
  };
}

export function lessonStats(rows: LearnerRow[]): Map<string, LessonStat> {
  const out = new Map<string, LessonStat>();
  const get = (id: string) => {
    let s = out.get(id);
    if (!s) {
      s = { lessonId: id, tried: 0, passed: 0, avgDialogue: null, avgPractice: null, avgAttempts: 0, waiting: 0 };
      out.set(id, s);
    }
    return s;
  };
  const acc = new Map<string, { d: number[]; p: number[]; a: number[] }>();
  for (const r of rows) {
    if (r.nextLessonId && !r.courseComplete) get(r.nextLessonId).waiting += 1;
    for (const sc of r.scores) {
      const s = get(sc.lessonId);
      s.tried += 1;
      if (sc.passed) s.passed += 1;
      const a = acc.get(sc.lessonId) ?? { d: [], p: [], a: [] };
      if (sc.dialogue != null) a.d.push(sc.dialogue);
      if (sc.practice != null) a.p.push(sc.practice);
      a.a.push(sc.attempts);
      acc.set(sc.lessonId, a);
    }
  }
  for (const [id, a] of acc) {
    const s = get(id);
    s.avgDialogue = avg(a.d);
    s.avgPractice = avg(a.p);
    s.avgAttempts = avg(a.a) ?? 0;
  }
  return out;
}

export async function loadLearnerRows(): Promise<{ rows: LearnerRow[]; error?: string }> {
  const supa = getSupabase();
  if (!supa) return { rows: [], error: 'Supabase isn’t configured in this build.' };
  const [acc, prof, prog, sc] = await Promise.all([
    supa.from('account').select('id,email,first_name,last_name,role,created_at').limit(5000),
    supa.from('profile').select('account_id,display_name,nationality').limit(5000),
    supa
      .from('learner_progress')
      .select('account_id,level,level_name,xp,lessons_passed,lessons_started,lessons_total,next_lesson_id,course_complete,updated_at')
      .limit(5000),
    supa
      .from('lesson_score')
      .select('account_id,lesson_id,dialogue_best,practice_best,attempts,passed,updated_at')
      .limit(50000),
  ]);
  const err = acc.error ?? prof.error ?? prog.error ?? sc.error;
  if (err) return { rows: [], error: err.message };
  return {
    rows: buildLearnerRows(
      (acc.data ?? []) as RawAccount[],
      (prof.data ?? []) as RawProfile[],
      (prog.data ?? []) as RawProgress[],
      (sc.data ?? []) as RawScore[],
    ),
  };
}
