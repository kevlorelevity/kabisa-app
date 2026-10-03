import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { Lesson } from '../types';
import { MAX_LEVEL, levelInfo, lessonsInLevel, totalXp } from '../lib/levels';

const CONFETTI = ['🎉', '✨', '🎊', '⭐', '🥳', '💚', '🎉', '✨', '🎊', '⭐', '🥳', '💚'];

interface LevelUpModalProps {
  /** The level that was just completed. */
  level: number;
  lessons: Lesson[];
  onClose: () => void;
}

/** Celebration shown once when the learner passes the last lesson of a level. */
export function LevelUpModal({ level, lessons, onClose }: LevelUpModalProps) {
  const done = levelInfo(level);
  const finishedCourse = level >= MAX_LEVEL;
  const next = finishedCourse ? null : levelInfo(level + 1);
  const firstNext = next ? lessonsInLevel(lessons, next.level)[0] : undefined;
  const xp = totalXp(lessons);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-gray-900/50" onClick={onClose} aria-hidden="true" />
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        {CONFETTI.map((c, i) => (
          <span
            key={i}
            className="absolute text-2xl animate-bounce"
            style={{ left: `${6 + i * 8}%`, top: `${8 + ((i * 37) % 30)}%`, animationDelay: `${(i % 4) * 0.15}s` }}
          >
            {c}
          </span>
        ))}
      </div>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="levelup-title"
        className="relative w-full max-w-sm rounded-2xl bg-white shadow-2xl p-6 text-center space-y-3"
      >
        <p className="text-xs uppercase tracking-widest text-green-700 font-bold">Level {level} complete!</p>
        <p className="text-6xl" aria-hidden="true">
          {next ? next.emoji : done.emoji}
        </p>
        {next ? (
          <>
            <h2 id="levelup-title" className="text-xl font-bold text-gray-900">
              Hongera! You're now a {next.name}
            </h2>
            <p className="text-sm text-gray-600 italic">{next.tagline}</p>
            <p className="text-sm text-gray-500">
              Level {next.level} unlocked · next up: {next.focus.toLowerCase()}.
            </p>
          </>
        ) : (
          <>
            <h2 id="levelup-title" className="text-xl font-bold text-gray-900">
              Kabisa! You're a {done.name}
            </h2>
            <p className="text-sm text-gray-600 italic">{done.tagline}</p>
            <p className="text-sm text-gray-500">You've finished every level. Wakenya watakushangaa — Kenyans will be amazed.</p>
          </>
        )}
        <p className="inline-block rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-sm font-semibold px-3 py-1">
          ⚡ {xp.toLocaleString()} XP
        </p>
        <div className="flex flex-col gap-2 pt-2">
          {firstNext && (
            <Link
              to={`/lesson/${firstNext.id}`}
              onClick={onClose}
              className="px-4 py-2 rounded-full bg-green-700 text-white text-sm font-medium hover:bg-green-800"
            >
              Start Level {next!.level}: {firstNext.title} →
            </Link>
          )}
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-full text-sm text-gray-600 hover:bg-gray-100">
            {firstNext ? 'Later' : 'Asante!'}
          </button>
        </div>
      </div>
    </div>
  );
}
