import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/profileContext';
import {
  listAiJobs,
  listGuidance,
  loadIsAdmin,
  retireGuidance,
  saveGuidance,
  saveNotePatch,
  submitAiEdit,
  submitSuggestion,
  undoAiJob,
  type AiJob,
  type GuidanceNote,
  type SuggestionKind,
} from '../lib/admin';
import {
  addOverrides,
  addPatches,
  countPropagation,
  countWordPlaces,
  resolveOverride,
  scopeContent,
  type ContentPatch,
  type PatchScope,
  type ScopeType,
} from '../lib/contentOverrides';
import { getSupabase } from '../lib/supabase';
import { AdminContext, type SuggestTarget } from './adminContext';
import { setRoamAllowed } from '../lib/roam';
import { reglossInstruction } from '../lib/aiPatch';
import { personalizeText } from '../lib/personalize';
import type { Lesson } from '../types';

const KINDS: Array<{ id: SuggestionKind; label: string }> = [
  { id: 'phrasing', label: 'Phrasing' },
  { id: 'translation', label: 'Translation' },
  { id: 'grammar', label: 'Grammar' },
  { id: 'layout', label: 'Layout' },
  { id: 'other', label: 'Other' },
];

// ---------- background operations ----------

interface Op {
  id: string;
  label: string;
  status: 'saving' | 'done' | 'failed';
  error?: string;
  run: () => Promise<{ ok: boolean; error?: string }>;
}

type Enqueue = (label: string, run: Op['run']) => void;
type StartAi = (input: Parameters<typeof submitAiEdit>[0]) => void;

const uid = () => globalThis.crypto?.randomUUID?.() ?? `op-${Date.now()}-${Math.random().toString(36).slice(2)}`;

function lessonContext(lesson: Lesson): Record<string, unknown> {
  return {
    title: lesson.title,
    level: lesson.level,
    culturalNote: lesson.culturalNote,
    startingPoint: lesson.startingPoint,
    grammarFocus: lesson.grammarFocus,
    vocabulary: lesson.vocabulary?.map((v) => ({ swahili: v.swahili, english: v.english })),
  };
}

function Sheet({ title, subtitle, onClose, children }: { title: string; subtitle?: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-gray-900/40" onClick={onClose} aria-hidden="true" />
      <div role="dialog" aria-modal="true" aria-label={title} className="relative w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl bg-white p-5 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">{title}</p>
            {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-700">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const field = 'mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100';
const primary = 'w-full rounded-full bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-40';

// ---------- the ✎ modal: edit text · ask the AI · leave a note ----------

function SuggestModal({ target, onClose, enqueue, startAi }: { target: SuggestTarget; onClose: () => void; enqueue: Enqueue; startAi: StartAi }) {
  const { pathname } = useLocation();
  const { profile, persona } = useProfile();
  const [mode, setMode] = useState<'edit' | 'ai' | 'learner' | 'note'>('edit');
  const [kind, setKind] = useState<SuggestionKind>('phrasing');
  const [why, setWhy] = useState('');
  const [proposed, setProposed] = useState(target.currentText);
  const [instruction, setInstruction] = useState('');
  const [note, setNote] = useState('');
  const lessonId = target.lessonId ?? pathname.match(/^\/lesson\/([^/]+)/)?.[1];
  const textChanged = proposed.trim() !== '' && proposed.trim() !== target.currentText.trim();

  // Which bundled content this element lives in (for live edits).
  const scope = useMemo(() => {
    let type: ScopeType | null = null;
    let id: string | undefined;
    if (target.targetType.startsWith('grammar')) {
      type = 'grammar';
      id = target.itemId?.split('#')[0];
    } else if (target.targetType === 'level') {
      type = 'level';
      id = target.itemId?.replace(/^level-/, '');
    } else if (lessonId) {
      type = 'lesson';
      id = lessonId;
    }
    const content = type && id ? scopeContent(type, id) : undefined;
    return type && id && content ? { type, id, content } : null;
  }, [target, lessonId]);

  // The word / dialogue turn / practice item / flashcard an AI instruction or a note applies to.
  const aiTarget = useMemo(() => {
    if (scope?.type !== 'lesson' || !target.itemId) return null;
    const lesson = scope.content as Lesson;
    const turn = lesson.turns.find((t) => t.id === target.itemId);
    if (turn && target.wordIndex !== undefined) {
      const word = turn.words?.[target.wordIndex];
      if (!word) return null;
      return {
        lesson,
        kind: 'word' as const,
        current: { word, line: { speaker: turn.speaker, swahili: turn.swahili, english: turn.english } },
        note: word.note ?? '',
        sanifu: word.sanifu ?? '',
        word,
      };
    }
    if (turn) return { lesson, kind: 'turn' as const, current: turn, note: turn.note ?? '', sanifu: turn.sanifu ?? '' };
    const item = lesson.practice?.find((p) => p.id === target.itemId);
    if (item) return { lesson, kind: 'practice' as const, current: item, note: '', sanifu: '' };
    const card = lesson.vocabulary?.find((v) => v.id === target.itemId);
    if (card) return { lesson, kind: 'vocab' as const, current: card, note: card.note ?? '', sanifu: card.sanifu ?? '' };
    return null;
  }, [scope, target.itemId, target.wordIndex]);
  const wordText = aiTarget?.kind === 'word' ? aiTarget.word.text : '';
  const wordPlaces = useMemo(() => (wordText ? countWordPlaces(wordText) : 0), [wordText]);
  const [wordEverywhere, setWordEverywhere] = useState(true);
  const [swapEverywhere, setSwapEverywhere] = useState(true);
  const [learnerNote, setLearnerNote] = useState(aiTarget?.note ?? '');
  const [learnerSanifu, setLearnerSanifu] = useState(aiTarget?.sanifu ?? '');
  const canNote = Boolean(aiTarget && lessonId && aiTarget.kind !== 'practice');

  const [everywhere, setEverywhere] = useState(true);
  const itemIdForOverride = target.targetType.startsWith('grammar') || target.targetType === 'level' ? undefined : target.itemId;
  const pending = useMemo(
    () => (textChanged ? resolveOverride(scope, itemIdForOverride, target.currentText.trim(), proposed.trim(), persona) : null),
    [textChanged, scope, itemIdForOverride, target.currentText, proposed, persona],
  );
  const others = useMemo(() => (pending && scope ? countPropagation(scope.content, pending) : 0), [pending, scope]);

  // Editing a dialogue line: its English subtitle is edited in the same place.
  const lineTurn = target.targetType === 'turn.swahili' && aiTarget?.kind === 'turn' ? aiTarget.current : undefined;
  const shownEnglish = lineTurn ? personalizeText(lineTurn.english, persona, false) : '';
  const [english, setEnglish] = useState(shownEnglish);
  const englishChanged = Boolean(lineTurn) && english.trim() !== '' && english.trim() !== shownEnglish.trim();
  const englishPending = useMemo(
    () => (englishChanged ? resolveOverride(scope, target.itemId, shownEnglish.trim(), english.trim(), persona) : null),
    [englishChanged, scope, target.itemId, shownEnglish, english, persona],
  );

  function saveEdit() {
    const override = pending ? { ...pending, propagate: everywhere && others > 0 } : null;
    const englishOverride = englishPending ? { ...englishPending, propagate: false } : null;
    // Show the new text right away; the server catches up in the background.
    if (override) addOverrides([{ id: `local-${uid()}`, created_at: new Date().toISOString(), ...override }]);
    if (englishOverride) {
      addOverrides([{ id: `local-${uid()}`, created_at: new Date().toISOString(), ...englishOverride }]);
      enqueue(`Edit · English · ${target.label}`, async () => {
        const res = await submitSuggestion({
          ...target,
          targetType: 'turn.english',
          currentText: shownEnglish,
          lessonId,
          kind: 'translation',
          proposedText: english.trim(),
          override: englishOverride,
          page: window.location.href,
          reviewerName: profile?.displayName,
        });
        return { ok: res.ok, error: res.error };
      });
    }
    // A dialogue line's Swahili changed: the underlines were re-aligned right away; now have the AI
    // redo the tooltips (and the English, if the meaning changed) for the new wording.
    const lesson = scope?.type === 'lesson' ? (scope.content as Lesson) : undefined;
    const editedTurn = override && lesson && target.itemId ? lesson.turns.find((t) => t.id === target.itemId) : undefined;
    if (override && lesson && editedTurn && lessonId && editedTurn.swahili.includes(override.replace_text.trim().slice(0, 40))) {
      startAi({
        lessonId,
        scope: 'item',
        kind: 'turn',
        itemId: editedTurn.id,
        targetLabel: `Tooltips · ${target.label}`,
        instruction: reglossInstruction(override.find_text, override.replace_text, Boolean(englishOverride)),
        lesson: lessonContext(lesson),
        current: structuredClone(editedTurn),
        regloss: true,
        keepEnglish: Boolean(englishOverride),
      });
    }
    const reason = why.trim();
    if (!textChanged && !reason) {
      onClose();
      return;
    }
    enqueue(textChanged ? `Edit · ${target.label}` : `Suggestion · ${target.label}`, async () => {
      const res = await submitSuggestion({
        ...target,
        lessonId,
        kind,
        suggestion: reason || undefined,
        proposedText: textChanged ? proposed.trim() : undefined,
        override: override ?? undefined,
        page: window.location.href,
        reviewerName: profile?.displayName,
      });
      if (res.ok && reason) await saveGuidance({ text: reason, lessonId, itemId: target.itemId, targetLabel: target.label });
      return { ok: res.ok, error: res.error };
    });
    onClose();
  }

  function saveAi() {
    if (!aiTarget || !lessonId) return;
    startAi({
      lessonId,
      scope: 'item',
      kind: aiTarget.kind,
      itemId: target.itemId,
      targetLabel: target.label,
      instruction: instruction.trim(),
      lesson: lessonContext(aiTarget.lesson),
      current: aiTarget.current,
      ...(aiTarget.kind === 'word' ? { wordIndex: target.wordIndex, everywhere: wordEverywhere && wordPlaces > 1 } : {}),
      ...(aiTarget.kind === 'turn' || aiTarget.kind === 'practice' ? { propagate: swapEverywhere } : {}),
    });
    onClose();
  }

  function saveLearnerNote() {
    if (!aiTarget || !lessonId || !target.itemId || aiTarget.kind === 'practice') return;
    const note = learnerNote.trim();
    const sanifu = learnerSanifu.trim();
    const scope: PatchScope = aiTarget.kind === 'word' ? 'word' : 'fields';
    const value =
      aiTarget.kind === 'word'
        ? { text: aiTarget.word.text, wordIndex: target.wordIndex, note, sanifu, everywhere: wordEverywhere && wordPlaces > 1 }
        : { note, sanifu, ...(aiTarget.kind === 'vocab' && !sanifu ? { sanifuNote: '' } : {}) };
    const row = { lesson_id: lessonId, scope, item_id: target.itemId, value };
    // Show it right away; the server stores it in the background.
    addPatches([{ id: `local-${uid()}`, created_at: new Date().toISOString(), ...row }]);
    enqueue(`💡 Note · ${target.label}`, () => saveNotePatch(row));
    onClose();
  }

  function saveNote() {
    const text = note.trim();
    enqueue(`Team rule · ${target.label}`, async () => ({
      ok: await saveGuidance({ text, lessonId, itemId: target.itemId, targetLabel: target.label }),
    }));
    onClose();
  }

  const tab = (id: typeof mode, label: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={mode === id}
      onClick={() => setMode(id)}
      className={`flex-1 px-3 py-1.5 rounded-full text-xs font-semibold ${mode === id ? 'bg-amber-500 text-white' : 'text-gray-600 hover:bg-amber-50'}`}
    >
      {label}
    </button>
  );

  return (
    <Sheet title="✎ Admin" subtitle={`${target.label}${lessonId ? ` · ${lessonId}` : ''}`} onClose={onClose}>
      <blockquote className="rounded-lg border-l-4 border-amber-300 bg-amber-50 px-3 py-2 text-sm text-gray-800 whitespace-pre-wrap">
        {target.currentText || <span className="text-gray-400">(no text)</span>}
      </blockquote>
      <div role="tablist" className="flex gap-1 rounded-full border border-gray-200 p-1">
        {tab('edit', 'Edit')}
        {tab('ai', '✨ Ask AI')}
        {tab('learner', '💡 Note')}
        {tab('note', 'Team rule')}
      </div>

      {mode === 'edit' && (
        <>
          <label className="block">
            <span className="text-sm font-semibold text-gray-800">
              New text <span className="font-normal text-gray-400">{scope ? '— goes live as soon as you save' : '(optional)'}</span>
            </span>
            <textarea value={proposed} onChange={(e) => setProposed(e.target.value)} rows={3} autoFocus className={field} />
          </label>
          {lineTurn && (
            <label className="block">
              <span className="text-sm font-semibold text-gray-800">English subtitle</span>
              <textarea value={english} onChange={(e) => setEnglish(e.target.value)} rows={2} className={field} />
              {textChanged && !englishChanged && (
                <span className="block mt-1 text-xs text-gray-400">Leave it as is and the AI updates it if the meaning changed.</span>
              )}
            </label>
          )}
          {pending && others > 0 && (
            <label className="flex items-start gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={everywhere} onChange={(e) => setEverywhere(e.target.checked)} className="mt-0.5 accent-amber-500" />
              <span>
                Also change this wording in the {others} other {others === 1 ? 'place' : 'places'} it appears
                <span className="text-gray-400"> (dialogues, answer choices, practice, flashcards — all lessons)</span>
              </span>
            </label>
          )}
          <label className="block">
            <span className="text-sm font-semibold text-gray-800">
              Why? <span className="font-normal text-gray-400">(optional — saved as a team rule the AI follows from now on)</span>
            </span>
            <textarea
              value={why}
              onChange={(e) => setWhy(e.target.value)}
              rows={2}
              placeholder="e.g. Nobody in Nairobi says this — people say … / Kenyans use 'ama', not 'au'"
              className={field}
            />
          </label>
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Type of change">
            {KINDS.map((k) => (
              <button
                key={k.id}
                type="button"
                role="radio"
                aria-checked={kind === k.id}
                onClick={() => setKind(k.id)}
                className={`px-3 py-1 rounded-full text-xs font-medium border ${
                  kind === k.id ? 'bg-amber-500 border-amber-500 text-white' : 'border-gray-200 text-gray-600 hover:border-amber-400'
                }`}
              >
                {k.label}
              </button>
            ))}
          </div>
          <button onClick={saveEdit} disabled={!textChanged && !englishChanged && !why.trim()} className={primary}>
            {(textChanged || englishChanged) && scope ? 'Save & publish' : 'Save suggestion'}
          </button>
        </>
      )}

      {mode === 'ai' && (
        <>
          {aiTarget ? (
            <>
              <label className="block">
                <span className="text-sm font-semibold text-gray-800">What should change?</span>
                <textarea
                  value={instruction}
                  onChange={(e) => setInstruction(e.target.value)}
                  rows={4}
                  autoFocus
                  placeholder={
                    aiTarget.kind === 'word' || aiTarget.kind === 'vocab'
                      ? 'e.g. Add a note on its other meanings · Explain how Kenyans use it in Sheng · Add the Sanifu form'
                      : `e.g. Add a Sanifu footnote · Add a note on how people really say this · Make the wrong answers about verbs, not names`
                  }
                  className={field}
                />
              </label>
              {(aiTarget.kind === 'turn' || aiTarget.kind === 'practice') && (
                <label className="flex items-start gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={swapEverywhere} onChange={(e) => setSwapEverywhere(e.target.checked)} className="mt-0.5 accent-amber-500" />
                  <span>
                    If the AI swaps a word (e.g. hadi → mpaka), change it everywhere it appears
                    <span className="text-gray-400"> (dialogues, answer choices, practice, flashcards — all lessons)</span>
                  </span>
                </label>
              )}
              {aiTarget.kind === 'word' && wordPlaces > 1 && (
                <label className="flex items-start gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={wordEverywhere} onChange={(e) => setWordEverywhere(e.target.checked)} className="mt-0.5 accent-amber-500" />
                  <span>
                    Show the new note / Sanifu wherever “{wordText}” appears
                    <span className="text-gray-400"> ({wordPlaces} places — dialogues and flashcards, all lessons)</span>
                  </span>
                </label>
              )}
              <p className="text-xs text-gray-500">
                Claude rewrites this{' '}
                {aiTarget.kind === 'word'
                  ? 'word’s explanation, Sanifu and note'
                  : aiTarget.kind === 'turn'
                  ? 'line (answer choices, word glosses and notes included)'
                  : aiTarget.kind === 'vocab'
                  ? 'flashcard (and its note)'
                  : 'practice item'}{' '}
                in the background — usually a minute or two — following the house rules and the team rules. It goes live by itself; you
                can undo it under Admin → Activity.
              </p>
              <button onClick={saveAi} disabled={!instruction.trim()} className={primary}>
                ✨ Send to AI
              </button>
            </>
          ) : (
            <p className="text-sm text-gray-600">
              AI edits work on words, conversation lines, practice items and flashcards. For broader changes use{' '}
              <span className="font-semibold">✨ Direct this conversation / practice</span> at the top of the lesson.
            </p>
          )}
        </>
      )}

      {mode === 'learner' && (
        <>
          {canNote && aiTarget ? (
            <>
              <label className="block">
                <span className="text-sm font-semibold text-gray-800">
                  Note <span className="font-normal text-gray-400">— learners see it {aiTarget.kind === 'word' ? 'when they tap the word' : aiTarget.kind === 'turn' ? 'under the line (💡 Note)' : 'on the flashcard'}</span>
                </span>
                <textarea
                  value={learnerNote}
                  onChange={(e) => setLearnerNote(e.target.value)}
                  rows={3}
                  autoFocus
                  placeholder="e.g. Also means “to want”. In Nairobi you’ll often hear the short form “nataka”."
                  className={field}
                />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-gray-800">
                  Sanifu <span className="font-normal text-gray-400">(optional — the standard form, if Kenyans say it differently)</span>
                </span>
                <input value={learnerSanifu} onChange={(e) => setLearnerSanifu(e.target.value)} className={field} />
              </label>
              {aiTarget.kind === 'word' && wordPlaces > 1 && (
                <label className="flex items-start gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={wordEverywhere} onChange={(e) => setWordEverywhere(e.target.checked)} className="mt-0.5 accent-amber-500" />
                  <span>
                    Show it wherever “{wordText}” appears
                    <span className="text-gray-400"> ({wordPlaces} places — dialogues and flashcards, all lessons)</span>
                  </span>
                </label>
              )}
              <p className="text-xs text-gray-500">Leave a field empty to remove it. Prefer AI to write it? Use ✨ Ask AI → “add a note on …”.</p>
              <button
                onClick={saveLearnerNote}
                disabled={learnerNote.trim() === aiTarget.note.trim() && learnerSanifu.trim() === aiTarget.sanifu.trim()}
                className={primary}
              >
                Save & publish
              </button>
            </>
          ) : (
            <p className="text-sm text-gray-600">
              Notes can be attached to words, conversation lines and flashcards. For practice items, edit the explanation with Edit.
            </p>
          )}
        </>
      )}

      {mode === 'note' && (
        <>
          <label className="block">
            <span className="text-sm font-semibold text-gray-800">A rule or insight to remember</span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
              autoFocus
              placeholder="e.g. In Nairobi 'kuna foleni' is rarer than 'kuna jam' — prefer jam in casual speech."
              className={field}
            />
          </label>
          <p className="text-xs text-gray-500">Team rules build up the app's style guide (learners don't see them). Every AI edit reads them.</p>
          <button onClick={saveNote} disabled={!note.trim()} className={primary}>
            Save rule
          </button>
        </>
      )}
    </Sheet>
  );
}

// ---------- ✨ Direct a whole conversation / practice ----------

function DirectModal({ lessonId, scope, onClose, startAi }: { lessonId: string; scope: 'dialogue' | 'practice'; onClose: () => void; startAi: StartAi }) {
  const [instruction, setInstruction] = useState('');
  const lesson = scopeContent('lesson', lessonId) as Lesson | undefined;
  const what = scope === 'dialogue' ? 'conversation' : 'practice session';
  return (
    <Sheet title={`✨ Direct this ${what}`} subtitle={lesson?.title} onClose={onClose}>
      <label className="block">
        <span className="text-sm font-semibold text-gray-800">How should the whole {what} change?</span>
        <textarea
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          rows={5}
          autoFocus
          placeholder={
            scope === 'dialogue'
              ? 'e.g. Have the mama mboga ask more about the learner’s family · Add two lines about paying with M-Pesa · Make it shorter'
              : 'e.g. More items on numbers and prices · Fewer translate items, more Swahili-only · Focus on the verbs from the dialogue'
          }
          className={field}
        />
      </label>
      <p className="text-xs text-gray-500">
        Claude rewrites the {what} in the background (a few minutes) following the house rules, the lesson's level and the team
        notes. It goes live by itself; undo any time under Admin → Activity.
      </p>
      <button
        disabled={!instruction.trim() || !lesson}
        onClick={() => {
          if (!lesson) return;
          startAi({
            lessonId,
            scope,
            targetLabel: `Whole ${what}`,
            instruction: instruction.trim(),
            lesson: lessonContext(lesson),
            current: scope === 'dialogue' ? lesson.turns : lesson.practice ?? [],
          });
          onClose();
        }}
        className={primary}
      >
        ✨ Send to AI
      </button>
    </Sheet>
  );
}

// ---------- Activity & team rules ----------

const STATUS: Record<AiJob['status'], { label: string; cls: string }> = {
  working: { label: 'Working…', cls: 'bg-amber-100 text-amber-800' },
  live: { label: 'Live', cls: 'bg-green-100 text-green-800' },
  failed: { label: 'Failed', cls: 'bg-red-100 text-red-700' },
  undone: { label: 'Undone', cls: 'bg-gray-100 text-gray-500' },
};

function ActivityModal({
  ops,
  jobs,
  onRetry,
  onUndo,
  onClose,
}: {
  ops: Op[];
  jobs: AiJob[];
  onRetry: (op: Op) => void;
  onUndo: (job: AiJob) => Promise<void>;
  onClose: () => void;
}) {
  const [notes, setNotes] = useState<GuidanceNote[] | null>(null);
  const [undone, setUndone] = useState(false);
  useEffect(() => {
    void listGuidance().then(setNotes);
  }, []);
  return (
    <Sheet title="Admin activity" onClose={onClose}>
      {undone && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-900 flex items-center justify-between gap-2">
          Undone. Reload to see the original.
          <button onClick={() => location.reload()} className="rounded-full bg-amber-500 px-3 py-1 text-xs font-semibold text-white">
            Reload
          </button>
        </div>
      )}
      {ops.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">This session</h3>
          {ops.map((op) => (
            <div key={op.id} className="flex items-center justify-between gap-2 text-sm">
              <span className="truncate text-gray-700">{op.label}</span>
              {op.status === 'failed' ? (
                <button onClick={() => onRetry(op)} className="shrink-0 text-xs font-semibold text-red-600 underline" title={op.error}>
                  Failed — retry
                </button>
              ) : (
                <span className={`shrink-0 text-xs ${op.status === 'saving' ? 'text-amber-700' : 'text-green-700'}`}>
                  {op.status === 'saving' ? 'Saving…' : 'Saved ✓'}
                </span>
              )}
            </div>
          ))}
        </section>
      )}
      <section className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">✨ AI edits</h3>
        {jobs.length === 0 && <p className="text-sm text-gray-400">None yet.</p>}
        {jobs.map((j) => (
          <div key={j.id} className="rounded-xl border border-gray-200 p-3 space-y-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-gray-500 truncate">
                {j.lesson_id} · {j.target_label ?? j.scope}
              </span>
              <span className={`shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full ${STATUS[j.status].cls}`}>{STATUS[j.status].label}</span>
            </div>
            <p className="text-sm text-gray-800">“{j.instruction}”</p>
            {j.summary && <p className="text-xs text-green-800">{j.summary}</p>}
            {j.error && <p className="text-xs text-red-600">{j.error}</p>}
            {j.status === 'live' && (
              <button
                onClick={() => void onUndo(j).then(() => setUndone(true))}
                className="text-xs font-semibold text-gray-500 underline hover:text-gray-800"
              >
                Undo
              </button>
            )}
          </div>
        ))}
      </section>
      <section className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Team rules (the AI's style guide)</h3>
        {notes === null && <p className="text-sm text-gray-400">Loading…</p>}
        {notes?.length === 0 && <p className="text-sm text-gray-400">No rules yet. Add one with ✎ → Team rule.</p>}
        {notes?.map((n) => (
          <div key={n.id} className="flex items-start justify-between gap-2 text-sm">
            <p className="text-gray-700">
              {n.text}
              {(n.lesson_id || n.target_label) && (
                <span className="block text-xs text-gray-400">{[n.lesson_id, n.target_label].filter(Boolean).join(' · ')}</span>
              )}
            </p>
            <button
              aria-label="Retire this note"
              title="Retire this note"
              onClick={() => void retireGuidance(n.id).then((ok) => ok && setNotes((all) => all?.filter((x) => x.id !== n.id) ?? null))}
              className="shrink-0 text-gray-300 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
        ))}
      </section>
    </Sheet>
  );
}

// ---------- provider ----------

/** Loads the admin flag, hosts the admin modals and runs admin saves in the background. */
export function AdminProvider({ children, forceAdmin }: { children: ReactNode; forceAdmin?: boolean }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [isAdmin, setIsAdmin] = useState(false);
  const [target, setTarget] = useState<SuggestTarget | null>(null);
  const [direct, setDirect] = useState<{ lessonId: string; scope: 'dialogue' | 'practice' } | null>(null);
  const [showActivity, setShowActivity] = useState(false);
  const [ops, setOps] = useState<Op[]>([]);
  const [jobs, setJobs] = useState<AiJob[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const liveSeen = useRef(new Set<string>());
  const [ackFailed, setAckFailed] = useState<string[]>([]);

  useEffect(() => {
    let alive = true;
    loadIsAdmin(userId).then((a) => alive && setIsAdmin(a));
    return () => {
      alive = false;
    };
  }, [userId]);

  const effectiveAdmin = forceAdmin ?? isAdmin;
  useEffect(() => setRoamAllowed(effectiveAdmin), [effectiveAdmin]);

  const runOp = useCallback((op: Op) => {
    setOps((all) => [op, ...all.filter((o) => o.id !== op.id)].slice(0, 30));
    void op.run().then(
      (res) => setOps((all) => all.map((o) => (o.id === op.id ? { ...o, status: res.ok ? 'done' : 'failed', error: res.error } : o))),
      (e: unknown) =>
        setOps((all) => all.map((o) => (o.id === op.id ? { ...o, status: 'failed', error: e instanceof Error ? e.message : 'error' } : o))),
    );
  }, []);

  const enqueue = useCallback<Enqueue>((label, run) => runOp({ id: uid(), label, status: 'saving', run }), [runOp]);

  const refreshJobs = useCallback(async () => {
    const list = await listAiJobs();
    setJobs(list);
    // Newly live AI edits: load their patch so the change shows without a reload.
    const fresh = list.filter((j) => j.status === 'live' && j.patch_id && !liveSeen.current.has(j.id));
    for (const j of list) if (j.status === 'live') liveSeen.current.add(j.id);
    const supa = getSupabase();
    if (supa && fresh.length) {
      const { data } = await supa
        .from('content_patch')
        .select('id,created_at,lesson_id,scope,item_id,value,swaps')
        .in('id', fresh.map((j) => j.patch_id as string));
      if (data?.length) addPatches(data as ContentPatch[]);
    }
    return { list, fresh };
  }, []);

  // First load: remember which jobs were already live (their patches load with the content).
  useEffect(() => {
    if (!effectiveAdmin) return;
    void listAiJobs().then((list) => {
      for (const j of list) if (j.status === 'live') liveSeen.current.add(j.id);
      setJobs(list);
    });
  }, [effectiveAdmin]);

  // Poll while any AI edit is still working.
  const working = jobs.filter((j) => j.status === 'working').length;
  useEffect(() => {
    if (!working) return;
    const t = setInterval(() => {
      void refreshJobs().then(({ fresh }) => {
        if (fresh.length) setToast(`✨ Live: ${fresh[0].summary ?? 'AI edit published'}`);
      });
    }, 8000);
    return () => clearInterval(t);
  }, [working, refreshJobs]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 7000);
    return () => clearTimeout(t);
  }, [toast]);

  const startAi = useCallback<StartAi>(
    (input) => {
      enqueue(`✨ AI · ${input.targetLabel ?? input.scope}`, async () => {
        const res = await submitAiEdit(input);
        if (res.ok) await refreshJobs();
        return {
          ok: res.ok,
          error: res.error === 'ai_not_configured' ? 'AI is not set up yet (missing ANTHROPIC_API_KEY on Vercel).' : res.error,
        };
      });
    },
    [enqueue, refreshJobs],
  );

  const openSuggest = useCallback((t: SuggestTarget) => setTarget(t), []);
  const openDirect = useCallback((lessonId: string, scope: 'dialogue' | 'practice') => setDirect({ lessonId, scope }), []);
  const openActivity = useCallback(() => setShowActivity(true), []);
  const activity = useMemo(
    () => ({
      saving: ops.filter((o) => o.status === 'saving').length,
      working,
      failed: ops.filter((o) => o.status === 'failed').length + jobs.filter((j) => j.status === 'failed' && !ackFailed.includes(j.id)).length,
    }),
    [ops, working, jobs, ackFailed],
  );
  const value = useMemo(
    () => ({ isAdmin: effectiveAdmin, openSuggest, openDirect, openActivity, activity }),
    [effectiveAdmin, openSuggest, openDirect, openActivity, activity],
  );

  return (
    <AdminContext.Provider value={value}>
      {children}
      {target && <SuggestModal target={target} onClose={() => setTarget(null)} enqueue={enqueue} startAi={startAi} />}
      {direct && <DirectModal lessonId={direct.lessonId} scope={direct.scope} onClose={() => setDirect(null)} startAi={startAi} />}
      {showActivity && (
        <ActivityModal
          ops={ops}
          jobs={jobs}
          onRetry={(op) => runOp({ ...op, status: 'saving', error: undefined })}
          onUndo={async (j) => {
            await undoAiJob(j);
            await refreshJobs();
          }}
          onClose={() => {
            setAckFailed(jobs.filter((j) => j.status === 'failed').map((j) => j.id));
            setShowActivity(false);
          }}
        />
      )}
      {toast && (
        <button
          type="button"
          onClick={() => {
            setToast(null);
            setShowActivity(true);
          }}
          className="fixed left-1/2 -translate-x-1/2 top-16 z-[65] max-w-sm rounded-full bg-gray-900 text-white text-sm px-4 py-2 shadow-lg"
        >
          {toast}
        </button>
      )}
    </AdminContext.Provider>
  );
}
