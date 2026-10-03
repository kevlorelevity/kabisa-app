import type { ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/profileContext';
import { WelcomeForm } from './WelcomeForm';
import { BetaSticker } from './BetaSticker';

/** After sign-up: ask for first name + nationality once, before the lessons. */
export function OnboardingGate({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { profile, loading, save } = useProfile();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading…</div>;
  }
  if (profile) return <>{children}</>;

  const given = (user?.user_metadata?.given_name as string | undefined) ?? '';
  return (
    <div className="min-h-screen bg-[#f6f4ee] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-6 sm:p-8 shadow-xl shadow-green-900/5">
        <div className="flex items-center justify-between">
          <p className="text-4xl" aria-hidden="true">
            👋
          </p>
          <BetaSticker />
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
