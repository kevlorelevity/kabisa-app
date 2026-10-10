import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/profileContext';
import {
  listAiJobs,
  listGuidance,
  loadIsAdmin,
  loadStyleGuide,
  rebuildStyleGuide,
  retireGuidance,
  saveGuidance,
  saveNotePatch,
  answerQuestion,
  clearPendingSwaps,
  loadJobLessons,
  submitAiLesson,
  loadJobPatches,
  submitAiEdit,
  submitFollowup,
  submitSuggestion,
  undoAiJob,
  type AiJob,
  type GuidanceNote,
} from '../lib/admin';
import {
  addAiLessons,
  addOverrides,
  addPatches,
  allLessons,
  changedSpan,
  countWordPlaces,
  resolveOverride,
  scopeContent,
  swahiliSpans,
  type ContentOverride,
  type PatchScope,
  type ScopeType,
  type Span,
} from '../lib/contentOverrides';
import { findCandidates, type EditedKind, type FollowupInput, type FollowupQuestion } from '../lib/aiFollowup';
import { AdminContext, type EditField, type SuggestTarget } from './adminContext';
import { defaultFields } from './adminTargets';
import { levelInfo } from '../lib/levels';
import { contextObservation, noteObservation, sanifuObservation } from '../lib/styleGuide';
import { setRoamAllowed } from '../lib/roam';
import { reglossInstruction } from '../lib/aiPatch';
import type { Lesson } from '../types';


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
/** Context-aware follow-up of an edit; with `regloss`, the line's tooltips are redone first. */
/** Keeps something an editor said (context, note, Sanifu) for the style guide. */
type Observe = (o: Parameters<typeof saveGuidance>[0]) => void;
type StartFollowup = (input: FollowupInput, regloss?: Parameters<typeof submitAiEdit>[0]) => void;

/** A dialogue turn, practice item or flashcard of a lesson, by id (as it is now). */
function scopeItem(lesson: Lesson, id?: string): unknown {
  if (!id) return undefined;
  const hit = lesson.turns.find((t) => t.id === id) ?? lesson.practice?.find((p) => p.id === id) ?? lesson.vocabulary?.find((v) => v.id === id);
  return hit ? structuredClone(hit) : undefined;
}

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

function SuggestModal({
  target,
  onClose,
  enqueue,
  startAi,
  startFollowup,
  observe,
}: {
  target: SuggestTarget;
  onClose: () => void;
  enqueue: Enqueue;
  startAi: StartAi;
  startFollowup: StartFollowup;
  observe: Observe;
}) {
  const { pathname } = useLocation();
  const { profile, persona } = useProfile();
  const [mode, setMode] = useState<'edit' | 'ai' | 'learner'>('edit');
  const fields = useMemo(() => defaultFields(target), [target]);
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(fields.map((f) => [f.key, f.text])));
  const [context, setContext] = useState('');
  const [checkOthers, setCheckOthers] = useState(true);
  const [instruction, setInstruction] = useState('');
  const lessonId = target.lessonId ?? pathname.match(/^\/lesson\/([^/]+)/)?.[1];

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

  const itemIdForOverride = target.targetType.startsWith('grammar') || target.targetType === 'level' ? undefined : target.itemId;

  // What the admin changed, field by field, and how each change is stored.
  const plan = useMemo(() => {
    const overrides: Array<{ field: EditField; override: Omit<ContentOverride, 'id'> }> = [];
    const merges: Array<{ field: EditField; next: string }> = [];
    const unplaced: Array<{ field: EditField; next: string }> = [];
    const spans: Span[] = [];
    // A word edit that changes both the word and its meaning: the line is rewritten and the new
    // word is underlined with the admin's meaning (a 'word' patch) — no automatic re-gloss.
    const wf = fields.find((f) => f.inLine);
    const gf = fields.find((f) => f.key === 'en' && target.targetType === 'word.gloss');
    const wordGloss =
      wf && gf && (values[wf.key] ?? '').trim() && (values[wf.key] ?? '').trim() !== wf.text.trim() && (values[gf.key] ?? '').trim() !== gf.text.trim()
        ? { text: (values[wf.key] ?? '').trim(), gloss: (values[gf.key] ?? '').trim(), field: gf }
        : null;
    for (const f of fields) {
      const next = (values[f.key] ?? '').trim();
      if (next === f.text.trim()) continue;
      if (f.merge) {
        merges.push({ field: f, next });
        const sp = f.lang === 'sw' && f.text.trim() && next ? changedSpan(f.text.trim(), next) : null;
        if (sp && !spans.some((x) => x.from === sp.from)) spans.push(sp);
        continue;
      }
      if (!next) continue;
      if (wordGloss && f.key === 'en') continue; // stored with the word below
      const cur = (f.inLine ?? f.text).trim();
      const nxt = (f.inLine ? f.inLine.replace(f.text, next) : next).trim();
      const o = resolveOverride(scope, itemIdForOverride, cur, nxt, persona);
      if (!o) {
        unplaced.push({ field: f, next });
        continue;
      }
      overrides.push({ field: f, override: { ...o, propagate: false } });
      if (f.lang === 'sw' && scope) for (const sp of swahiliSpans(scope.content, o)) if (!spans.some((x) => x.from === sp.from)) spans.push(sp);
    }
    return { overrides, merges, unplaced, spans, wordGloss, changed: overrides.length + merges.length + unplaced.length + (wordGloss ? 1 : 0) > 0 };
  }, [fields, values, scope, itemIdForOverride, persona, target.targetType]);
  const spanKey = plan.spans.map((x) => `${x.from}→${x.to}`).join('|');
  // Other dialogue lines, practice items and flashcards (all lessons) that use the old wording.
  const others = useMemo(
    () => (spanKey && scope?.type === 'lesson' ? findCandidates(allLessons(), plan.spans, target.itemId).length : 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [spanKey, scope, target.itemId],
  );

  function saveEdit() {
    const ctx = context.trim();
    const lesson = scope?.type === 'lesson' ? (scope.content as Lesson) : undefined;
    const now = () => new Date().toISOString();
    // 1. Show the new text right away (only here — other places are checked by the AI below).
    if (plan.overrides.length) addOverrides(plan.overrides.map((x) => ({ id: `local-${uid()}`, created_at: now(), ...x.override })));
    // Stored only after the line edit, so it applies in the right order on everyone's next load.
    let wordRow: Parameters<typeof saveNotePatch>[0] | null = null;
    if (plan.wordGloss && lessonId && target.itemId) {
      const row = { lesson_id: lessonId, scope: 'word' as PatchScope, item_id: target.itemId, value: { text: plan.wordGloss.text, gloss: plan.wordGloss.gloss } };
      addPatches([{ id: `local-${uid()}`, created_at: now(), ...row }]);
      wordRow = row;
    }
    let mergeRow: { lesson_id: string; scope: PatchScope; item_id: string; value: Record<string, unknown> } | null = null;
    if (plan.merges.length && lessonId && target.itemId) {
      const value: Record<string, unknown> = {};
      for (const { field, next } of plan.merges) {
        const m = field.merge!;
        const base = (value[m.key] as typeof m.base | undefined) ?? { ...m.base };
        value[m.key] = { ...base, [m.sub]: next || null };
        if (m.also && next) value[m.also] = next;
      }
      mergeRow = { lesson_id: lessonId, scope: 'fields', item_id: target.itemId, value };
      addPatches([{ id: `local-${uid()}`, created_at: now(), ...mergeRow }]);
      const row = mergeRow;
      enqueue(`Edit · ${target.label}`, () => saveNotePatch(row));
    }

    // 2. Store each change (and the review trail) in the background.
    const swChanged = fields.some((f) => f.lang === 'sw' && (values[f.key] ?? '').trim() !== f.text.trim());
    const records = [
      ...plan.overrides.map((x) => ({ field: x.field, override: x.override as Omit<ContentOverride, 'id'> | undefined, next: x.override.replace_text })),
      ...[...plan.merges, ...plan.unplaced].map((x) => ({ field: x.field, override: undefined, next: x.next })),
      ...(plan.wordGloss ? [{ field: plan.wordGloss.field, override: undefined, next: plan.wordGloss.gloss }] : []),
    ];
    records.forEach((r, i) => {
      enqueue(`Edit · ${r.field.label} · ${target.label}`, async () => {
        const res = await submitSuggestion({
          ...target,
          lessonId,
          kind: r.field.lang === 'sw' ? 'phrasing' : 'translation',
          currentText: r.field.text,
          suggestion: i === 0 && ctx ? ctx : undefined,
          proposedText: r.next || '(removed)',
          override: r.override,
          page: window.location.href,
          reviewerName: profile?.displayName,
        });
        if (res.ok && wordRow && r.field.inLine) return saveNotePatch(wordRow);
        return { ok: res.ok, error: res.error };
      });
    });
    if (!records.length && ctx) {
      enqueue(`Suggestion · ${target.label}`, async () => {
        const res = await submitSuggestion({ ...target, lessonId, kind: 'other', suggestion: ctx, page: window.location.href, reviewerName: profile?.displayName });
        return { ok: res.ok, error: res.error };
      });
    }
    // The context feeds the style guide every AI edit reads (rebuilt in the background).
    if (ctx)
      observe({
        kind: 'context',
        text: contextObservation(ctx, records.map((r) => ({ before: r.field.text, after: r.next }))),
        lessonId,
        itemId: target.itemId,
        targetLabel: target.label,
      });

    // 3. A dialogue line's Swahili changed: the underlines were re-aligned right away; the AI redoes the tooltips.
    const lineOverride = plan.overrides.find((x) => x.field.lang === 'sw' && (target.targetType === 'turn.swahili' || x.field.inLine))?.override;
    const editedTurn = lineOverride && lesson && target.itemId ? lesson.turns.find((t) => t.id === target.itemId) : undefined;
    const englishSet = plan.overrides.some((x) => x.field.lang === 'en' && target.targetType === 'turn.swahili');
    // A word edit that also set the word's meaning keeps that meaning: no automatic re-gloss then.
    const glossSet = Boolean(plan.wordGloss);
    const regloss =
      lineOverride && !glossSet && lesson && editedTurn && lessonId && editedTurn.swahili.includes(lineOverride.replace_text.trim().slice(0, 40))
        ? {
            lessonId,
            scope: 'item' as const,
            kind: 'turn' as const,
            itemId: editedTurn.id,
            targetLabel: `Tooltips · ${target.label}`,
            instruction: reglossInstruction(lineOverride.find_text, lineOverride.replace_text, englishSet),
            lesson: lessonContext(lesson),
            current: structuredClone(editedTurn),
            regloss: true,
            keepEnglish: englishSet,
          }
        : undefined;

    // 4. Carry the change to the other places it belongs (by meaning, using the context) and add a learner note.
    const kind: EditedKind | null = aiTarget?.kind ?? null;
    const candidates = checkOthers && plan.spans.length ? findCandidates(allLessons(), plan.spans, target.itemId) : [];
    const makeNote = Boolean(lesson && kind && plan.changed && (ctx || swChanged));
    if (lesson && lessonId && plan.changed && (candidates.length || makeNote)) {
      const fresh = aiTarget ? scopeItem(lesson, target.itemId) : undefined;
      const wordField = kind === 'word' ? fields.find((f) => f.key === 'sw') : undefined;
      const wordText = wordField ? ((values[wordField.key] ?? '').trim() || wordField.text) : undefined;
      startFollowup(
        {
          lessonId,
          lessonTitle: lesson.title,
          itemId: target.itemId,
          itemKind: kind,
          wordIndex: target.wordIndex,
          wordText,
          targetLabel: target.label,
          changes: records.map((r) => ({ label: r.field.label, lang: r.field.lang, before: r.field.text, after: r.next })),
          context: ctx || undefined,
          spans: plan.spans,
          edited: fresh,
          currentNote: aiTarget?.note || undefined,
          makeNote,
          candidates,
          source: 'edit',
        },
        regloss,
      );
    } else if (regloss) startAi(regloss);
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
    // Notes and Sanifu forms feed the style guide too.
    const subject = aiTarget.kind === 'word' ? aiTarget.word.text : aiTarget.kind === 'vocab' ? aiTarget.current.swahili : aiTarget.current.swahili;
    const where = { lessonId, itemId: target.itemId, targetLabel: target.label };
    if (note && note !== aiTarget.note.trim()) observe({ kind: 'note', text: noteObservation(subject, note), ...where });
    if (sanifu && sanifu !== aiTarget.sanifu.trim()) observe({ kind: 'sanifu', text: sanifuObservation(subject, sanifu), ...where });
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
      {mode !== 'edit' && (
        <blockquote className="rounded-lg border-l-4 border-amber-300 bg-amber-50 px-3 py-2 text-sm text-gray-800 whitespace-pre-wrap">
          {target.currentText || <span className="text-gray-400">(no text)</span>}
        </blockquote>
      )}
      <div role="tablist" className="flex gap-1 rounded-full border border-gray-200 p-1">
        {tab('edit', 'Edit')}
        {tab('ai', '✨ Ask AI')}
        {tab('learner', '💡 Note')}
      </div>

      {mode === 'edit' && (
        <>
          {fields.map((f, idx) => (
            <label key={f.key} className="block">
              <span className="text-sm font-semibold text-gray-800">
                {f.label}
                {idx === 0 && <span className="font-normal text-gray-400">{scope ? ' — goes live as soon as you save' : ' (optional)'}</span>}
              </span>
              {f.multiline ? (
                <textarea
                  value={values[f.key] ?? ''}
                  onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                  rows={f.lang === 'sw' && f.key === 'text' ? 3 : 2}
                  autoFocus={idx === 0}
                  placeholder={f.placeholder}
                  lang={f.lang === 'sw' ? 'sw' : 'en'}
                  className={field}
                />
              ) : (
                <input
                  value={values[f.key] ?? ''}
                  onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                  autoFocus={idx === 0}
                  placeholder={f.placeholder}
                  lang={f.lang === 'sw' ? 'sw' : 'en'}
                  className={field}
                />
              )}
            </label>
          ))}
          <label className="block">
            <span className="text-sm font-semibold text-gray-800">
              Context <span className="font-normal text-gray-400">(optional, but it helps)</span>
            </span>
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              rows={3}
              placeholder="e.g. Kenyans say “saa moja” for 7 o'clock (Swahili time) and “lisaa limoja” for a duration of one hour — keep them apart."
              className={field}
            />
            <span className="block mt-1 text-xs text-gray-500">
              The AI uses it to carry this change only to the places where it fits, to write a 💡 note for learners when it’s worth
              knowing, and adds it to the style guide the AI follows from now on.
            </span>
          </label>
          {others > 0 && (
            <label className="flex items-start gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={checkOthers} onChange={(e) => setCheckOthers(e.target.checked)} className="mt-0.5 accent-amber-500" />
              <span>
                Check the {others} other {others === 1 ? 'place' : 'places'} with “{plan.spans.map((x) => x.from).join('”, “')}”
                <span className="text-gray-400">
                  {' '}
                  — the AI changes only those with the same meaning and asks you (Admin → Activity) when it isn’t sure
                </span>
              </span>
            </label>
          )}
          {plan.unplaced.length > 0 && (
            <p className="text-xs text-amber-800">This text couldn’t be located in the content — it’s saved as a suggestion for review.</p>
          )}
          <button onClick={saveEdit} disabled={!plan.changed && !context.trim()} className={primary}>
            {plan.changed && scope ? 'Save & publish' : 'Save suggestion'}
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
                in the background — usually a minute or two — following the house rules and the style guide. It goes live by itself; you
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
        Claude rewrites the {what} in the background (a few minutes) following the house rules, the lesson's level and the style
        guide. It goes live by itself; undo any time under Admin → Activity.
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

// ---------- ✨ New lesson for a level ----------

function NewLessonModal({ level, onClose, onSubmit }: { level: number; onClose: () => void; onSubmit: (prompt: string) => void }) {
  const [prompt, setPrompt] = useState('');
  const info = levelInfo(level);
  const count = allLessons().filter((l) => l.level === level).length;
  const total = info.xp ?? 0;
  return (
    <Sheet title={`✨ New lesson · Level ${level}`} subtitle={`${info.emoji} ${info.name} — ${info.focus}`} onClose={onClose}>
      <label className="block">
        <span className="text-sm font-semibold text-gray-800">What should the lesson be about?</span>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={6}
          autoFocus
          placeholder="e.g. Buying airtime and data bundles at an M-Pesa kiosk: the learner asks for 100 bob of Safaricom credit, the attendant asks for the number, they talk about the price of a bundle and pay with M-Pesa."
          className={field}
        />
      </label>
      <ul className="text-xs text-gray-500 space-y-1 list-disc pl-4">
        <li>
          Claude writes the whole lesson in the background (a few minutes) — conversation, practice and key vocabulary — at
          this level’s grammar, following the style guide. It goes live by itself at the end of the level; undo any time
          under Admin → Activity.
        </li>
        <li>
          The level stays worth {total ? `${total} XP` : 'the same XP'}: with {count + 1} lessons each one is worth a bit less.
        </li>
        <li>Learners who already cleared this level aren’t sent back — for them it shows as ✨ New · optional.</li>
      </ul>
      <button onClick={() => onSubmit(prompt.trim())} disabled={!prompt.trim()} className={primary}>
        ✨ Write the lesson
      </button>
    </Sheet>
  );
}

// ---------- Activity & style guide ----------

/** A job still "working" after 8 minutes has died with its server function (timeout): stop waiting for it. */
const isStale = (j: AiJob) => j.status === 'working' && Date.now() - new Date(j.created_at).getTime() > 8 * 60 * 1000;

const STATUS: Record<AiJob['status'], { label: string; cls: string }> = {
  working: { label: 'Working…', cls: 'bg-amber-100 text-amber-800' },
  live: { label: 'Live', cls: 'bg-green-100 text-green-800' },
  review: { label: 'Your call', cls: 'bg-sky-100 text-sky-800' },
  failed: { label: 'Failed', cls: 'bg-red-100 text-red-700' },
  undone: { label: 'Undone', cls: 'bg-gray-100 text-gray-500' },
};

/** One place the AI wasn't sure about: before → after, its question, and the admin's yes / no. */
function QuestionCard({ q, onAnswer }: { q: FollowupQuestion; onAnswer: (yes: boolean) => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const answer = (yes: boolean) => {
    setBusy(true);
    void onAnswer(yes).finally(() => setBusy(false));
  };
  return (
    <div className="rounded-lg bg-sky-50 border border-sky-100 p-2.5 space-y-1.5">
      <p className="text-[11px] text-gray-500">
        {q.lessonTitle} · {q.kind === 'turn' ? 'dialogue line' : q.kind === 'practice' ? 'practice' : 'flashcard'}
      </p>
      <p className="text-sm text-gray-500 line-through decoration-gray-300">{q.before}</p>
      <p className="text-sm text-gray-900 font-medium">{q.after}</p>
      {q.reason && <p className="text-xs text-sky-900">❓ {q.reason}</p>}
      <div className="flex gap-2 pt-0.5">
        <button
          disabled={busy}
          onClick={() => answer(true)}
          className="rounded-full bg-amber-500 px-3 py-1 text-xs font-semibold text-white hover:bg-amber-600 disabled:opacity-40"
        >
          Change it
        </button>
        <button
          disabled={busy}
          onClick={() => answer(false)}
          className="rounded-full border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-white disabled:opacity-40"
        >
          Leave it
        </button>
      </div>
    </div>
  );
}

function ActivityModal({
  ops,
  jobs,
  onRetry,
  onUndo,
  onAnswer,
  onGuideChanged,
  onClose,
}: {
  ops: Op[];
  jobs: AiJob[];
  onRetry: (op: Op) => void;
  onUndo: (job: AiJob) => Promise<void>;
  onAnswer: (job: AiJob, q: FollowupQuestion, yes: boolean) => Promise<void>;
  onGuideChanged: () => void;
  onClose: () => void;
}) {
  const [notes, setNotes] = useState<GuidanceNote[] | null>(null);
  const [guide, setGuide] = useState<{ text: string; created_at: string } | null>(null);
  const [undone, setUndone] = useState(false);
  useEffect(() => {
    void listGuidance().then(setNotes);
    void loadStyleGuide().then(setGuide);
  }, []);
  const review = jobs.filter((j) => j.status === 'review' && j.questions?.length);
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
      {review.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-sky-700">❓ The AI needs your call</h3>
          {review.map((j) => (
            <div key={j.id} className="rounded-xl border border-sky-200 p-3 space-y-2">
              <p className="text-xs text-gray-500">{j.instruction}</p>
              {j.questions!.map((q) => (
                <QuestionCard key={q.ref} q={q} onAnswer={(yes) => onAnswer(j, q, yes)} />
              ))}
            </div>
          ))}
        </section>
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
                {j.scope === 'lesson' ? '' : `${j.lesson_id} · `}
                {j.scope === 'followup' ? 'Follow-up' : j.target_label ?? j.scope}
                {j.scope === 'followup' && j.target_label ? ` · ${j.target_label}` : ''}
              </span>
              <span className={`shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full ${isStale(j) ? STATUS.failed.cls : STATUS[j.status].cls}`}>
                {isStale(j) ? 'Timed out' : STATUS[j.status].label}
              </span>
            </div>
            <p className="text-sm text-gray-800">“{j.instruction}”</p>
            {j.summary && <p className="text-xs text-green-800">{j.summary}</p>}
            {j.error && <p className="text-xs text-red-600">{j.error}</p>}
            {(j.status === 'live' || j.status === 'review') && (
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
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Style guide (the AI follows it)</h3>
        <p className="text-xs text-gray-500">
          Built automatically in the background from your Context notes, 💡 notes and Sanifu forms. Learners don’t see it.
        </p>
        {guide ? (
          <details className="rounded-xl border border-gray-200 p-3">
            <summary className="cursor-pointer text-sm font-medium text-gray-800">
              Read the guide <span className="text-xs font-normal text-gray-400">· updated {new Date(guide.created_at).toLocaleString()}</span>
            </summary>
            <div className="mt-2 text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">{guide.text}</div>
          </details>
        ) : (
          <p className="text-sm text-gray-400">Not built yet — it appears after your next Context, note or Sanifu.</p>
        )}
        <details>
          <summary className="cursor-pointer text-xs font-semibold text-gray-500">What it’s built from ({notes?.length ?? '…'})</summary>
          <div className="mt-2 space-y-2">
            {notes?.map((n) => (
              <div key={n.id} className="flex items-start justify-between gap-2 text-sm">
                <p className="text-gray-700">
                  {n.text}
                  <span className="block text-xs text-gray-400">{[n.kind, n.lesson_id, n.target_label].filter(Boolean).join(' · ')}</span>
                </p>
                <button
                  aria-label="Remove from the style guide"
                  title="Remove from the style guide"
                  onClick={() =>
                    void retireGuidance(n.id).then((ok) => {
                      if (!ok) return;
                      setNotes((all) => all?.filter((x) => x.id !== n.id) ?? null);
                      onGuideChanged();
                    })
                  }
                  className="shrink-0 text-gray-300 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </details>
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
  const [newLessonLevel, setNewLessonLevel] = useState<number | null>(null);
  const [showActivity, setShowActivity] = useState(false);
  const [ops, setOps] = useState<Op[]>([]);
  const [jobs, setJobs] = useState<AiJob[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const liveSeen = useRef(new Set<string>());
  const swapsHandled = useRef(new Set<string>());
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

  const aiError = (e?: string) => (e === 'ai_not_configured' ? 'AI is not set up yet (missing ANTHROPIC_API_KEY on Vercel).' : e);

  const startFollowupRef = useRef<StartFollowup>(() => {});

  // The style guide is rewritten in the background a little after the last thing an editor said.
  const guideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleGuide = useCallback(() => {
    if (guideTimer.current) clearTimeout(guideTimer.current);
    guideTimer.current = setTimeout(() => {
      guideTimer.current = null;
      enqueue('Style guide · updating', async () => {
        const r = await rebuildStyleGuide();
        return { ok: r.ok, error: aiError(r.error) };
      });
    }, 20000);
  }, [enqueue]);
  const observe = useCallback<Observe>(
    (o) => {
      enqueue(`Style guide · ${o.kind ?? 'note'} · ${o.targetLabel ?? ''}`, async () => {
        const ok = await saveGuidance(o);
        if (ok) scheduleGuide();
        return { ok };
      });
    },
    [enqueue, scheduleGuide],
  );

  // An ✨ AI edit that swapped words ("hadi → mpaka"): check the other places by meaning, once.
  const handOverSwaps = useCallback(
    (list: AiJob[]) => {
      for (const j of list) {
        if (j.status !== 'live' || !j.pending_swaps?.length || swapsHandled.current.has(j.id)) continue;
        if (j.created_by && userId && j.created_by !== userId) continue;
        swapsHandled.current.add(j.id);
        const lesson = scopeContent('lesson', j.lesson_id) as Lesson | undefined;
        const spans = j.pending_swaps;
        void clearPendingSwaps(j.id).then((ok) => {
          if (!ok || !lesson) return;
          const candidates = findCandidates(allLessons(), spans, j.item_id ?? undefined);
          if (!candidates.length) return;
          startFollowupRef.current({
            lessonId: j.lesson_id,
            lessonTitle: lesson.title,
            itemId: j.item_id ?? undefined,
            itemKind: null,
            targetLabel: j.target_label ?? undefined,
            changes: spans.map((x) => ({ label: 'Word', lang: 'sw' as const, before: x.from, after: x.to })),
            context: j.instruction,
            spans,
            makeNote: false,
            candidates,
            source: 'ai',
          });
        });
      }
    },
    [userId],
  );

  const refreshJobs = useCallback(async () => {
    const list = await listAiJobs();
    setJobs(list);
    // Newly finished AI edits / follow-ups: load what they wrote so it shows without a reload.
    const fresh = list.filter((j) => (j.status === 'live' || j.status === 'review') && !liveSeen.current.has(j.id));
    for (const j of list) if (j.status === 'live' || j.status === 'review') liveSeen.current.add(j.id);
    if (fresh.length) {
      const lessonJobs = fresh.filter((j) => j.scope === 'lesson').map((j) => j.id);
      if (lessonJobs.length) addAiLessons(await loadJobLessons(lessonJobs));
      const rows = await loadJobPatches(fresh.map((j) => j.id));
      if (rows.length) addPatches(rows);
    }
    handOverSwaps(list);
    return { list, fresh };
  }, [handOverSwaps]);

  // First load: remember which jobs were already done (their patches load with the content).
  useEffect(() => {
    if (!effectiveAdmin) return;
    void listAiJobs().then((list) => {
      for (const j of list) if (j.status === 'live' || j.status === 'review') liveSeen.current.add(j.id);
      setJobs(list);
      handOverSwaps(list);
    });
  }, [effectiveAdmin, handOverSwaps]);

  // Poll while any AI edit is still working.
  const working = jobs.filter((j) => j.status === 'working' && !isStale(j)).length;
  useEffect(() => {
    if (!working) return;
    const t = setInterval(() => {
      void refreshJobs().then(({ fresh }) => {
        const asks = fresh.reduce((n, j) => n + (j.status === 'review' ? j.questions?.length ?? 0 : 0), 0);
        if (asks) setToast(`❓ The AI needs your call on ${asks} ${asks === 1 ? 'place' : 'places'} — tap to answer`);
        else if (fresh.length) setToast(`✨ Live: ${fresh[0].summary ?? 'AI edit published'}`);
      });
    }, 8000);
    return () => clearInterval(t);
  }, [working, refreshJobs]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), toast.startsWith('❓') ? 15000 : 7000);
    return () => clearTimeout(t);
  }, [toast]);

  const startAi = useCallback<StartAi>(
    (input) => {
      enqueue(`✨ AI · ${input.targetLabel ?? input.scope}`, async () => {
        const res = await submitAiEdit(input);
        if (res.ok) await refreshJobs();
        return { ok: res.ok, error: aiError(res.error) };
      });
    },
    [enqueue, refreshJobs],
  );

  const startFollowup = useCallback<StartFollowup>(
    (input, regloss) => {
      const label = input.candidates.length
        ? `✨ AI · checking ${input.candidates.length} other ${input.candidates.length === 1 ? 'place' : 'places'}`
        : '✨ AI · learner note';
      enqueue(regloss ? `✨ AI · tooltips + ${label.replace('✨ AI · ', '')}` : label, async () => {
        let afterJobId: string | undefined;
        if (regloss) {
          const r = await submitAiEdit(regloss);
          if (!r.ok) return { ok: false, error: aiError(r.error) };
          afterJobId = r.jobId;
        }
        const res = await submitFollowup({ ...input, afterJobId });
        await refreshJobs();
        return { ok: res.ok, error: aiError(res.error) };
      });
    },
    [enqueue, refreshJobs],
  );
  useEffect(() => {
    startFollowupRef.current = startFollowup;
  }, [startFollowup]);

  const onAnswer = useCallback(
    async (job: AiJob, q: FollowupQuestion, yes: boolean) => {
      const res = await answerQuestion(job, q, yes);
      if (res.patch) addPatches([res.patch]);
      await refreshJobs();
    },
    [refreshJobs],
  );

  const writeLesson = useCallback(
    (level: number, prompt: string) => {
      const info = levelInfo(level);
      const inLevel = allLessons().filter((l) => l.level === level);
      const order = Math.max(level * 100, ...inLevel.map((l) => l.order ?? 0)) + 1;
      enqueue(`✨ AI · new lesson · Level ${level}`, async () => {
        const res = await submitAiLesson({
          level,
          levelName: info.name,
          levelFocus: info.focus,
          order,
          prompt,
          existing: inLevel.map((l) => ({ title: l.title, theme: l.theme, vocabulary: l.vocabulary.map((v) => v.swahili) })),
        });
        if (res.ok) await refreshJobs();
        return { ok: res.ok, error: aiError(res.error) };
      });
    },
    [enqueue, refreshJobs],
  );

  const openSuggest = useCallback((t: SuggestTarget) => setTarget(t), []);
  const openNewLesson = useCallback((level: number) => setNewLessonLevel(level), []);
  const openDirect = useCallback((lessonId: string, scope: 'dialogue' | 'practice') => setDirect({ lessonId, scope }), []);
  const openActivity = useCallback(() => setShowActivity(true), []);
  const activity = useMemo(
    () => ({
      saving: ops.filter((o) => o.status === 'saving').length,
      working,
      failed: ops.filter((o) => o.status === 'failed').length + jobs.filter((j) => j.status === 'failed' && !ackFailed.includes(j.id)).length,
      questions: jobs.reduce((n, j) => n + (j.status === 'review' ? j.questions?.length ?? 0 : 0), 0),
    }),
    [ops, working, jobs, ackFailed],
  );
  const value = useMemo(
    () => ({ isAdmin: effectiveAdmin, openSuggest, openDirect, openActivity, openNewLesson, activity }),
    [effectiveAdmin, openSuggest, openDirect, openActivity, openNewLesson, activity],
  );

  return (
    <AdminContext.Provider value={value}>
      {children}
      {target && (
        <SuggestModal
          target={target}
          onClose={() => setTarget(null)}
          enqueue={enqueue}
          startAi={startAi}
          startFollowup={startFollowup}
          observe={observe}
        />
      )}
      {newLessonLevel !== null && (
        <NewLessonModal
          level={newLessonLevel}
          onClose={() => setNewLessonLevel(null)}
          onSubmit={(prompt) => {
            writeLesson(newLessonLevel, prompt);
            setNewLessonLevel(null);
          }}
        />
      )}
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
          onAnswer={onAnswer}
          onGuideChanged={scheduleGuide}
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
