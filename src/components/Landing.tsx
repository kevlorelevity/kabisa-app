import { SignInButton } from './SignInButton';
import { BetaSticker } from './BetaSticker';
import { LEVELS } from '../lib/levels';
import { useEffect, useState } from 'react';
import { takeDeletedFlag } from '../lib/consent';
import { REFERRAL_POINTS, pendingReferral, referrerName } from '../lib/referrals';
import { GONGA_ICON, GongaModal, PRIZES, PrizeImage } from './GongaPoints';

function FlagStripe() {
  return (
    <div className="flex h-1.5 w-full" aria-hidden="true">
      <div className="flex-1 bg-gray-900" />
      <div className="w-1 bg-white" />
      <div className="flex-1 bg-red-700" />
      <div className="w-1 bg-white" />
      <div className="flex-1 bg-green-700" />
    </div>
  );
}

function ChatPreview() {
  return (
    <div className="relative mx-auto w-full max-w-sm rounded-[2rem] border border-gray-200 bg-white p-5 shadow-xl shadow-green-900/10">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Taking an Uber in Nairobi</p>
      <div className="mt-4 space-y-3">
        <div className="flex justify-end">
          <div className="rounded-2xl rounded-br-sm bg-green-700 px-4 py-2.5 text-white font-medium">Niaje boss?</div>
        </div>
        <div className="flex justify-start">
          <div className="relative rounded-2xl rounded-bl-sm bg-gray-100 px-4 py-2.5 text-gray-900 font-medium">
            <span className="rounded bg-green-100 px-0.5 underline decoration-green-400 underline-offset-2">Poa</span> sana. Uko aje?
            <span className="absolute left-0 top-full z-10 mt-1.5 w-56 rounded-md bg-gray-900 px-2.5 py-1.5 text-xs font-normal leading-snug text-white shadow-lg">
              “Cool” — from kupoa, “to cool down”. The standard reply to niaje.
              <span className="mt-1.5 block border-t border-white/20 pt-1.5 text-green-200">📘 Greetings: Mambo, Habari…</span>
            </span>
          </div>
        </div>
      </div>
      <div className="mt-24 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Your turn — what do you say?</p>
        {['Niko poa, asante.', 'Unaenda wapi?', 'Sawa.'].map((o, i) => (
          <div
            key={o}
            className={`rounded-full border px-4 py-2 text-sm font-medium ${
              i === 0 ? 'border-green-500 bg-green-50 text-green-800' : 'border-gray-200 text-gray-700'
            }`}
          >
            {o}
          </div>
        ))}
      </div>
    </div>
  );
}

const FEATURES = [
  {
    icon: '🗣️',
    title: 'Real Kenyan conversations',
    body: 'Matatus, mama mboga, Uber small talk, the fundi, the kinyozi. You play your part one line at a time.',
  },
  {
    icon: '👆',
    title: 'Tap any word',
    body: 'See what it means, how it’s built, the Sanifu form — and open a short grammar explainer when you need one.',
  },
  {
    icon: '🦁',
    title: 'From Jambo Tourist to Simba',
    body: 'Ten levels, thirty lessons. Practice sessions, flashcards and drills unlock each next step.',
  },
];

/** Signed-out landing page. */
export function Landing() {
  const [deleted] = useState(takeDeletedFlag);
  const [prizes, setPrizes] = useState(false);
  const [inviter, setInviter] = useState<string | null>(null);
  useEffect(() => {
    const code = pendingReferral();
    if (code) void referrerName(code).then(setInviter);
  }, []);
  return (
    <div className="min-h-screen bg-[#f6f4ee] text-gray-900">
      <FlagStripe />
      {deleted && (
        <p className="bg-gray-900 px-4 py-2 text-center text-sm text-white" role="status">
          Your Kabisa account has been deleted. Kwaheri — you’re welcome back any time.
        </p>
      )}
      {inviter && (
        <p className="bg-amber-100 px-4 py-2 text-center text-sm text-amber-900" role="status" data-testid="invited-by">
          💌 <strong>{inviter}</strong> invited you to Kabisa — sign up below and start learning together.
        </p>
      )}
      <header className="mx-auto flex max-w-5xl items-center px-5 py-5">
        <span className="text-xl font-extrabold tracking-tight text-green-800">Kabisa</span>
      </header>

      <main className="mx-auto max-w-5xl px-5 pb-16">
        <section className="grid items-center gap-12 pt-6 pb-16 md:grid-cols-2 md:pt-12">
          <div>
            <div className="relative inline-block">
              <h1 className="text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl">
                Learn everyday <span className="text-green-700">Kenyan Swahili</span>
              </h1>
              <BetaSticker size="lg" className="absolute -right-4 -top-7 sm:-right-10" />
            </div>
            <p className="mt-5 text-lg leading-relaxed text-gray-600">
              Not textbook Sanifu — the Swahili you’ll actually hear in a matatu, at the market and in the office.
              Learn it by playing real conversations, with the standard form always one tap away.
            </p>
            <div className="mt-8 flex flex-col items-start gap-3">
              <SignInButton size="lg" />
              <p className="text-sm text-gray-500">Free while we’re in beta. Takes ten seconds.</p>
            </div>
          </div>
          <ChatPreview />
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-2xl border border-gray-200 bg-white p-5">
              <p className="text-2xl" aria-hidden="true">
                {f.icon}
              </p>
              <h2 className="mt-2 font-bold text-gray-900">{f.title}</h2>
              <p className="mt-1 text-sm leading-relaxed text-gray-600">{f.body}</p>
            </div>
          ))}
        </section>

        <section className="mt-12 rounded-2xl border border-amber-200 bg-amber-50/60 p-6" data-testid="landing-gonga">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-amber-700">{GONGA_ICON} gonga points</h2>
              <p className="mt-2 max-w-xl text-gray-700">
                Every lesson you finish earns you valuable gonga points. Climb the leaderboard, level up — and dream about the prizes.
                Redeeming works exactly like that other points scheme you know: the checkout <strong>simply will not work</strong>.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setPrizes(true)}
              className="shrink-0 self-start rounded-full border border-amber-300 bg-white px-4 py-1.5 text-sm font-semibold text-amber-800 hover:bg-amber-100 sm:self-auto"
            >
              Try to redeem →
            </button>
          </div>
          <ul className="mt-5 grid gap-4 sm:grid-cols-3">
            {PRIZES.map((p) => (
              <li key={p.title} className="rounded-xl border border-amber-100 bg-white p-3">
                <PrizeImage src={p.image} fallback={p.fallback} />
                <p className="mt-2 text-xs font-bold uppercase tracking-widest text-green-700">{p.rank}</p>
                <p className="text-sm font-semibold tabular-nums text-amber-700">
                  {GONGA_ICON} {p.points.toLocaleString()} gonga pts
                </p>
                <p className="font-semibold leading-snug text-gray-900">{p.title}</p>
              </li>
            ))}
          </ul>
        </section>
        {prizes && <GongaModal onClose={() => setPrizes(false)} />}

        <section className="mt-6 flex flex-col gap-3 rounded-2xl border border-green-200 bg-white p-6 sm:flex-row sm:items-center" data-testid="landing-invite">
          <p className="text-4xl" aria-hidden="true">
            💌
          </p>
          <div className="flex-1">
            <h2 className="font-bold text-gray-900">Bring a friend: +{REFERRAL_POINTS} gonga pts each</h2>
            <p className="mt-1 text-sm leading-relaxed text-gray-600">
              Once you’re in, invite friends by email from the Menu. Every friend who signs up earns you {REFERRAL_POINTS} gonga pts —
              and someone to practise your Swahili on.
            </p>
          </div>
        </section>

        <section className="mt-12 rounded-2xl border border-green-200 bg-white p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-green-700">Your path</h2>
          <ol className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-5">
            {LEVELS.map((l) => (
              <li key={l.level} className="flex items-center gap-2">
                <span className="text-2xl" aria-hidden="true">
                  {l.emoji}
                </span>
                <span className="text-sm leading-tight">
                  <span className="block text-xs text-gray-400">Level {l.level}</span>
                  <span className="font-semibold text-gray-800">{l.name}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>

        <footer className="mt-12 text-center text-xs text-gray-400 space-y-1">
          <p>
            Beta — lessons are still being reviewed and improved. Spot something off?{' '}
            <a href="mailto:feedback@kabisa.app" className="underline hover:text-gray-600">
              feedback@kabisa.app
            </a>
          </p>
          <p>
            © Ol Doinyo Technologies Ltd, Kenya ·{' '}
            <a href="/terms" className="underline hover:text-gray-600">
              Terms &amp; Privacy
            </a>
          </p>
        </footer>
      </main>
    </div>
  );
}
