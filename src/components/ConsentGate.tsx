import { useEffect, useState, type ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/profileContext';
import { acceptTerms, deleteMyAccount, loadConsent } from '../lib/consent';
import { signOut } from '../lib/auth';
import { TermsContent } from './TermsContent';

/**
 * Nobody uses Kabisa without accepting the Terms. New learners see this right after signing in
 * with Google (before the welcome form); existing learners see it once on their next visit.
 * Not agreeing blocks the app — the learner can change their mind, or delete their account.
 */
export function ConsentGate({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const userId = user?.id ?? null;
  const [loaded, setLoaded] = useState<{ for: string | null; state: 'ask' | 'ok' | 'error' } | null>(null);
  const state = loaded && loaded.for === userId ? loaded.state : 'loading';
  const setState = (st: 'ask' | 'ok' | 'error') => setLoaded({ for: userId, state: st });

  useEffect(() => {
    let alive = true;
    loadConsent(userId)
      .then((c) => alive && setLoaded({ for: userId, state: c.accepted ? 'ok' : 'ask' }))
      .catch((err) => {
        console.error('[consent] load failed:', err);
        if (alive) setLoaded({ for: userId, state: 'error' });
      });
    return () => {
      alive = false;
    };
  }, [userId]);

  if (state === 'ok') return <>{children}</>;
  if (state === 'loading' || profileLoading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading…</div>;
  }
  if (state === 'error') {
    return (
      <Shell>
        <h1 className="text-xl font-bold text-gray-900">Couldn’t load your account</h1>
        <p className="text-gray-600">Check your connection and try again.</p>
        <button type="button" onClick={() => window.location.reload()} className="w-full rounded-full bg-green-700 px-5 py-3 text-white font-semibold hover:bg-green-800">
          Try again
        </button>
      </Shell>
    );
  }
  return <ConsentForm userId={userId} existing={Boolean(profile)} name={profile?.displayName} onAccepted={() => setState('ok')} />;
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f6f4ee] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg rounded-3xl border border-gray-200 bg-white p-6 sm:p-8 shadow-xl shadow-green-900/5 space-y-5">{children}</div>
    </div>
  );
}

function ConsentForm({ userId, existing, name, onAccepted }: { userId: string | null; existing: boolean; name?: string; onAccepted: () => void }) {
  const [agree, setAgree] = useState(false);
  const [emails, setEmails] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [declined, setDeclined] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function submit() {
    if (!agree) {
      setDeclined(true);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await acceptTerms(userId, emails);
      onAccepted();
    } catch (err) {
      console.error('[consent] save failed:', err);
      setError('Couldn’t save that — please try again.');
      setSaving(false);
    }
  }

  async function remove() {
    setDeleting(true);
    setError(null);
    try {
      await deleteMyAccount();
      window.location.assign('/');
    } catch (err) {
      console.error('[consent] delete failed:', err);
      setError('Couldn’t delete your account — please try again, or write to feedback@kabisa.app.');
      setDeleting(false);
    }
  }

  if (declined) {
    return (
      <Shell>
        <p className="text-4xl" aria-hidden="true">
          🚧
        </p>
        <h1 className="text-xl font-bold text-gray-900">You can’t use Kabisa without accepting the Terms</h1>
        <p className="text-gray-600">
          {existing
            ? 'We need your agreement to keep your account and your progress. Changed your mind? Go back and tick the box. Otherwise you can delete your account — this removes your profile, progress and scores for good.'
            : 'We need your agreement before you can start. Changed your mind? Go back and tick the box. Otherwise you can cancel your sign-up and we’ll delete the account Google just created with us.'}
        </p>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="button" onClick={() => setDeclined(false)} className="w-full rounded-full bg-green-700 px-5 py-3 text-white font-semibold hover:bg-green-800">
          ← Back to the Terms
        </button>
        {confirmDelete ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-3">
            <p className="text-sm text-red-800 font-medium">
              {existing ? 'Delete your Kabisa account and all your progress? This can’t be undone.' : 'Cancel your sign-up and delete your account?'}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={remove}
                disabled={deleting}
                className="flex-1 rounded-full bg-red-600 px-4 py-2 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
                data-testid="confirm-delete"
              >
                {deleting ? 'Deleting…' : 'Yes, delete it'}
              </button>
              <button type="button" onClick={() => setConfirmDelete(false)} className="flex-1 rounded-full border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-white">
                Keep it
              </button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirmDelete(true)} className="w-full rounded-full border border-red-300 px-5 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50">
            {existing ? 'Delete my account' : 'Cancel sign-up and delete my account'}
          </button>
        )}
        <button type="button" onClick={() => void signOut()} className="w-full text-sm text-gray-400 hover:text-gray-600">
          Sign out
        </button>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-gray-900">{existing ? `Karibu tena${name ? `, ${name}` : ''}!` : 'Karibu! One thing first.'}</h1>
      </div>
      <p className="text-gray-600">
        {existing
          ? 'We’ve put Kabisa’s Terms in writing. There’s not much to them while the app is free — please read and accept them to keep learning.'
          : 'Kabisa is free while in beta. Please read and accept our short Terms to start learning.'}
      </p>
      <div className="max-h-72 overflow-y-auto rounded-xl border border-gray-200 bg-gray-50 p-4" data-testid="terms-box">
        <TermsContent />
      </div>
      <label className="flex items-start gap-3 cursor-pointer">
        <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-1 h-5 w-5 accent-green-700" data-testid="agree-terms" />
        <span className="text-sm text-gray-800">
          I agree to the{' '}
          <a href="/terms" target="_blank" rel="noreferrer" className="underline">
            Terms of Use &amp; Privacy Notice
          </a>{' '}
          of Ol Doinyo Technologies Ltd. <span className="text-gray-400">(required)</span>
        </span>
      </label>
      <label className="flex items-start gap-3 cursor-pointer">
        <input type="checkbox" checked={emails} onChange={(e) => setEmails(e.target.checked)} className="mt-1 h-5 w-5 accent-green-700" data-testid="email-updates" />
        <span className="text-sm text-gray-800">
          Email me a summary of my learning, the odd nudge to keep going, and key updates to the app — at most once a week, never more. <span className="text-gray-400">(optional — untick if you’d rather not)</span>
        </span>
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="button"
        onClick={submit}
        disabled={saving}
        className="w-full rounded-full bg-green-700 px-5 py-3 text-white font-semibold hover:bg-green-800 disabled:opacity-40 transition-colors"
        data-testid="consent-continue"
      >
        {saving ? 'Saving…' : 'Continue →'}
      </button>
    </Shell>
  );
}
