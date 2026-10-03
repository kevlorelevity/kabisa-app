import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useProfile } from '../hooks/profileContext';
import { WelcomeForm } from '../components/WelcomeForm';

/** Edit the name / nationality chosen at sign-up. */
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
        key={`${profile?.displayName}-${profile?.nationality}`}
        initialName={profile?.displayName ?? ''}
        initialNationality={profile?.nationality ?? ''}
        submitLabel="Save"
        onSave={async (p) => {
          await save(p);
          setSaved(true);
        }}
      />
      {saved && <p className="text-sm text-green-700">Saved — your lessons now use your name.</p>}
    </div>
  );
}
