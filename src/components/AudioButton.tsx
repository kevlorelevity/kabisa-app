import { useEffect, useRef, useState } from 'react';
import { speak, stopSpeaking } from '../lib/audio';

interface AudioButtonProps {
  /** The Swahili phrase to pronounce. */
  text: string;
  /** 'dark' for use on a dark background (e.g. the learner's own chat bubble). */
  variant?: 'light' | 'dark';
  size?: 'sm' | 'md';
  className?: string;
}

type State = 'idle' | 'loading' | 'playing' | 'unavailable';

/** Speaker icon that plays the phrase in a Kenyan Swahili voice. */
export function AudioButton({ text, variant = 'light', size = 'sm', className = '' }: AudioButtonProps) {
  const [state, setState] = useState<State>('idle');
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  async function play(e: React.MouseEvent) {
    e.stopPropagation();
    if (state === 'playing' || state === 'loading') {
      stopSpeaking();
      setState('idle');
      return;
    }
    setState('loading');
    const ok = await speak(text, () => {
      if (mounted.current) setState('idle');
    });
    if (!mounted.current) return;
    setState(ok ? 'playing' : 'unavailable');
    if (!ok) setTimeout(() => mounted.current && setState('idle'), 2500);
  }

  const dim = size === 'md' ? 'w-9 h-9' : 'w-7 h-7';
  const icon = size === 'md' ? 'w-5 h-5' : 'w-4 h-4';
  const tone =
    variant === 'dark'
      ? 'text-white/80 hover:text-white hover:bg-white/15'
      : 'text-green-700 hover:text-green-900 hover:bg-green-50';

  const label =
    state === 'unavailable'
      ? 'Audio isn’t available right now'
      : state === 'playing'
      ? 'Stop'
      : `Listen: ${text}`;

  return (
    <button
      type="button"
      onClick={play}
      aria-label={label}
      title={label}
      className={`inline-flex items-center justify-center shrink-0 rounded-full transition-colors ${dim} ${tone} ${
        state === 'unavailable' ? 'opacity-40' : ''
      } ${className}`}
    >
      {state === 'loading' ? (
        <span className={`${icon} rounded-full border-2 border-current border-t-transparent animate-spin`} />
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={icon} aria-hidden="true">
          <path d="M11 5 6 9H3v6h3l5 4V5z" fill="currentColor" stroke="none" />
          {state === 'playing' ? (
            <>
              <path d="M15.5 8.5a5 5 0 0 1 0 7" />
              <path d="M18.5 5.5a9 9 0 0 1 0 13" />
            </>
          ) : state === 'unavailable' ? (
            <path d="m16 9 5 6m0-6-5 6" />
          ) : (
            <path d="M15.5 8.5a5 5 0 0 1 0 7" />
          )}
        </svg>
      )}
    </button>
  );
}
