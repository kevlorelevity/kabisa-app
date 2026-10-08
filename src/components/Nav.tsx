import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useGrammarFavorites } from '../lib/grammarFavorites';
import { useProfile } from '../hooks/profileContext';
import { getCountry } from '../lib/countries';
import { BetaSticker } from './BetaSticker';
import { LevelBar } from './LevelBar';
import { useAdmin } from './adminContext';
import { setRoaming, useRoam } from '../lib/roam';

/** Admins get an "Admin" menu (Roam on/off + Sign out) in place of the plain Sign out button. */
function AdminMenu({ onSignOut }: { onSignOut: () => void }) {
  const roaming = useRoam();
  const { activity, openActivity } = useAdmin();
  const busy = activity.saving + activity.working;
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`text-sm font-medium px-2.5 py-1 rounded-full border transition-colors ${
          roaming
            ? 'border-amber-400 bg-amber-50 text-amber-800'
            : 'border-gray-200 text-gray-600 hover:text-green-700 hover:border-green-300'
        }`}
      >
        Admin{roaming && <span className="ml-1 text-xs font-semibold">· Roam</span>}
        {busy > 0 && (
          <span className="ml-1 inline-flex items-center gap-0.5 text-xs text-amber-700" title="Saving in the background">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" aria-hidden="true" />
            {busy}
          </span>
        )}
        {activity.failed > 0 && busy === 0 && (
          <span className="ml-1 text-xs font-bold text-red-600" title="Something failed — open Activity">!</span>
        )}{' '}
        <span aria-hidden="true">▾</span>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-60 rounded-xl border border-gray-200 bg-white shadow-lg py-1 z-20"
        >
          <button
            type="button"
            role="menuitemcheckbox"
            aria-checked={roaming}
            onClick={() => {
              setRoaming(!roaming);
              setOpen(false);
            }}
            className="w-full text-left px-4 py-2.5 hover:bg-gray-50 flex items-start justify-between gap-3"
          >
            <span>
              <span className="block text-sm font-medium text-gray-900">Roam</span>
              <span className="block text-xs text-gray-500">
                {roaming ? 'On — every lesson is open' : 'Off — lessons unlock by score'}
              </span>
            </span>
            <span
              aria-hidden="true"
              className={`mt-0.5 shrink-0 w-9 h-5 rounded-full relative transition-colors ${
                roaming ? 'bg-amber-500' : 'bg-gray-300'
              }`}
            >
              <span
                className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${
                  roaming ? 'left-[18px]' : 'left-0.5'
                }`}
              />
            </span>
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              openActivity();
            }}
            className="w-full text-left px-4 py-2.5 hover:bg-gray-50"
          >
            <span className="block text-sm font-medium text-gray-900">Activity & team rules</span>
            <span className="block text-xs text-gray-500">
              {busy > 0 ? `${busy} saving / working…` : activity.failed ? `${activity.failed} need attention` : 'AI edits, saves, style guide'}
            </span>
          </button>
          <div className="border-t border-gray-100 my-1" />
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onSignOut();
            }}
            className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

export function Nav() {
  const { pathname } = useLocation();
  const { user, signOut } = useAuth();
  const { favorites } = useGrammarFavorites();
  const { profile } = useProfile();
  const flag = getCountry(profile?.nationality)?.flag;
  const { isAdmin } = useAdmin();

  const linkClass = (path: string) =>
    `px-3 py-1 rounded text-sm font-medium transition-colors ${
      pathname === path || (path !== '/' && pathname.startsWith(path))
        ? 'bg-green-700 text-white'
        : 'text-gray-600 hover:text-green-700'
    }`;

  const displayName =
    profile?.displayName ??
    (user?.user_metadata?.given_name as string | undefined) ??
    user?.email ??
    null;

  return (
    <nav className="border-b border-gray-200 bg-white sticky top-0 z-10">
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-bold text-green-800 tracking-tight">
          Kabisa
          <BetaSticker />
        </Link>
        <div className="flex gap-2 items-center">
          <Link to="/" className={linkClass('/')}>
            Lessons
          </Link>
          <Link to="/grammar" className={linkClass('/grammar')}>
            Grammar
            {favorites.length > 0 && (
              <span className="ml-1 text-amber-500" aria-label={`${favorites.length} favourites`}>
                ★{favorites.length}
              </span>
            )}
          </Link>
          {displayName && (
            <div className="flex items-center gap-2 pl-2 ml-1 border-l border-gray-200">
              <Link
                to="/profile"
                title="Edit your name and country"
                className="text-sm text-gray-600 hover:text-green-700 hidden sm:inline"
              >
                {flag ? `${flag} ` : ''}
                {displayName}
              </Link>
              {isAdmin ? (
                <AdminMenu onSignOut={() => void signOut()} />
              ) : (
                <button
                  type="button"
                  onClick={() => void signOut()}
                  className="text-sm text-gray-500 hover:text-green-700 transition-colors"
                >
                  Sign out
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      <LevelBar />
    </nav>
  );
}
