import { Link, useLocation } from 'react-router-dom';

interface NavProps {
  dueCount: number;
}

export function Nav({ dueCount }: NavProps) {
  const { pathname } = useLocation();

  const linkClass = (path: string) =>
    `px-3 py-1 rounded text-sm font-medium transition-colors ${
      pathname === path
        ? 'bg-green-700 text-white'
        : 'text-gray-600 hover:text-green-700'
    }`;

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
        </div>
      </div>
    </nav>
  );
}
