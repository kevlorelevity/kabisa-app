import { useState, type FormEvent } from 'react';
import { getCountry, sortedCountries } from '../lib/countries';
import { cleanName, type Gender, type LearnerProfile } from '../lib/profile';

interface WelcomeFormProps {
  initialName?: string;
  initialNationality?: string;
  initialGender?: Gender;
  submitLabel?: string;
  onSave: (p: LearnerProfile) => Promise<void>;
}

/** First name + nationality — the learner becomes the "I" in every conversation. */
export function WelcomeForm({ initialName = '', initialNationality = '', initialGender, submitLabel = 'Twende! Let’s go →', onSave }: WelcomeFormProps) {
  const [name, setName] = useState(initialName);
  const [nationality, setNationality] = useState(initialNationality);
  const [gender, setGender] = useState<Gender | undefined>(initialGender);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const country = getCountry(nationality);
  const shownName = cleanName(name) || '…';
  const valid = cleanName(name).length > 0 && Boolean(country) && Boolean(gender);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setSaving(true);
    setError(null);
    try {
      await onSave({ displayName: name, nationality, gender });
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

      <GenderChoice value={gender} onChange={setGender} />

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

const GENDERS: Array<{ value: Gender; label: string; hint: string }> = [
  { value: 'female', label: 'Woman', hint: 'People will call you mama, dada or sista.' },
  { value: 'male', label: 'Man', hint: 'People will call you boss or bwana.' },
  { value: 'unspecified', label: 'Prefer not to say', hint: 'People will call you boss — Kenyans use it for anyone.' },
];

/** How the other speakers address the learner — asked at sign-up and once from existing learners. */
export function GenderChoice({ value, onChange }: { value: Gender | undefined; onChange: (g: Gender) => void }) {
  const hint = GENDERS.find((g) => g.value === value)?.hint;
  return (
    <fieldset>
      <legend className="block text-sm font-semibold text-gray-800">How should people in the conversations address you?</legend>
      <div className="mt-1.5 flex flex-wrap gap-2" role="radiogroup">
        {GENDERS.map((g) => (
          <button
            key={g.value}
            type="button"
            role="radio"
            aria-checked={value === g.value}
            onClick={() => onChange(g.value)}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
              value === g.value
                ? 'border-green-700 bg-green-700 text-white'
                : 'border-gray-300 bg-white text-gray-700 hover:border-green-500'
            }`}
          >
            {g.label}
          </button>
        ))}
      </div>
      {hint && <p className="mt-1.5 text-sm text-gray-500">{hint}</p>}
    </fieldset>
  );
}
