import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useLessons } from '../hooks/useLessons';
import { useProfile } from '../hooks/profileContext';
import { feedbackMailto, sendFeedback, type FeedbackInput } from '../lib/feedback';

type Status = 'idle' | 'sending' | 'sent' | 'failed';

/** Floating "Feedback" button on every page; sends to the feedback inbox with the page it came from. */
export function FeedbackButton() {
  const { pathname } = useLocation();
  const lessons = useLessons();
  const { profile } = useProfile();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [fallback, setFallback] = useState<string | null>(null);
  const areaRef = useRef<HTMLTextAreaElement>(null);

  const lessonId = pathname.match(/^\/lesson\/([^/]+)/)?.[1];
  const lesson = lessonId ? lessons.find((l) => l.id === lessonId) : undefined;
  const section = pathname.endsWith('/practice') ? 'practice' : pathname.endsWith('/drill') ? 'drill' : '';
  const context = lesson
    ? `L${lesson.level} · ${lesson.title}${section ? ` (${section})` : ''}`
    : pathname.startsWith('/grammar')
    ? 'Grammar explainers'
    : pathname === '/'
    ? 'Lessons home'
    : undefined;

  useEffect(() => {
    if (open) areaRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  async function submit() {
    const text = message.trim();
    if (!text) return;
    const input: FeedbackInput = { message: text, page: window.location.href, context, displayName: profile?.displayName };
    setStatus('sending');
    const res = await sendFeedback(input);
    if (res.ok) {
      setStatus('sent');
      setMessage('');
      setFallback(null);
    } else {
      setStatus('failed');
      setFallback(feedbackMailto(input));
    }
  }

  function close() {
    setOpen(false);
    if (status === 'sent') setStatus('idle');
  }

  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2">
      {open && (
        <div
          role="dialog"
          aria-label="Send feedback"
          className="w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-gray-200 bg-white p-4 shadow-2xl"
        >
          {status === 'sent' ? (
            <div className="space-y-2 text-center py-2">
              <p className="text-3xl" aria-hidden="true">
                🙏
              </p>
              <p className="font-semibold text-gray-900">Asante sana! We got it.</p>
              <p className="text-sm text-gray-500">Every note helps us fix the lessons.</p>
              <button onClick={close} className="mt-1 text-sm text-green-700 hover:underline">
                Close
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-gray-900">Feedback</p>
                  <p className="text-xs text-gray-400">{context ? `About: ${context}` : 'Tell us anything'}</p>
                </div>
                <button onClick={close} aria-label="Close feedback" className="text-gray-400 hover:text-gray-700">
                  ✕
                </button>
              </div>
              <textarea
                ref={areaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                maxLength={4000}
                placeholder="A wrong translation, a bug, an idea… Kenyans: does this sound natural?"
                className="w-full resize-none rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
              />
              {status === 'failed' && fallback && (
                <p className="text-xs text-red-600">
                  Couldn’t send from the app.{' '}
                  <a href={fallback} className="underline">
                    Email it instead
                  </a>
                  .
                </p>
              )}
              <button
                onClick={() => void submit()}
                disabled={!message.trim() || status === 'sending'}
                className="w-full rounded-full bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-40"
              >
                {status === 'sending' ? 'Sending…' : 'Send feedback'}
              </button>
            </div>
          )}
        </div>
      )}
      <button
        onClick={() => (open ? close() : setOpen(true))}
        aria-expanded={open}
        className="rounded-full border border-gray-200 bg-white/95 px-3.5 py-2 text-sm font-medium text-gray-700 shadow-lg backdrop-blur hover:border-green-400 hover:text-green-800"
      >
        💬 Feedback
      </button>
    </div>
  );
}
