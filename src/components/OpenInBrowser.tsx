import { useState } from 'react';
import { chromeIntentUrl, type InAppInfo } from '../lib/inAppBrowser';

/** Shown instead of the sign-in button inside apps' built-in browsers, where Google won't sign anyone in. */
export function OpenInBrowser({ info }: { info: InAppInfo }) {
  const [copied, setCopied] = useState(false);
  const href = typeof window !== 'undefined' ? window.location.href : 'https://kabisa.app';
  const where = info.app ? `inside ${info.app}` : 'inside another app';
  const browser = info.ios ? 'Safari' : 'Chrome';

  async function copy() {
    try {
      await navigator.clipboard.writeText(href);
      setCopied(true);
    } catch {
      window.prompt('Copy this link and open it in your browser:', href);
    }
  }

  return (
    <div data-testid="open-in-browser" className="max-w-md rounded-2xl border border-amber-300 bg-amber-50 p-4 space-y-3">
      <p className="font-semibold text-amber-900">Open Kabisa in {browser} to sign in</p>
      <p className="text-sm text-amber-900/80">
        You’ve opened Kabisa {where}. Google doesn’t allow signing in from there, so please open it in your
        phone’s browser.
      </p>
      <div className="flex flex-wrap gap-2">
        {info.android && (
          <a
            href={chromeIntentUrl(href)}
            className="rounded-full bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800"
          >
            Open in Chrome
          </a>
        )}
        <button
          type="button"
          onClick={() => void copy()}
          className="rounded-full border border-amber-400 bg-white px-4 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-100"
        >
          {copied ? 'Link copied ✓' : 'Copy link'}
        </button>
      </div>
      {info.ios && (
        <p className="text-xs text-amber-900/70">
          Or tap the <span className="font-semibold">•••</span> or share button at the top or bottom of the screen and
          choose <span className="font-semibold">Open in Safari</span> (or “Open in browser”).
        </p>
      )}
      {copied && <p className="text-xs text-amber-900/70">Now paste it into {browser}’s address bar.</p>}
    </div>
  );
}
