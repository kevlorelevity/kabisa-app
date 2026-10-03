import { EditPencil } from '../components/EditPencil';
import { Link } from 'react-router-dom';
import { useLessons } from '../hooks/useLessons';
import { LessonCard } from '../components/LessonCard';
import { isLessonPassed, isLessonUnlocked } from '../lib/lessonScores';
import { useOverridesVersion } from '../lib/contentOverrides';
import {
  LEVELS,
  MAX_LEVEL,
  courseComplete,
  currentLevel,
  lessonXp,
  lessonsInLevel,
  levelInfo,
  levelProgress,
  themeVisit,
  totalXp,
} from '../lib/levels';

function RankCard() {
  const lessons = useLessons();
  const lvl = currentLevel(lessons);
  const info = levelInfo(lvl);
  const prog = levelProgress(lessons, lvl);
  const xp = totalXp(lessons);
  const done = courseComplete(lessons);
  const nextLesson = lessons.find((l) => !isLessonPassed(l));
  const nextLevel = lvl < MAX_LEVEL ? levelInfo(lvl + 1) : null;
  const pctDone = prog.total ? Math.round((prog.passed / prog.total) * 100) : 0;

  return (
    <div className="rounded-2xl border border-green-200 bg-gradient-to-br from-green-50 to-white p-5 sm:p-6">
      <div className="flex items-start gap-4">
        <div className="text-5xl sm:text-6xl leading-none" aria-hidden="true">
          {info.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs uppercase tracking-widest text-green-700 font-bold">
            {done ? 'Course complete' : `Level ${lvl} of ${MAX_LEVEL}`}
          </p>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight">{info.name}</h1>
          <p className="text-sm text-gray-600 italic mt-0.5">{info.tagline}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-lg font-bold text-amber-700">⚡ {xp.toLocaleString()}</p>
          <p className="text-xs text-gray-400">XP</p>
        </div>
      </div>

      {!done && (
        <div className="mt-4 space-y-1.5">
          <div className="flex justify-between text-xs text-gray-500">
            <span>
              {prog.passed} of {prog.total} lessons passed in this level
            </span>
            {nextLevel && (
              <span className="hidden sm:inline">
                Next: {nextLevel.emoji} {nextLevel.name}
              </span>
            )}
          </div>
          <div className="h-2.5 rounded-full bg-green-100 overflow-hidden" role="progressbar" aria-valuenow={pctDone} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full bg-green-600 rounded-full transition-all" style={{ width: `${Math.max(pctDone, 3)}%` }} />
          </div>
        </div>
      )}

      {nextLesson && (
        <Link
          to={`/lesson/${nextLesson.id}`}
          className="mt-4 inline-flex items-center gap-1 px-4 py-2 rounded-full bg-green-700 text-white text-sm font-medium hover:bg-green-800"
        >
          Continue: {nextLesson.title} →
        </Link>
      )}
    </div>
  );
}

export function LessonsView() {
  useOverridesVersion(); // re-render on admin live edits
  const lessons = useLessons();
  const working = currentLevel(lessons);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <RankCard />

      <p className="text-gray-500 text-sm -mt-2">
        Play real conversations one line at a time, then lock them in with practice and flashcards. Ten levels, from
        your first "Mambo?" to proverbs at a harambee — and the scenarios come back at higher levels with richer
        Swahili.
      </p>

      {lessons.length === 0 ? (
        <p className="text-gray-400 text-sm">No lessons yet.</p>
      ) : (
        LEVELS.map((lvl) => {
          const ls = lessonsInLevel(lessons, lvl.level);
          if (ls.length === 0) return null;
          const prog = levelProgress(lessons, lvl.level);
          const ahead = lvl.level > working;
          return (
            <section key={lvl.level} aria-labelledby={`level-${lvl.level}`}>
              <div className={`flex items-center gap-3 mb-3 ${ahead ? 'opacity-60' : ''}`}>
                <div
                  className={`w-11 h-11 shrink-0 rounded-full flex items-center justify-center text-2xl border ${
                    prog.complete ? 'bg-green-100 border-green-300' : 'bg-white border-gray-200'
                  }`}
                  aria-hidden="true"
                >
                  {lvl.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 id={`level-${lvl.level}`} className="font-bold text-gray-900 leading-tight">
                    Level {lvl.level} · {lvl.name}{' '}
                    <EditPencil target={{ targetType: 'level', label: `Level ${lvl.level} name & focus`, currentText: `${lvl.name} — ${lvl.tagline} — ${lvl.focus}`, itemId: `level-${lvl.level}` }} />
                  </h2>
                  <p className="text-xs text-gray-500 truncate">{lvl.focus}</p>
                </div>
                <span
                  className={`text-xs whitespace-nowrap px-2 py-0.5 rounded-full ${
                    prog.complete ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {prog.complete ? '✓ Complete' : `${prog.passed}/${prog.total}`}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {ls.map((l) => {
                  const i = lessons.findIndex((x) => x.id === l.id);
                  return (
                    <LessonCard
                      key={l.id}
                      lesson={l}
                      passed={isLessonPassed(l)}
                      locked={!isLessonUnlocked(lessons, l.id)}
                      previousTitle={lessons[i - 1]?.title}
                      xp={lessonXp(l)}
                      themeVisit={themeVisit(lessons, l)}
                    />
                  );
                })}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}
