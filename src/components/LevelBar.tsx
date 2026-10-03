import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLessons } from '../hooks/useLessons';
import { SCORES_CHANGED_EVENT } from '../lib/lessonScores';
import { MAX_LEVEL, courseComplete, currentLevel, levelInfo, levelXp, totalXp } from '../lib/levels';

/** Re-render whenever lesson scores change (they live in localStorage). */
function useScoresVersion(): number {
  const [v, setV] = useState(0);
  useEffect(() => {
    const bump = () => setV((n) => n + 1);
    window.addEventListener(SCORES_CHANGED_EVENT, bump);
    window.addEventListener('storage', bump);
    return () => {
      window.removeEventListener(SCORES_CHANGED_EVENT, bump);
      window.removeEventListener('storage', bump);
    };
  }, []);
  return v;
}

/** Always-visible strip under the nav: current level and XP towards the next one. */
export function LevelBar() {
  const lessons = useLessons();
  useScoresVersion();
  if (lessons.length === 0) return null;

  const lvl = currentLevel(lessons);
  const info = levelInfo(lvl);
  const done = courseComplete(lessons);
  const { earned, required } = levelXp(lessons, lvl);
  const pct = done ? 100 : required ? Math.round((earned / required) * 100) : 0;
  const next = lvl < MAX_LEVEL ? lvl + 1 : null;
  const label = done
    ? `Course complete · ${totalXp(lessons).toLocaleString()} XP`
    : `${earned} / ${required} XP${next ? ` to Level ${next}` : ' to finish'}`;

  return (
    <Link
      to="/"
      title={`${info.name} — ${info.tagline}`}
      aria-label={`Level ${lvl} of ${MAX_LEVEL}, ${info.name}. ${label}.`}
      className="block border-t border-gray-100 bg-green-50/60 hover:bg-green-50"
    >
      <div className="max-w-4xl mx-auto px-4 h-8 flex items-center gap-2.5 text-xs">
        <span className="shrink-0" aria-hidden="true">
          {info.emoji}
        </span>
        <span className="shrink-0 font-semibold text-green-900">
          Lv {lvl}
          <span className="hidden sm:inline font-normal text-green-800"> · {info.name}</span>
        </span>
        <span className="flex-1 min-w-8 h-1.5 rounded-full bg-green-100 overflow-hidden" aria-hidden="true">
          <span className="block h-full rounded-full bg-green-600 transition-all" style={{ width: `${Math.max(pct, 2)}%` }} />
        </span>
        <span className="shrink-0 font-medium text-amber-700 tabular-nums">⚡ {label}</span>
      </div>
    </Link>
  );
}
