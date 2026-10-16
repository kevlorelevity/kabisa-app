import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useProfile } from '../hooks/profileContext';
import { GONGA_ICON } from '../components/GongaPoints';
import { REFERRAL_POINTS, inviteLink, inviteMailto, useReferralStats, validEmails } from '../lib/referrals';

/** Invite a friend by email: opens the learner's own email app with their personal link. */
export function InviteView() {
  const { profile } = useProfile();
  const stats = useReferralStats();
  const [to, setTo] = useState('');
  const [note, setNote] = useState('Habari! I’m learning Kenyan Swahili with Kabisa and thought you’d enjoy it too.');
  const [copied, setCopied] = useState(false);
  const [opened, setOpened] = useState(false);
  const link = stats.code ? inviteLink(stats.code) : null;
  const ok = Boolean(link) && validEmails(to);

  async function copy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  async function share() {
    if (!link || !navigator.share) return;
    try {
      await navigator.share({ title: 'Kabisa', text: 'Learn Kenyan Swahili with me on Kabisa', url: link });
    } catch {
      // Cancelled.
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-8 space-y-5">
      <Link to="/" className="text-sm text-gray-400 hover:text-gray-600">
        ← Lessons
      </Link>
      <div>
        <h1 className="text-2xl font-bold text-gray-900">💌 Invite a friend</h1>
        <p className="mt-1 text-gray-600">
          For every friend who signs up through your invite you get{' '}
          <strong className="text-amber-700">
            {GONGA_ICON} {REFERRAL_POINTS} gonga pts
          </strong>
          . Learning is more fun with someone to practise on.
        </p>
      </div>

      {stats.friends > 0 && (
        <p className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-900" data-testid="invite-stats">
          {stats.friends} friend{stats.friends === 1 ? '' : 's'} joined so far · +{stats.points.toLocaleString()} gonga pts
        </p>
      )}

      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!ok || !link) return;
          window.location.href = inviteMailto(to, profile?.displayName, link, note);
          setOpened(true);
        }}
      >
        <div>
          <label htmlFor="invite-to" className="block text-sm font-semibold text-gray-800">
            Your friend’s email
          </label>
          <input
            id="invite-to"
            type="text"
            inputMode="email"
            autoComplete="email"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="rafiki@example.com (separate several with commas)"
            className="mt-1.5 w-full rounded-xl border border-gray-300 px-4 py-2.5 text-base focus:outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
          />
        </div>
        <div>
          <label htmlFor="invite-note" className="block text-sm font-semibold text-gray-800">
            A note from you
          </label>
          <textarea
            id="invite-note"
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-gray-300 px-4 py-2.5 text-base focus:outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
          />
        </div>
        <button
          type="submit"
          disabled={!ok}
          className="w-full rounded-full bg-green-700 px-5 py-3 text-white font-semibold hover:bg-green-800 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Write the email →
        </button>
        {opened && <p className="text-sm text-green-700">Your email app should open with the invite ready — just press send.</p>}
        <p className="text-xs text-gray-400">The email goes from your own email app. We never see or store your friend’s address.</p>
      </form>

      <div className="border-t border-gray-200 pt-5 space-y-2">
        <p className="text-sm font-semibold text-gray-800">Or share your link</p>
        <div className="flex gap-2">
          <input
            readOnly
            value={link ?? 'Loading…'}
            onFocus={(e) => e.target.select()}
            className="flex-1 min-w-0 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700"
            aria-label="Your invite link"
            data-testid="invite-link"
          />
          <button type="button" onClick={copy} disabled={!link} className="shrink-0 rounded-full border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40">
            {copied ? 'Copied ✓' : 'Copy'}
          </button>
        </div>
        {typeof navigator !== 'undefined' && 'share' in navigator && (
          <button type="button" onClick={share} disabled={!link} className="text-sm font-semibold text-green-700 hover:underline disabled:opacity-40">
            Share via WhatsApp, SMS… →
          </button>
        )}
      </div>
    </div>
  );
}
