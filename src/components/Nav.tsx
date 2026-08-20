import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface NavProps {
  dueCount: number;
}

export function Nav({ dueCount }: NavProps) {
  const { pathname } = useLocation();
  const { user, signOut } = useAuth();

  const linkClass = (path: string) =>
    `px-3 py-1 rounded text-sm font-medium transition-colors ${
      pathname === path
        ? 'bg-green-700 text-white'
        : 'text-gray-600 hover:text-green-700'
    }`;

  const displayName =
    (user?.user_metadata?.given_name as string | undefined) ??
    user?.email ??
    null;

  return (
    <nav className="border-b border-gray-200 bg-white sticky top-0 z-10">
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link to="/" className="font-bold text-green-800 tracking-tight">
          Swahili ya Kenya
        </Link>
        <div className="flex gap-2 items-center">
          <Link to="/" className={linkClass('/')}>
            Catalog
          </Link>
          <Link to="/review" className={`${linkClass('/review')} relative`}>
            Review
            {dueCount > 0 && (
              <span className="ml-1 inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white text-xs font-bold">
                {dueCount > 99 ? '99+' : dueCount}
              </span>
            )}
          </Link>
          {displayName && (
            <div className="flex items-center gap-2 pl-2 ml-1 border-l border-gray-200">
              <span className="text-sm text-gray-600 hidden sm:inline">
                {displayName}
              </span>
              <button
                type="button"
                onClick={() => void signOut()}
                className="text-sm text-gray-500 hover:text-green-700 transition-colors"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
