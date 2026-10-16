import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useProfile } from '../hooks/profileContext';
import { WelcomeForm } from '../components/WelcomeForm';
import { useAuth } from '../hooks/useAuth';
import { deleteMyAccount, loadConsent, setEmailUpdates } from '../lib/consent';

/** Edit the name / nationality / form of address chosen at sign-up. */
export function ProfileView() {
  const { profile, save } = useProfile();
  const [saved, setSaved] = useState(false);
  return (
    <div className="max-w-md mx-auto px-4 py-8 space-y-4">
      <Link to="/" className="text-sm text-gray-400 hover:text-gray-600">
        ← Lessons
      </Link>
      <h1 className="text-2xl font-bold text-gray-900">Your profile</h1>
      <p className="text-sm text-gray-500">This is who you are in every conversation.</p>
      <WelcomeForm
        key={`${profile?.displayName}-${profile?.nationality}-${profile?.gender}`}
        initialName={profile?.displayName ?? ''}
        initialNationality={profile?.nationality ?? ''}
        initialGender={profile?.gender}
        submitLabel="Save"
        onSave={async (p) => {
          await save(p);
          setSaved(true);
        }}
      />
      {saved && <p className="text-sm text-green-700">Saved — your lessons now use your name.</p>}
      <AccountSettings />
    </div>
  );
}

/** Email opt-in, the Terms, and deleting the account. */
function AccountSettings() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [emails, setEmails] = useState<boolean | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadConsent(userId)
      .then((c) => setEmails(c.emailUpdates ?? false))
      .catch(() => setEmails(false));
  }, [userId]);

  async function toggle(v: boolean) {
    setEmails(v);
    setNote(null);
    try {
      await setEmailUpdates(userId, v);
      setNote(v ? 'You’ll get the occasional email from us.' : 'No more emails from us.');
    } catch {
      setEmails(!v);
      setNote('Couldn’t save that — please try again.');
    }
  }

  async function remove() {
    setDeleting(true);
    try {
      await deleteMyAccount();
      window.location.assign('/');
    } catch {
      setDeleting(false);
      setNote('Couldn’t delete your account — please try again, or write to feedback@kabisa.app.');
    }
  }

  return (
    <section className="mt-8 border-t border-gray-200 pt-6 space-y-4" data-testid="account-settings">
      <h2 className="text-lg font-bold text-gray-900">Account</h2>
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={Boolean(emails)}
          disabled={emails === null}
          onChange={(e) => void toggle(e.target.checked)}
          className="mt-1 h-5 w-5 accent-green-700"
          data-testid="profile-email-updates"
        />
        <span className="text-sm text-gray-800">Email me a summary of my learning, the odd nudge to keep going, and key updates to the app.</span>
      </label>
      {note && <p className="text-sm text-gray-500">{note}</p>}
      <p className="text-sm text-gray-500">
        <a href="/terms" target="_blank" rel="noreferrer" className="underline">
          Terms of Use &amp; Privacy Notice
        </a>{' '}
        · Ol Doinyo Technologies Ltd
      </p>
      {confirm ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-3">
          <p className="text-sm text-red-800 font-medium">Delete your Kabisa account and all your progress? This can’t be undone.</p>
          <div className="flex gap-2">
            <button type="button" onClick={remove} disabled={deleting} className="flex-1 rounded-full bg-red-600 px-4 py-2 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50">
              {deleting ? 'Deleting…' : 'Yes, delete it'}
            </button>
            <button type="button" onClick={() => setConfirm(false)} className="flex-1 rounded-full border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-white">
              Keep it
            </button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setConfirm(true)} className="text-sm font-semibold text-red-600 hover:text-red-700">
          Delete my account
        </button>
      )}
    </section>
  );
}
