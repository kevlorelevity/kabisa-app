import { useState, type FormEvent } from 'react';
import { getCountry, sortedCountries } from '../lib/countries';
import { cleanName, type LearnerProfile } from '../lib/profile';

interface WelcomeFormProps {
  initialName?: string;
  initialNationality?: string;
  submitLabel?: string;
  onSave: (p: LearnerProfile) => Promise<void>;
}

/** First name + nationality — the learner becomes the "I" in every conversation. */
export function WelcomeForm({ initialName = '', initialNationality = '', submitLabel = 'Twende! Let’s go →', onSave }: WelcomeFormProps) {
  const [name, setName] = useState(initialName);
  const [nationality, setNationality] = useState(initialNationality);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const country = getCountry(nationality);
  const shownName = cleanName(name) || '…';
  const valid = cleanName(name).length > 0 && Boolean(country);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setSaving(true);
    setError(null);
    try {
      await onSave({ displayName: name, nationality });
    } catch (err) {
      console.error('[profile] save failed:', err);
      setError('Couldn’t save that — please try again.');
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div>
        <label htmlFor="welcome-name" className="block text-sm font-semibold text-gray-800">
          Your first name
        </label>
        <input
          id="welcome-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={30}
          autoComplete="given-name"
          placeholder="e.g. Amani"
          className="mt-1.5 w-full rounded-xl border border-gray-300 px-4 py-2.5 text-base focus:outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
        />
      </div>
      <div>
        <label htmlFor="welcome-nationality" className="block text-sm font-semibold text-gray-800">
          Where are you from?
        </label>
        <select
          id="welcome-nationality"
          value={nationality}
          onChange={(e) => setNationality(e.target.value)}
          className="mt-1.5 w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-base focus:outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
        >
          <option value="">Choose your country…</option>
          {sortedCountries().map((c) => (
            <option key={c.code} value={c.code}>
              {c.flag} {c.en}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-xl bg-green-50 border border-green-100 px-4 py-3" aria-live="polite">
        <p className="text-xs uppercase tracking-wide text-green-700 font-semibold">In your lessons you’ll say</p>
        <p className="mt-1 font-semibold text-gray-900">
          Jina yangu ni {shownName}. Ninatoka {country?.sw ?? '…'}.
        </p>
        <p className="text-sm text-gray-500">
          My name is {shownName}. I’m from {country?.en ?? '…'}.
        </p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={!valid || saving}
        className="w-full rounded-full bg-green-700 px-5 py-3 text-white font-semibold hover:bg-green-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {saving ? 'Saving…' : submitLabel}
      </button>
    </form>
  );
}
