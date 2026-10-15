import { useEffect, useRef, useState, type ReactNode } from 'react';
import { SCORES_CHANGED_EVENT, getAllLessonScores } from '../lib/lessonScores';
import {
  OPEN_INSTALL_EVENT,
  dismissInstallCard,
  installCardDismissed,
  promptInstall,
  useInstallState,
  wasInstalled,
  type InstallPlatform,
} from '../lib/install';

/** The iOS share glyph (square with an arrow), so the guide matches what learners see. */
function ShareGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-label="Share" role="img" className="inline-block align-text-bottom text-sky-600">
      <path d="M12 3v12M8 7l4-4 4 4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 10H6a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1h-2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function Steps({ items }: { items: ReactNode[] }) {
  return (
    <ol className="space-y-3">
      {items.map((it, i) => (
        <li key={i} className="flex gap-3">
          <span className="shrink-0 w-6 h-6 rounded-full bg-green-700 text-white text-xs font-bold flex items-center justify-center">{i + 1}</span>
          <span className="text-gray-800 pt-0.5">{it}</span>
        </li>
      ))}
    </ol>
  );
}

function GuideBody({ platform, supported, standalone, onClose }: { platform: InstallPlatform; supported: boolean; standalone: boolean; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  if (standalone) return <p className="text-gray-800">You’re already using Kabisa from your home screen. Kabisa! 🎉</p>;
  if (platform === 'ios-safari')
    return (
      <>
        <Steps
          items={[
            <>Tap <ShareGlyph /> <strong>Share</strong> in Safari’s toolbar (at the bottom of the screen; top right on iPad).</>,
            <>Scroll down and tap <strong>Add to Home Screen</strong>.</>,
            <>Tap <strong>Add</strong>. Kabisa appears on your home screen.</>,
          ]}
        />
        <p className="text-xs text-gray-500">The home-screen Kabisa asks you to sign in with Google once more. Your progress comes along.</p>
      </>
    );
  if (platform === 'ios-chrome')
    return (
      <>
        <Steps
          items={[
            <>Tap <ShareGlyph /> <strong>Share</strong> in Chrome’s address bar (top right).</>,
            <>Tap <strong>Add to Home Screen</strong>. (Don’t see it? Open kabisa.app in Safari instead.)</>,
            <>Tap <strong>Add</strong>.</>,
          ]}
        />
        <p className="text-xs text-gray-500">The home-screen Kabisa asks you to sign in with Google once more. Your progress comes along.</p>
      </>
    );
  if (platform === 'ios-other')
    return (
      <>
        <p className="text-gray-800">
          This browser can’t add apps to your home screen. Open <strong>kabisa.app</strong> in <strong>Safari</strong>, then tap{' '}
          <ShareGlyph /> Share → <strong>Add to Home Screen</strong>.
        </p>
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard?.writeText('https://kabisa.app').then(() => setCopied(true));
          }}
          className="px-4 py-2 rounded-full border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          {copied ? '✓ Link copied' : 'Copy the link'}
        </button>
      </>
    );
  if (supported)
    return (
      <>
        <p className="text-gray-800">Kabisa opens full-screen, straight from your home screen, like any other app. No app store needed.</p>
        <button
          type="button"
          onClick={() => {
            void promptInstall().then(() => onClose());
          }}
          className="px-5 py-2 rounded-full bg-green-700 text-white text-sm font-medium hover:bg-green-800"
        >
          Install Kabisa
        </button>
      </>
    );
  if (platform === 'android')
    return (
      <Steps
        items={[
          <>In Chrome, tap the <strong>⋮</strong> menu (top right).</>,
          <>Tap <strong>Add to Home screen</strong> or <strong>Install app</strong>.</>,
          <>Tap <strong>Install</strong> / <strong>Add</strong>.</>,
        ]}
      />
    );
  return (
    <p className="text-gray-800">
      Kabisa is made for your phone: open <strong>kabisa.app</strong> there and choose <strong>Add to Home Screen</strong>. On a computer, Chrome and Edge
      show an install icon at the right end of the address bar.
    </p>
  );
}

function InstallModal({ onClose }: { onClose: () => void }) {
  const { platform, supported, standalone } = useInstallState();
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-gray-900/40" onClick={onClose} aria-hidden="true" />
      <div role="dialog" aria-modal="true" aria-labelledby="install-title" className="relative bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-xl">
        <div className="flex items-center gap-3 px-5 pt-4 pb-3 border-b border-gray-100">
          <img src="/icon-192.png" alt="" className="w-10 h-10 rounded-xl" />
          <h2 id="install-title" className="flex-1 text-lg font-bold text-gray-900">
            Add Kabisa to your home screen
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100"
          >
            ✕
          </button>
        </div>
        <div className="px-5 py-4 space-y-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <GuideBody platform={platform} supported={supported} standalone={standalone} onClose={onClose} />
        </div>
      </div>
    </div>
  );
}

/** Mount once: opens the guide whenever something calls openInstallGuide(). */
export function InstallHost() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener(OPEN_INSTALL_EVENT, show);
    return () => window.removeEventListener(OPEN_INSTALL_EVENT, show);
  }, []);
  return open ? <InstallModal onClose={() => setOpen(false)} /> : null;
}

function useHasPlayedALesson(): boolean {
  const [played, setPlayed] = useState(() => Object.keys(getAllLessonScores()).length > 0);
  useEffect(() => {
    const check = () => setPlayed(Object.keys(getAllLessonScores()).length > 0);
    window.addEventListener(SCORES_CHANGED_EVENT, check);
    return () => window.removeEventListener(SCORES_CHANGED_EVENT, check);
  }, []);
  return played;
}

/** Home-page nudge, shown once a learner has played a lesson (not on their very first visit). */
export function InstallCard() {
  const { platform, supported } = useInstallState();
  const played = useHasPlayedALesson();
  const [, setV] = useState(0);
  if (!supported || !played || wasInstalled() || installCardDismissed()) return null;
  const ios = platform === 'ios-safari' || platform === 'ios-chrome';

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 flex items-start gap-3">
      <img src="/icon-192.png" alt="" className="w-12 h-12 rounded-xl shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900">Put Kabisa on your home screen</p>
        <p className="text-sm text-gray-600">One tap to your next lesson. It opens full-screen, like an app.</p>
        <div className="mt-2.5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              if (ios) window.dispatchEvent(new Event(OPEN_INSTALL_EVENT));
              else void promptInstall().then(() => setV((n) => n + 1));
            }}
            className="px-4 py-1.5 rounded-full bg-green-700 text-white text-sm font-medium hover:bg-green-800"
          >
            {ios ? 'Show me how' : 'Install'}
          </button>
          <button
            type="button"
            onClick={() => dismissInstallCard()}
            className="px-4 py-1.5 rounded-full text-sm text-gray-600 hover:bg-gray-100"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
