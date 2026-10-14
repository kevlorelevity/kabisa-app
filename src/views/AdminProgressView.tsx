import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAdmin } from '../components/adminContext';
import { useLessons } from '../hooks/useLessons';
import { getCountry } from '../lib/countries';
import { levelInfo } from '../lib/levels';
import { PASS_THRESHOLD } from '../lib/lessonScores';
import { lessonStats, loadLearnerRows, summarize, type LearnerRow } from '../lib/learnerProgress';

type SortKey = 'name' | 'level' | 'xp' | 'lessonsPassed' | 'avgDialogue' | 'avgPractice' | 'lastActive' | 'joined';

const pct = (v: number | null) => (v == null ? '—' : `${Math.round(v * 100)}%`);
const scoreTone = (v: number | null) =>
  v == null ? 'text-gray-400' : v >= PASS_THRESHOLD ? 'text-green-700' : v >= 0.5 ? 'text-amber-600' : 'text-red-600';

function ago(iso: string | null): string {
  if (!iso) return 'Not started';
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return `${Math.max(mins, 1)} min ago`;
  const h = Math.round(mins / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  if (d < 45) return `${d} day${d === 1 ? '' : 's'} ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
const shortDate = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

/** Admin-only: how every learner is getting on, and which lessons trip people up. */
export function AdminProgressView() {
  const { isAdmin } = useAdmin();
  const lessons = useLessons();
  const [rows, setRows] = useState<LearnerRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadedAt, setLoadedAt] = useState<Date | null>(null);
  const [includeAdmins, setIncludeAdmins] = useState(false);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 } | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const res = await loadLearnerRows();
    if (res.error) setError(res.error);
    else {
      setRows(res.rows);
      setLoadedAt(new Date());
    }
  }, []);

  useEffect(() => {
    if (isAdmin) void load();
  }, [isAdmin, load]);

  const lessonById = useMemo(() => new Map(lessons.map((l) => [l.id, l])), [lessons]);
  const title = (id: string | null) => (id ? lessonById.get(id)?.title ?? id : '');

  const visible = useMemo(() => (rows ?? []).filter((r) => includeAdmins || !r.isAdmin), [rows, includeAdmins]);
  const summary = useMemo(() => summarize(visible), [visible]);
  const stats = useMemo(() => lessonStats(visible), [visible]);

  const lessonRows = useMemo(
    () =>
      lessons
        .filter((l) => stats.has(l.id))
        .map((l) => ({ lesson: l, stat: stats.get(l.id)! }))
        .concat(
          [...stats.values()]
            .filter((s) => !lessonById.has(s.lessonId))
            .map((s) => ({ lesson: undefined, stat: s })),
        ),
    [lessons, stats, lessonById],
  );

  const table = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = visible.filter(
      (r) => !q || `${r.name} ${r.email} ${title(r.nextLessonId)}`.toLowerCase().includes(q),
    );
    if (sort) {
      const { key, dir } = sort;
      list = [...list].sort((a, b) => {
        const av = a[key];
        const bv = b[key];
        if (av == null && bv == null) return 0;
        if (av == null) return 1;
        if (bv == null) return -1;
        return (typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv))) * dir;
      });
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, query, sort, lessonById]);

  if (!isAdmin)
    return (
      <div className="max-w-md mx-auto px-4 py-12 text-center text-sm text-gray-500">
        This page is for Kabisa admins. <Link to="/" className="text-green-700 hover:underline">Back to lessons</Link>
      </div>
    );

  const funnel = [
    { label: 'Signed up', n: summary.signedUp },
    { label: 'Started a lesson', n: summary.started },
    { label: 'Passed a lesson', n: summary.passedOne },
    { label: 'Reached level 2', n: summary.reachedLevel2 },
    { label: 'Finished the course', n: summary.courseComplete },
  ];
  let worst = -1;
  let worstLoss = 0;
  funnel.forEach((f, i) => {
    if (i && funnel[i - 1].n - f.n > worstLoss) {
      worstLoss = funnel[i - 1].n - f.n;
      worst = i;
    }
  });

  const header = (key: SortKey, label: string, cls = '') => {
    const active = sort?.key === key;
    return (
      <th
        className={`sticky top-0 bg-white px-3 py-2 font-medium text-gray-500 whitespace-nowrap ${cls}`}
        aria-sort={active ? (sort!.dir === 1 ? 'ascending' : 'descending') : undefined}
      >
        <button
          type="button"
          className="hover:text-green-700"
          onClick={() =>
            setSort((s) =>
              s?.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: key === 'name' ? 1 : -1 },
            )
          }
        >
          {label}
          {active ? (sort!.dir === 1 ? ' ↑' : ' ↓') : ''}
        </button>
      </th>
    );
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <Link to="/" className="text-sm text-gray-400 hover:text-gray-600">
        ← Lessons
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Learner progress</h1>
          <p className="text-sm text-gray-500">
            {rows
              ? `${summary.started} of ${summary.signedUp} learners have started a lesson, and ${summary.passedOne} have passed one.`
              : 'Loading every learner’s synced progress…'}
          </p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <label className="flex items-center gap-2 text-gray-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={includeAdmins}
              onChange={(e) => setIncludeAdmins(e.target.checked)}
              className="accent-green-700"
            />
            Include admins
          </label>
          <button
            type="button"
            onClick={() => void load()}
            className="px-3 py-1 rounded-full border border-gray-200 text-gray-600 hover:text-green-700 hover:border-green-300"
          >
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Couldn’t load progress: {error}
        </p>
      )}

      {rows && (
        <>
          <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Signed up', n: summary.signedUp },
              { label: 'New this week', n: summary.new7d },
              { label: 'Active this week', n: summary.active7d },
              { label: 'Passed a lesson', n: summary.passedOne },
            ].map((k) => (
              <div key={k.label} className="rounded-xl border border-gray-200 bg-white px-4 py-3">
                <div className="text-xs text-gray-500">{k.label}</div>
                <div className="text-2xl font-semibold text-gray-900 tabular-nums">{k.n}</div>
              </div>
            ))}
          </section>

          <section className="grid md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <h2 className="font-semibold text-gray-900">Where learners drop off</h2>
              <p className="text-xs text-gray-500 mb-3">Share of everyone who signed up. The biggest drop is in red.</p>
              <div className="space-y-2">
                {funnel.map((f, i) => (
                  <div key={f.label} className="grid grid-cols-[8.5rem_1fr_4.5rem] items-center gap-2 text-sm">
                    <span className="text-gray-600 truncate">{f.label}</span>
                    <span className="h-3 rounded bg-gray-100 overflow-hidden">
                      <span
                        className={`block h-full rounded ${i === worst ? 'bg-red-500' : 'bg-green-600'}`}
                        style={{ width: `${summary.signedUp ? (f.n / summary.signedUp) * 100 : 0}%` }}
                      />
                    </span>
                    <span className={`text-right tabular-nums ${i === worst ? 'text-red-600' : 'text-gray-900'}`}>
                      {f.n}{' '}
                      <span className="text-gray-400 text-xs">
                        {summary.signedUp ? Math.round((f.n / summary.signedUp) * 100) : 0}%
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <h2 className="font-semibold text-gray-900">How each lesson is going</h2>
              <p className="text-xs text-gray-500 mb-3">
                Best first-try scores. A pass needs {Math.round(PASS_THRESHOLD * 100)}% on both. “Up next” counts
                learners for whom this is the next lesson.
              </p>
              {lessonRows.length === 0 ? (
                <p className="text-sm text-gray-400">No lesson has been tried yet.</p>
              ) : (
                <div className="overflow-auto max-h-72">
                  <table className="w-full text-sm tabular-nums">
                    <thead>
                      <tr className="text-left text-xs text-gray-500">
                        <th className="sticky top-0 bg-white py-1 pr-2 font-medium">Lesson</th>
                        <th className="sticky top-0 bg-white py-1 px-2 font-medium text-right">Tried</th>
                        <th className="sticky top-0 bg-white py-1 px-2 font-medium text-right">Passed</th>
                        <th className="sticky top-0 bg-white py-1 px-2 font-medium text-right">Conv.</th>
                        <th className="sticky top-0 bg-white py-1 px-2 font-medium text-right">Practice</th>
                        <th className="sticky top-0 bg-white py-1 pl-2 font-medium text-right">Up next</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lessonRows.map(({ lesson, stat }) => (
                        <tr key={stat.lessonId} className="border-t border-gray-100">
                          <td className="py-1.5 pr-2">
                            <span className="text-gray-400 text-xs mr-1">L{lesson?.level ?? '?'}</span>
                            {lesson ? (
                              <Link to={`/lesson/${lesson.id}`} className="text-gray-900 hover:text-green-700">
                                {lesson.title}
                              </Link>
                            ) : (
                              <span className="text-gray-500">{stat.lessonId}</span>
                            )}
                          </td>
                          <td className="py-1.5 px-2 text-right">{stat.tried}</td>
                          <td className="py-1.5 px-2 text-right">{stat.passed}</td>
                          <td className={`py-1.5 px-2 text-right ${scoreTone(stat.avgDialogue)}`}>{pct(stat.avgDialogue)}</td>
                          <td className={`py-1.5 px-2 text-right ${scoreTone(stat.avgPractice)}`}>{pct(stat.avgPractice)}</td>
                          <td className="py-1.5 pl-2 text-right">{stat.waiting || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div>
                <h2 className="font-semibold text-gray-900">Every learner</h2>
                <p className="text-xs text-gray-500">Click a learner to see their lesson-by-lesson scores.</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500">
                  {table.length === visible.length ? `${visible.length} learners` : `${table.length} of ${visible.length}`}
                </span>
                <input
                  id="progress-search"
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search name, email, lesson"
                  aria-label="Search learners"
                  className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 w-56 max-w-full focus:outline-none focus:border-green-500"
                />
              </div>
            </div>
            <div className="overflow-auto max-h-[36rem]">
              <table className="w-full text-sm tabular-nums">
                <thead>
                  <tr className="text-left text-xs border-b border-gray-200">
                    {header('name', 'Learner')}
                    {header('level', 'Level')}
                    {header('xp', 'XP', 'text-right')}
                    {header('lessonsPassed', 'Passed', 'text-right')}
                    {header('avgDialogue', 'Conv.', 'text-right hidden sm:table-cell')}
                    {header('avgPractice', 'Practice', 'text-right hidden sm:table-cell')}
                    <th className="sticky top-0 bg-white px-3 py-2 font-medium text-gray-500 hidden md:table-cell">
                      Next lesson
                    </th>
                    {header('lastActive', 'Last active')}
                    {header('joined', 'Joined', 'hidden md:table-cell')}
                  </tr>
                </thead>
                <tbody>
                  {table.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-3 py-6 text-center text-gray-400">
                        {query ? 'No learner matches that search.' : 'Nobody has signed up yet.'}
                      </td>
                    </tr>
                  )}
                  {table.map((r) => {
                    const lv = r.level ? levelInfo(r.level) : null;
                    const flag = getCountry(r.nationality ?? undefined)?.flag;
                    const open = openId === r.id;
                    return (
                      <Fragment key={r.id}>
                        <tr
                          className={`border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${open ? 'bg-gray-50' : ''}`}
                          onClick={() => setOpenId(open ? null : r.id)}
                          aria-expanded={open}
                        >
                          <td className="px-3 py-2">
                            <div className="font-medium text-gray-900 whitespace-nowrap">
                              {flag ? `${flag} ` : ''}
                              {r.name}
                              {r.isAdmin && (
                                <span className="ml-1.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 bg-amber-50 border border-amber-200 rounded px-1">
                                  admin
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-400">{r.email}</div>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            {lv ? (
                              <span title={lv.name}>
                                {lv.emoji} {r.level}
                                <span className="hidden lg:inline text-gray-500"> · {lv.name}</span>
                              </span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right">{r.xp.toLocaleString()}</td>
                          <td className="px-3 py-2 text-right whitespace-nowrap">
                            {r.lessonsPassed}
                            {r.lessonsTotal ? <span className="text-gray-400 text-xs"> / {r.lessonsTotal}</span> : null}
                          </td>
                          <td className={`px-3 py-2 text-right hidden sm:table-cell ${scoreTone(r.avgDialogue)}`}>
                            {pct(r.avgDialogue)}
                          </td>
                          <td className={`px-3 py-2 text-right hidden sm:table-cell ${scoreTone(r.avgPractice)}`}>
                            {pct(r.avgPractice)}
                          </td>
                          <td className="px-3 py-2 hidden md:table-cell text-gray-600 max-w-[14rem] truncate">
                            {r.courseComplete ? 'Course finished 🎉' : title(r.nextLessonId) || '—'}
                          </td>
                          <td
                            className={`px-3 py-2 whitespace-nowrap ${r.lastActive ? 'text-gray-700' : 'text-gray-400'}`}
                            title={r.lastActive ?? undefined}
                          >
                            {ago(r.lastActive)}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-gray-500 hidden md:table-cell">
                            {shortDate(r.joined)}
                          </td>
                        </tr>
                        {open && (
                          <tr className="bg-gray-50 border-b border-gray-100">
                            <td colSpan={9} className="px-3 pb-3">
                              {r.scores.length === 0 ? (
                                <p className="text-sm text-gray-400 py-2">Hasn’t finished a conversation or practice yet.</p>
                              ) : (
                                <ul className="divide-y divide-gray-200 text-sm">
                                  {r.scores.map((s) => (
                                    <li key={s.lessonId} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-1.5">
                                      <span className="min-w-0 flex-1 text-gray-900">
                                        {s.passed ? '✓ ' : ''}
                                        {title(s.lessonId)}
                                      </span>
                                      <span className={scoreTone(s.dialogue)}>Conv. {pct(s.dialogue)}</span>
                                      <span className={scoreTone(s.practice)}>Practice {pct(s.practice)}</span>
                                      <span className="text-gray-500">
                                        {s.attempts} attempt{s.attempts === 1 ? '' : 's'}
                                      </span>
                                      <span className="text-gray-400 text-xs">{ago(s.updatedAt)}</span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
          {loadedAt && (
            <p className="text-xs text-gray-400">
              Updated {loadedAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}. Progress syncs when a
              learner is signed in, so scores made offline appear once they reconnect.
            </p>
          )}
        </>
      )}
    </div>
  );
}
