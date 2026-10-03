import { useEffect, useState } from 'react';

/** The hashed entry script this tab is running, e.g. /assets/index-AbC123.js. */
function currentBuild(): string | null {
  const s = document.querySelector<HTMLScriptElement>('script[type="module"][src*="/assets/"]');
  return s ? new URL(s.src, location.href).pathname : null;
}

async function latestBuild(): Promise<string | null> {
  try {
    const html = await fetch('/', { cache: 'no-store' }).then((r) => r.text());
    return html.match(/\/assets\/index-[\w-]+\.js/)?.[0] ?? null;
  } catch {
    return null;
  }
}

const CHECK_EVERY_MS = 5 * 60 * 1000;

/**
 * The app is a single page, so a tab left open keeps running the old code after
 * a deploy. Check when the tab comes back into focus (and every few minutes)
 * and offer a one-tap reload.
 */
export function UpdateBanner() {
  const [stale, setStale] = useState(false);

  useEffect(() => {
    const mine = currentBuild();
    if (!mine) return; // dev server
    let alive = true;
    const check = async () => {
      const latest = await latestBuild();
      if (alive && latest && latest !== mine) setStale(true);
    };
    const onVisible = () => document.visibilityState === 'visible' && void check();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    const t = setInterval(check, CHECK_EVERY_MS);
    return () => {
      alive = false;
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
      clearInterval(t);
    };
  }, []);

  if (!stale) return null;
  return (
    <div role="status" className="bg-amber-100 border-b border-amber-300 text-amber-900 text-sm">
      <div className="max-w-4xl mx-auto px-4 py-2 flex items-center justify-between gap-3">
        <span>A new version of Kabisa is available.</span>
        <button
          type="button"
          onClick={() => location.reload()}
          className="shrink-0 rounded-full bg-amber-500 px-3 py-1 font-semibold text-white hover:bg-amber-600"
        >
          Reload
        </button>
      </div>
    </div>
  );
}
