import { useEffect, useRef, useState, type ReactNode } from 'react';

// Gonga points: Kabisa's points (internally still "xp"). A riff on a somewhat known
// Kenyan telco's loyalty points — including the bit where redeeming never works.

/** Skin-tone-neutral face palm (no Fitzpatrick modifier). */
export const GONGA_ICON = '🤦';
export const GONGA_LABEL = 'gonga points';

interface Prize {
  rank: string;
  points: number;
  title: string;
  body: ReactNode;
  image: string;
  fallback: string;
}

const BLEND_AND_BITE = 'https://maps.app.goo.gl/PSEbtp1bWvgdWKZq8';

// eslint-disable-next-line react-refresh/only-export-components
export const PRIZES: Prize[] = [
  {
    rank: '🥇 Top prize',
    points: 100_000,
    title: 'A bling bling villa in Kiambu',
    body: 'Gold columns, marble lions at the gate, a chandelier you can see from Thika Road. Tea farms included as a view only.',
    image: '/gonga/villa.jpg',
    fallback: '🏰',
  },
  {
    rank: '🥈 2nd prize',
    points: 50_000,
    title: 'A night out on the house',
    body: (
      <>
        At our partner bar and restaurant{' '}
        <a href={BLEND_AND_BITE} target="_blank" rel="noreferrer" className="text-green-700 underline">
          Blend &amp; Bite Bistro
        </a>
        .
      </>
    ),
    image: '/gonga/night-out.jpg',
    fallback: '🍻',
  },
  {
    rank: '🥉 3rd prize',
    points: 10_000,
    title: 'Send collect: up to 10 calls',
    body: 'Pick up to 10 people you don’t like. They will be called at all hours of the day by shady people speaking super fast in Swahili and wanting something — with farm animals in the background.',
    image: '/gonga/unknown-caller.jpg',
    fallback: '📞❓',
  },
];

export function PrizeImage({ src, fallback }: { src: string; fallback: string }) {
  const [broken, setBroken] = useState(false);
  if (broken)
    return (
      <div className="w-full aspect-[4/3] rounded-xl bg-amber-50 flex items-center justify-center text-4xl" aria-hidden="true">
        {fallback}
      </div>
    );
  return (
    <img src={src} alt="" loading="lazy" onError={() => setBroken(true)} className="w-full aspect-[4/3] object-cover rounded-xl" />
  );
}

export function GongaModal({ points, onClose }: { points?: number; onClose: () => void }) {
  const [checkout, setCheckout] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-gray-900/40" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="gonga-title"
        className="relative bg-white w-full sm:max-w-lg max-h-[88vh] sm:max-h-[85vh] rounded-t-2xl sm:rounded-2xl shadow-xl flex flex-col"
      >
        <div className="flex items-start gap-2 px-5 pt-4 pb-3 border-b border-gray-100">
          <div className="flex-1 min-w-0">
            <h2 id="gonga-title" className="text-lg font-bold text-gray-900">
              {GONGA_ICON} gonga points
            </h2>
            {points !== undefined && <p className="text-sm font-semibold text-amber-700 tabular-nums">You have {points.toLocaleString()}</p>}
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close gonga points"
            className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100"
          >
            ✕
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4 space-y-5">
          <p className="text-gray-800">
            With every lesson you complete you accrue valuable gonga points. They work the same way as the point system of a
            somewhat known Kenyan telco in the sense that if you want to redeem them, the check out{' '}
            <strong>SIMPLY WILL NOT WORK.</strong>
          </p>
          {PRIZES.map((p) => (
            <div key={p.title} className="flex gap-3 sm:gap-4">
              <div className="w-28 sm:w-40 shrink-0">
                <PrizeImage src={p.image} fallback={p.fallback} />
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <p className="text-xs uppercase tracking-widest text-green-700 font-bold">{p.rank}</p>
                <p className="text-sm font-semibold text-amber-700 tabular-nums">
                  {GONGA_ICON} {p.points.toLocaleString()}
                </p>
                <h3 className="font-bold text-gray-900 leading-snug">{p.title}</h3>
                <p className="text-sm text-gray-600">{p.body}</p>
                <button
                  type="button"
                  onClick={() => setCheckout(p.title)}
                  className="mt-1 px-4 py-1.5 rounded-full bg-green-700 text-white text-sm font-medium hover:bg-green-800"
                >
                  Redeem
                </button>
                {checkout === p.title && (
                  <p role="status" className="text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2">
                    ⏳ Processing… Samahani, the service is temporarily unavailable. Please try again later. (It will not work later either.)
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** A button that shows its children and opens the Gonga points details. */
export function GongaButton({ points, className, children }: { points: number; className?: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        aria-label={`${points.toLocaleString()} gonga points — what are these?`}
        className={className}
      >
        {children}
      </button>
      {open && <GongaModal points={points} onClose={() => setOpen(false)} />}
    </>
  );
}
