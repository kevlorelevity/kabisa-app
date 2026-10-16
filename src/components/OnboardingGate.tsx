import { useState, type ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/profileContext';
import { GenderChoice, WelcomeForm } from './WelcomeForm';
import type { Gender, LearnerProfile } from '../lib/profile';

/** After sign-up: ask for first name, nationality and form of address once, before the lessons. */
export function OnboardingGate({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { profile, loading, save } = useProfile();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading…</div>;
  }
  // Learners who signed up before we asked: one quick question on their next visit.
  if (profile && !profile.gender) return <GenderPrompt profile={profile} onSave={save} />;
  if (profile) return <>{children}</>;

  const given = (user?.user_metadata?.given_name as string | undefined) ?? '';
  return (
    <div className="min-h-screen bg-[#f6f4ee] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-6 sm:p-8 shadow-xl shadow-green-900/5">
        <div className="flex items-center justify-between">
          <p className="text-4xl" aria-hidden="true">
            👋
          </p>
        </div>
        <h1 className="mt-3 text-2xl font-extrabold text-gray-900">Karibu! Welcome.</h1>
        <p className="mt-1 text-gray-600">
          You’re the main character in every conversation. Tell us who you are and the lessons will speak about you.
        </p>
        <div className="mt-6">
          <WelcomeForm initialName={given} onSave={save} />
        </div>
      </div>
    </div>
  );
}

function GenderPrompt({ profile, onSave }: { profile: LearnerProfile; onSave: (p: LearnerProfile) => Promise<void> }) {
  const [gender, setGender] = useState<Gender | undefined>();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit() {
    if (!gender) return;
    setSaving(true);
    setError(null);
    try {
      await onSave({ ...profile, gender });
    } catch (err) {
      console.error('[profile] save failed:', err);
      setError('Couldn’t save that — please try again.');
      setSaving(false);
    }
  }
  return (
    <div className="min-h-screen bg-[#f6f4ee] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-6 sm:p-8 shadow-xl shadow-green-900/5 space-y-5">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Karibu tena, {profile.displayName}!</h1>
          <p className="mt-1 text-gray-600">One quick question, so the people in your conversations address you the right way.</p>
        </div>
        <GenderChoice value={gender} onChange={setGender} />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="button"
          onClick={submit}
          disabled={!gender || saving}
          className="w-full rounded-full bg-green-700 px-5 py-3 text-white font-semibold hover:bg-green-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? 'Saving…' : 'Continue →'}
        </button>
        <p className="text-xs text-gray-400">You can change this any time in your profile.</p>
      </div>
    </div>
  );
}
