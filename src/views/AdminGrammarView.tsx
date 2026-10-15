import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { GrammarTopic } from '../types';
import { useAdmin } from '../components/adminContext';
import { Block } from '../components/GrammarModal';
import { RichText } from '../components/RichText';
import { getGrammarTopic, getGrammarTopics, isShippedGrammar, shippedGrammar } from '../hooks/useGrammar';
import { useLessons } from '../hooks/useLessons';
import { useOverridesVersion } from '../lib/contentOverrides';
import { LEVELS } from '../lib/levels';
import {
  BLOCK_LABELS,
  blockToDraft,
  discardDraft,
  deleteTopic,
  draftToBlock,
  draftWithAi,
  emptyTopic,
  examplesToText,
  listToText,
  loadStudioRows,
  problems,
  publishTopic,
  saveDraft,
  slugify,
  textToExamples,
  textToList,
  unpublishTopic,
  type BlockDraft,
  type BlockType,
  type StudioRow,
} from '../lib/grammarStudio';

const btn = 'px-4 py-2 rounded-full text-sm font-semibold disabled:opacity-40';
const btnPrimary = `${btn} bg-green-700 text-white hover:bg-green-800`;
const btnGhost = `${btn} border border-gray-300 text-gray-700 hover:bg-gray-50`;
const input = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100';
const label = 'block text-xs font-semibold text-gray-600 mb-1';

function useStudioRows() {
  const [rows, setRows] = useState<StudioRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  useEffect(() => {
    let alive = true;
    loadStudioRows().then((r) => {
      if (!alive) return;
      if (r.ok) {
        setRows(r.value);
        setError(null);
      } else {
        // Still let the admin work from the live version; saving will say what's wrong.
        setRows((cur) => cur ?? []);
        setError(r.error);
      }
    });
    return () => {
      alive = false;
    };
  }, [nonce]);
  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return { rows, error, reload };
}

function AdminOnly({ children }: { children: React.ReactNode }) {
  const { isAdmin } = useAdmin();
  if (!isAdmin) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center text-sm text-gray-500">
        The grammar studio is for admins. <Link to="/" className="text-green-700">← Lessons</Link>
      </div>
    );
  }
  return <>{children}</>;
}

/** /admin/grammar and /admin/grammar/:slug */
export function AdminGrammarView() {
  const { slug } = useParams<{ slug?: string }>();
  return <AdminOnly>{slug ? <GrammarEditor key={slug} slug={slug} /> : <GrammarStudioList />}</AdminOnly>;
}

// ---------------------------------------------------------------- list

type Status = { label: string; tone: string };

function statusOf(slug: string, row: StudioRow | undefined): Status[] {
  const out: Status[] = [];
  const shipped = isShippedGrammar(slug);
  out.push(shipped ? { label: 'Shipped', tone: 'bg-gray-100 text-gray-600' } : { label: 'New', tone: 'bg-sky-100 text-sky-800' });
  if (row?.published) out.push({ label: shipped ? 'Reworked · live' : 'Live', tone: 'bg-green-100 text-green-800' });
  else if (!shipped) out.push({ label: 'Not live', tone: 'bg-gray-100 text-gray-500' });
  if (row?.draft) out.push({ label: 'Draft pending', tone: 'bg-amber-100 text-amber-800' });
  return out;
}

function GrammarStudioList() {
  useOverridesVersion();
  const { rows, error } = useStudioRows();
  const bySlug = useMemo(() => new Map((rows ?? []).map((r) => [r.slug, r])), [rows]);
  const live = getGrammarTopics();
  // Drafts of new sections aren't in the live guide yet.
  const draftsOnly = (rows ?? []).filter((r) => !r.published && r.draft && !getGrammarTopic(r.slug));
  const all: Array<{ slug: string; title: string; level: number }> = [
    ...live.map((t) => ({ slug: t.slug, title: t.title, level: t.level })),
    ...draftsOnly.map((r) => ({ slug: r.slug, title: r.draft!.title || r.slug, level: r.draft!.level })),
  ];
  const levels = [...new Set(all.map((t) => t.level))].sort((a, b) => a - b);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6 pb-16">
      <div>
        <Link to="/grammar" className="text-sm text-gray-400 hover:text-gray-600">
          ← Grammar guide
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-gray-900">Grammar studio</h1>
          <Link to="/admin/grammar/new" className={btnPrimary}>
            ＋ New grammar section
          </Link>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          Draft new sections or rework existing ones. A draft is only visible here; <strong>Publish</strong> puts it live in the
          grammar guide and in the lessons you link it to.
        </p>
      </div>
      {error && <p className="text-sm text-red-600">Couldn’t load the studio: {error}</p>}
      {levels.map((lvl) => (
        <section key={lvl}>
          <h2 className="text-xs uppercase tracking-wide text-gray-400 font-semibold mb-2">
            Level {lvl} · {LEVELS.find((l) => l.level === lvl)?.name}
          </h2>
          <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
            {all
              .filter((t) => t.level === lvl)
              .map((t) => (
                <li key={t.slug}>
                  <Link to={`/admin/grammar/${t.slug}`} className="flex flex-wrap items-center gap-2 px-4 py-3 hover:bg-gray-50">
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-medium text-gray-900 truncate">{t.title}</span>
                      <span className="block text-xs text-gray-400">/grammar/{t.slug}</span>
                    </span>
                    {statusOf(t.slug, bySlug.get(t.slug)).map((s) => (
                      <span key={s.label} className={`text-[11px] font-semibold rounded-full px-2 py-0.5 ${s.tone}`}>
                        {s.label}
                      </span>
                    ))}
                  </Link>
                </li>
              ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- editor

interface Form {
  slug: string;
  title: string;
  swahiliTitle: string;
  level: number;
  summary: string;
  blocks: BlockDraft[];
  examples: string;
  related: string[];
  tags: string;
  lessons: string[];
}

function toForm(t: GrammarTopic, lessons: string[]): Form {
  return {
    slug: t.slug,
    title: t.title,
    swahiliTitle: t.swahiliTitle ?? '',
    level: t.level,
    summary: t.summary,
    blocks: t.blocks.map(blockToDraft),
    examples: examplesToText(t.examples),
    related: [...t.related],
    tags: listToText(t.tags),
    lessons: t.lessons ?? lessons,
  };
}

function toTopic(f: Form): GrammarTopic {
  return {
    slug: f.slug.trim(),
    level: f.level,
    title: f.title,
    swahiliTitle: f.swahiliTitle,
    summary: f.summary,
    blocks: f.blocks.map(draftToBlock).filter((b): b is NonNullable<typeof b> => Boolean(b)),
    examples: textToExamples(f.examples),
    related: f.related,
    tags: textToList(f.tags),
    lessons: f.lessons,
  };
}

const BLOCK_HELP: Record<BlockType, string> = {
  p: 'Plain text. **bold** for the Swahili you teach, *italics* for example phrases.',
  list: 'One bullet per line.',
  table: 'First line: the column headers. Then one row per line. Separate cells with  |',
  tip: 'One practical tip — shown in a green box.',
  sanifu: 'The standard (Sanifu) form, where Kenyans say it differently — shown in a blue box.',
};

function GrammarEditor({ slug }: { slug: string }) {
  useOverridesVersion();
  const navigate = useNavigate();
  const lessons = useLessons();
  const { rows, reload } = useStudioRows();
  const isNewRoute = slug === 'new';
  const row = rows?.find((r) => r.slug === slug);
  const shipped = !isNewRoute && isShippedGrammar(slug);
  const teaching = useMemo(() => lessons.filter((l) => l.grammarFocus?.includes(slug)).map((l) => l.id), [lessons, slug]);

  // Start from the pending draft, else the live version, else a blank section.
  const initial = useMemo<Form | null>(() => {
    if (!isNewRoute && rows === null) return null;
    const base = row?.draft ?? (isNewRoute ? null : getGrammarTopic(slug)) ?? null;
    return base ? toForm(structuredClone(base), teaching) : toForm(emptyTopic(), []);
  }, [rows, row, slug, isNewRoute, teaching]);
  const [edited, setForm] = useState<Form | null>(null);
  const form = edited ?? initial;
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [aiPrompt, setAiPrompt] = useState('');
  const [view, setView] = useState<'edit' | 'preview'>('edit');


  if (!form) return <div className="max-w-3xl mx-auto px-4 py-16 text-center text-gray-500">Loading…</div>;
  if (!isNewRoute && rows !== null && !row && !getGrammarTopic(slug)) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center text-sm text-gray-500">
        No grammar section at “{slug}”. <Link to="/admin/grammar" className="text-green-700">← Grammar studio</Link>
      </div>
    );
  }

  const update = (patch: Partial<Form>) => {
    setForm((f) => {
      const cur = f ?? initial;
      return cur ? { ...cur, ...patch } : cur;
    });
    setDirty(true);
    setMsg(null);
  };
  const setBlock = (i: number, patch: Partial<BlockDraft>) =>
    update({ blocks: form.blocks.map((b, j) => (j === i ? { ...b, ...patch } : b)) });
  const moveBlock = (i: number, d: -1 | 1) => {
    const bs = [...form.blocks];
    const j = i + d;
    if (j < 0 || j >= bs.length) return;
    [bs[i], bs[j]] = [bs[j], bs[i]];
    update({ blocks: bs });
  };

  const topic = toTopic(form);
  const isNew = isNewRoute || !shipped;
  const slugLocked = !isNewRoute && Boolean(row?.published || shipped || row);
  const taken = isNewRoute ? [...getGrammarTopics().map((t) => t.slug), ...(rows ?? []).map((r) => r.slug)] : [];
  const draftIssues = problems(topic, { forPublish: false, takenSlugs: taken });
  const publishIssues = problems(topic, { forPublish: true, takenSlugs: taken });

  async function run(what: string, fn: () => Promise<{ ok: boolean; error?: string }>, done: string, after?: () => void) {
    setBusy(what);
    setMsg(null);
    const r = await fn();
    setBusy(null);
    if (!r.ok) return setMsg({ ok: false, text: r.error ?? 'Something went wrong.' });
    setMsg({ ok: true, text: done });
    setDirty(false);
    reload();
    after?.();
  }

  const goToSlug = () => {
    if (isNewRoute) navigate(`/admin/grammar/${topic.slug}`, { replace: true });
  };

  async function askAi() {
    if (!aiPrompt.trim()) return;
    if (dirty && !window.confirm('Replace what you have written with the AI draft?')) return;
    setBusy('ai');
    setMsg(null);
    // A new section is drafted from scratch; an existing one is reworked from what's in the form.
    const r = await draftWithAi({ prompt: aiPrompt, level: form!.level, ...(isNewRoute ? {} : { base: topic }) });
    setBusy(null);
    if (!r.ok) return setMsg({ ok: false, text: r.error });
    const t = r.value;
    setForm(toForm(isNewRoute ? t : { ...t, slug: form!.slug }, form!.lessons));
    setDirty(true);
    setMsg({ ok: true, text: 'The AI drafted this — read it through, edit, then save the draft or publish.' });
  }

  const allTopics = getGrammarTopics().filter((t) => t.slug !== topic.slug);
  const lessonsByLevel = LEVELS.map((l) => ({ level: l, lessons: lessons.filter((x) => x.level === l.level) })).filter((g) => g.lessons.length);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-5 pb-24">
      <div>
        <Link to="/admin/grammar" className="text-sm text-gray-400 hover:text-gray-600">
          ← Grammar studio
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold text-gray-900 mr-auto">{isNewRoute ? 'New grammar section' : form.title || slug}</h1>
          {!isNewRoute &&
            statusOf(slug, row).map((s) => (
              <span key={s.label} className={`text-[11px] font-semibold rounded-full px-2 py-0.5 ${s.tone}`}>
                {s.label}
              </span>
            ))}
        </div>
      </div>

      <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-2">
        <label htmlFor="ai-prompt" className="block text-sm font-semibold text-amber-900">
          ✨ {isNewRoute ? 'Draft it with AI' : 'Rework it with AI'}
        </label>
        <textarea
          id="ai-prompt"
          value={aiPrompt}
          onChange={(e) => setAiPrompt(e.target.value)}
          rows={2}
          placeholder={
            isNewRoute
              ? 'e.g. The -ki- of "if / when" (nikifika, ukija) for level 8 — contrast it with -po-.'
              : 'e.g. Add a table of the negative forms, and a tip about how Kenyans shorten them.'
          }
          className={`${input} bg-white`}
        />
        <div className="flex items-center gap-2">
          <button type="button" onClick={askAi} disabled={!aiPrompt.trim() || busy !== null} className={`${btn} bg-amber-500 text-white hover:bg-amber-600`}>
            {busy === 'ai' ? 'Writing… (up to a minute)' : isNewRoute ? 'Draft it' : 'Rework it'}
          </button>
          <span className="text-xs text-amber-800/80">The AI fills in the form below — nothing is saved until you save or publish.</span>
        </div>
      </section>

      <div className="flex gap-1 lg:hidden" role="tablist">
        {(['edit', 'preview'] as const).map((v) => (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={view === v}
            onClick={() => setView(v)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium ${view === v ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            {v === 'edit' ? 'Edit' : 'Preview'}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2 items-start">
        {/* ---- form ---- */}
        <div className={`space-y-5 ${view === 'preview' ? 'hidden lg:block' : ''}`} data-testid="grammar-form">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="g-title" className={label}>Title</label>
              <input
                id="g-title"
                value={form.title}
                onChange={(e) => update({ title: e.target.value, ...(isNewRoute && !slugLocked ? { slug: slugify(e.target.value) } : {}) })}
                className={input}
                placeholder='e.g. "If / When": -ki- and -po-'
              />
            </div>
            <div>
              <label htmlFor="g-sw" className={label}>Swahili title (optional)</label>
              <input id="g-sw" value={form.swahiliTitle} onChange={(e) => update({ swahiliTitle: e.target.value })} className={input} />
            </div>
            <div>
              <label htmlFor="g-level" className={label}>Level</label>
              <select id="g-level" value={form.level} onChange={(e) => update({ level: Number(e.target.value) })} className={`${input} bg-white`}>
                {LEVELS.map((l) => (
                  <option key={l.level} value={l.level}>
                    {l.level} · {l.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="g-slug" className={label}>Web address</label>
              <div className="flex items-center gap-1 text-sm text-gray-400">
                /grammar/
                <input
                  id="g-slug"
                  value={form.slug}
                  readOnly={slugLocked}
                  onChange={(e) => update({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
                  className={`${input} ${slugLocked ? 'bg-gray-50 text-gray-500' : ''}`}
                />
              </div>
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="g-summary" className={label}>Summary — the whole idea in one or two sentences</label>
              <textarea id="g-summary" value={form.summary} onChange={(e) => update({ summary: e.target.value })} rows={3} className={input} />
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-sm font-bold text-gray-900">Explanation</h2>
            {form.blocks.map((b, i) => (
              <div key={i} className="rounded-xl border border-gray-200 bg-white p-3 space-y-2" data-testid="block-editor">
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    aria-label={`Block ${i + 1} type`}
                    value={b.type}
                    onChange={(e) => setBlock(i, { type: e.target.value as BlockType })}
                    className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs font-semibold"
                  >
                    {(Object.keys(BLOCK_LABELS) as BlockType[]).map((t) => (
                      <option key={t} value={t}>
                        {BLOCK_LABELS[t]}
                      </option>
                    ))}
                  </select>
                  <span className="text-[11px] text-gray-400 mr-auto">{BLOCK_HELP[b.type]}</span>
                  <button type="button" onClick={() => moveBlock(i, -1)} disabled={i === 0} className="text-xs text-gray-500 disabled:opacity-30" aria-label="Move up">
                    ↑
                  </button>
                  <button type="button" onClick={() => moveBlock(i, 1)} disabled={i === form.blocks.length - 1} className="text-xs text-gray-500 disabled:opacity-30" aria-label="Move down">
                    ↓
                  </button>
                  <button type="button" onClick={() => update({ blocks: form.blocks.filter((_, j) => j !== i) })} className="text-xs text-red-500 hover:text-red-700" aria-label="Remove block">
                    ✕
                  </button>
                </div>
                {b.type === 'table' && (
                  <input value={b.caption ?? ''} onChange={(e) => setBlock(i, { caption: e.target.value })} placeholder="Caption (optional), e.g. kuenda → -ende" className={input} />
                )}
                <textarea
                  aria-label={`Block ${i + 1} text`}
                  value={b.text}
                  onChange={(e) => setBlock(i, { text: e.target.value })}
                  rows={b.type === 'p' ? 3 : b.type === 'table' || b.type === 'list' ? 5 : 2}
                  className={`${input} ${b.type === 'table' ? 'font-mono text-xs' : ''}`}
                />
              </div>
            ))}
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(BLOCK_LABELS) as BlockType[]).map((t) => (
                <button key={t} type="button" onClick={() => update({ blocks: [...form.blocks, { type: t, text: '' }] })} className="text-xs rounded-full border border-dashed border-gray-300 px-3 py-1 text-gray-600 hover:border-green-500 hover:text-green-800">
                  ＋ {BLOCK_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="g-examples" className={label}>Examples — one per line: Swahili | English | note (optional)</label>
            <textarea
              id="g-examples"
              value={form.examples}
              onChange={(e) => update({ examples: e.target.value })}
              rows={5}
              placeholder="Nikifika, nitakupigia. | When I arrive, I'll call you."
              className={`${input} font-mono text-xs`}
            />
          </div>

          <div>
            <p className={label}>Related sections</p>
            <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
              {allTopics.map((t) => {
                const on = form.related.includes(t.slug);
                return (
                  <button
                    key={t.slug}
                    type="button"
                    aria-pressed={on}
                    onClick={() => update({ related: on ? form.related.filter((s) => s !== t.slug) : [...form.related, t.slug] })}
                    className={`text-[11px] rounded-full border px-2 py-0.5 ${on ? 'border-green-700 bg-green-700 text-white' : 'border-gray-200 text-gray-600 hover:border-green-400'}`}
                  >
                    {t.title.split(':')[0]}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label htmlFor="g-tags" className={label}>Tags (comma separated)</label>
            <input id="g-tags" value={form.tags} onChange={(e) => update({ tags: e.target.value })} className={input} placeholder="verbs, moods" />
          </div>

          <div>
            <p className={label}>Taught in these lessons — shown under “The grammar you’ll learn”</p>
            <div className="max-h-64 overflow-y-auto rounded-lg border border-gray-200 bg-white p-2 space-y-2">
              {lessonsByLevel.map((g) => (
                <div key={g.level.level}>
                  <p className="text-[11px] font-semibold text-gray-400">Level {g.level.level}</p>
                  {g.lessons.map((l) => (
                    <label key={l.id} className="flex items-center gap-2 text-sm text-gray-700 py-0.5">
                      <input
                        type="checkbox"
                        checked={form.lessons.includes(l.id)}
                        onChange={(e) => update({ lessons: e.target.checked ? [...form.lessons, l.id] : form.lessons.filter((x) => x !== l.id) })}
                      />
                      {l.title}
                    </label>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ---- preview ---- */}
        <div className={`lg:sticky lg:top-4 ${view === 'edit' ? 'hidden lg:block' : ''}`}>
          <p className="text-xs uppercase tracking-wide text-gray-400 font-semibold mb-2">Preview · as learners see it</p>
          <GrammarPreview topic={topic} />
        </div>
      </div>

      {/* ---- actions ---- */}
      <div className="sticky bottom-0 -mx-4 px-4 py-3 bg-white/95 backdrop-blur border-t border-gray-200 space-y-2">
        {msg && <p className={`text-sm ${msg.ok ? 'text-green-700' : 'text-red-600'}`}>{msg.text}</p>}
        {(draftIssues.length > 0 || publishIssues.length > 0) && (
          <ul className="text-xs text-amber-800 list-disc pl-4">
            {[...new Set([...draftIssues, ...publishIssues])].map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={busy !== null || draftIssues.length > 0}
            onClick={() => run('save', () => saveDraft(topic, isNew), 'Draft saved — only admins can see it here.', goToSlug)}
            className={btnGhost}
          >
            {busy === 'save' ? 'Saving…' : 'Save draft'}
          </button>
          <button
            type="button"
            disabled={busy !== null || publishIssues.length > 0}
            onClick={() => {
              if (!window.confirm(`Publish “${topic.title}” for every learner?`)) return;
              void run('publish', () => publishTopic(topic, isNew), 'Published — it’s live in the grammar guide and the lessons you picked.', goToSlug);
            }}
            className={btnPrimary}
          >
            {busy === 'publish' ? 'Publishing…' : 'Publish'}
          </button>
          {row?.draft && (
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => {
                if (!window.confirm('Throw away the draft?')) return;
                void run('discard', () => discardDraft(slug), 'Draft discarded.', () => {
                  const live = getGrammarTopic(slug);
                  if (live) setForm(toForm(structuredClone(live), teaching));
                  else navigate('/admin/grammar');
                });
              }}
              className={btnGhost}
            >
              Discard draft
            </button>
          )}
          {row?.published && (
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => {
                const q = shipped
                  ? 'Take your version off the air and go back to the shipped wording?'
                  : `Take “${topic.title}” off the air? Learners won't see it any more (you can publish it again).`;
                if (!window.confirm(q)) return;
                void run('unpublish', () => unpublishTopic(slug), shipped ? 'Back to the shipped wording.' : 'Unpublished.', () => {
                  if (shipped) setForm(toForm(shippedGrammar(slug)!, teaching));
                });
              }}
              className={`${btn} text-red-600 hover:bg-red-50`}
            >
              {shipped ? 'Restore shipped version' : 'Unpublish'}
            </button>
          )}
          {row && !row.published && !shipped && (
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => {
                if (!window.confirm(`Delete “${topic.title || slug}” for good?`)) return;
                void run('delete', () => deleteTopic(slug), 'Deleted.', () => navigate('/admin/grammar'));
              }}
              className={`${btn} text-red-600 hover:bg-red-50`}
            >
              Delete
            </button>
          )}
          {dirty && <span className="text-xs text-gray-400">Unsaved changes</span>}
        </div>
      </div>
    </div>
  );
}

/** The section rendered the way the grammar explainer shows it. */
export function GrammarPreview({ topic }: { topic: GrammarTopic }) {
  return (
    <article className="rounded-xl border border-gray-200 bg-white p-5 space-y-4" data-testid="grammar-preview">
      <div>
        <p className="text-xs text-gray-400">📘 Grammar · Level {topic.level}</p>
        <h2 className="text-lg font-bold text-gray-900 leading-snug">{topic.title || 'Untitled section'}</h2>
        {topic.swahiliTitle && <p className="text-sm text-gray-500 italic">{topic.swahiliTitle}</p>}
      </div>
      {topic.summary && (
        <p className="text-gray-900 font-medium">
          <RichText text={topic.summary} />
        </p>
      )}
      {topic.blocks.map((b, i) => (
        <Block key={i} block={b} />
      ))}
      {topic.examples.length > 0 && (
        <section>
          <h3 className="text-xs uppercase tracking-wide text-gray-400 font-semibold mb-2">Examples</h3>
          <ul className="space-y-2">
            {topic.examples.map((ex, i) => (
              <li key={i} className="rounded-lg bg-gray-50 px-3 py-2">
                <p className="font-semibold text-gray-900">{ex.swahili}</p>
                <p className="text-sm text-gray-600">{ex.english}</p>
                {ex.note && <p className="text-xs text-gray-400 mt-0.5">{ex.note}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
