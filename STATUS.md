# Swahili ya Kenya — Status Quo

A snapshot of what the prototype is, what it does today, and how it's put together. Written as the baseline for the next round of development.

---

## 1. Concept

**Swahili ya Kenya** is a learning app for *spoken Kenyan Swahili* — the everyday register actually used on the streets of Nairobi, Mombasa, Kisumu — as opposed to the textbook *sanifu* (standard) Swahili that most learning resources teach.

The pedagogical bet is that learners who plan to *use* Swahili in Kenya are better served by:

1. **Situational modules** anchored in real Kenyan contexts (matatus, chai kiosks, M-Pesa transactions, hospital visits, hustles), rather than abstract grammar drills.
2. **Showing both registers side by side** — the Kenyan colloquial form is primary, but a "Sanifu →" disclosure on every vocab item, exchange line, and flashcard reveals the standard equivalent and a short note explaining the difference. This lets learners code-switch and gives them grammar context without burying the colloquial form.
3. **Spaced repetition over the colloquial vocabulary** so the everyday phrases (e.g. *"Nashuka hapa"*, *"Niletee chai"*) actually stick.

The intended user is an adult learner — expat, traveler, returning diaspora, or curious Swahili student — who already knows or doesn't mind learning that "real" Kenyan Swahili diverges from the textbook.

---

## 2. What the App Does Today

The prototype is a single-page React app with three top-level surfaces:

### 2.1 Catalog (`/`)
- Lists all available modules as cards.
- Filterable by **category** (transport, food & drink, commerce, health, work & admin, social) and **difficulty** (beginner / intermediate / advanced).
- Each card shows title, category pill, difficulty pill (color-coded), and a status indicator if the module has been started or reviewed.
- Tagline: *"Learn Swahili as it's actually spoken in Kenya."*

### 2.2 Module (`/module/:id`)
A single module page with five sections, top to bottom:
1. **Header** — title, difficulty label, back-to-catalog link.
2. **Context** — a cultural note explaining the situation (e.g. how matatus actually work, what a *kibanda* is).
3. **Vocabulary** — a list of `VocabEntry` items. Each shows the Kenyan form, English gloss, and a one-line *exampleContext*. A "Sanifu →" toggle reveals the standard form and a note about the divergence.
4. **Example exchange** — a short scripted dialogue (`ExchangeLine[]`) showing the vocab in use. Speakers are labeled (e.g. *Mteja* / *Mama ntilie*). Sanifu disclosure works per-line where provided.
5. **Exercises** — a sequence of three exercise types (see §2.4). Each exercise highlights green when completed.
6. **"Add to review" gate** — disabled until **all** exercises are completed; on click, every vocab item in the module is seeded as a fresh SRS card and the module is marked `reviewed`.

### 2.3 Review (`/review`)
- Pulls all SRS cards across all modules where `nextReview <= today`, snapshots them at session start (so newly-rescheduled cards don't re-appear in the same session), and walks through them one by one.
- Each card shows the Kenyan Swahili front; click to reveal the English meaning, example context, and (optionally) the sanifu form.
- Three rating buttons: **forgot** / **hard** / **easy** — these feed an SM-2-style scheduling algorithm.
- Progress indicator (`n / total`), an Exit link, and a "Session complete" screen at the end.
- Empty state: "No cards due for review."
- The nav bar shows a red badge with the live due count, recomputed on every route change.

### 2.4 Exercise types
- **Fill-blank** — text input, exact-match check (case-insensitive, trimmed), Enter to submit. Locks once correct.
- **Match** — sequential matching: shown one Swahili term, pick the right English from 4 options (1 correct + 3 distractors drawn from the same exercise's pairs). Auto-advances on correct after 600 ms; lets you retry on wrong.
- **Translate** — open-ended free-text translation. Self-graded: type your attempt, click "Reveal answer" to see the expected version, then click "Got it" to mark complete. (No automated grading — by design, since translation is open-ended.)

### 2.5 Persistence
Everything lives in `localStorage`. There is no backend, no auth, no account.
- `ksa_progress` → per-module `{ status, addedToReview, lastReviewed }`.
- `ksa_srs` → per-card `{ interval, easeFactor, repetitions, nextReview }`, keyed by `${moduleId}:${vocabIndex}`.

---

## 3. Content

Currently **two modules**, both beginner-level:

| ID | Title | Category | Vocab | Exchange | Exercises |
|---|---|---|---|---|---|
| `chai-kiosk` | Ordering Chai at a Kiosk | food-drink | 7 | 6 lines | 3 |
| `matatu-nairobi` | Taking a Matatu | transport | ~7 | varies | 3 |

Modules are authored as standalone JSON files under `content/modules/*.json` and bulk-loaded at build time via `import.meta.glob`. Adding a module = dropping a new JSON file in that directory. No code changes, no registry update.

The vocab/exchange entries already model the Kenyan↔Sanifu divergence as first-class fields (`sanifu` + `sanifuNote`), so the content layer is doing the pedagogical work the app design promised.

---

## 4. Architecture

### 4.1 Stack
- **Vite 8** + **React 19** + **TypeScript 5.9**, strict mode.
- **react-router-dom 7** for client-side routing.
- **Tailwind 3** for styling — utility classes only, no custom CSS beyond `index.css` resets.
- **Vitest 4** + **@testing-library/react** + **jsdom** for unit and component tests.
- **ESLint 9** with the standard React/Hooks plugin set.

No backend, no API client, no state management library. State is local component state + `localStorage` reads on demand.

### 4.2 Directory layout
```
content/modules/         JSON content files (data-driven module authoring)
public/                  Static assets (favicon, icons sprite)
src/
  App.tsx                Router shell + nav due-count wiring
  main.tsx               Entry point
  types.ts               All shared types (Module, VocabEntry, Exercise, CardState, …)
  srs.ts                 SM-2 scheduling pure functions (todayString, scheduleCard, isDue)
  storage.ts             localStorage read/write helpers (typed JSON wrappers)
  views/
    CatalogView.tsx      Module list + filters
    ModuleView.tsx       Single-module learning page
    ReviewView.tsx       SRS review session runner
  components/
    Nav.tsx              Top nav with live due-count badge
    ModuleCard.tsx       Catalog card
    VocabEntry.tsx       Vocab row with sanifu disclosure
    ExchangeLine.tsx     Dialogue line with sanifu disclosure
    Flashcard.tsx        Review-mode card (flip + rate)
    ExerciseFillBlank.tsx
    ExerciseMatch.tsx
    ExerciseTranslate.tsx
  hooks/
    useModules.ts        Returns Module[] from glob-loaded JSON (memoized)
    useProgress.ts       Per-module progress state, mirrored to localStorage
    useSRS.ts            Due-card list + schedule(rating) action
```

### 4.3 Data flow
```
content/modules/*.json
        │
        ▼  import.meta.glob (build-time)
   useModules()  ──►  CatalogView, ModuleView, ReviewView
                              │
                              ▼
                  user completes exercises
                              │
                              ▼
                "Add to review" seeds SRS cards
                              │
                              ▼
                       localStorage (ksa_srs)
                              │
                              ▼
                useSRS()  ──►  ReviewView  ──►  rate  ──►  scheduleCard()  ──►  localStorage
```

Key architectural choices:

- **Content as data, not code.** Modules are pure JSON. No JSX in content, no per-module components. This keeps content authoring (or generation) cheap and decoupled from rendering.
- **Pure scheduling logic.** `srs.ts` is a set of pure functions; `useSRS` is the only React surface. This is what `srs.test.ts` covers.
- **Storage is keyed by composite IDs** (`${moduleId}:${vocabIndex}`). Index-based, which means **reordering vocab in a JSON file would silently corrupt SRS history.** (See §6 — risk worth tracking.)
- **`useMemo` over `location.pathname` for the due count** in `App.tsx` is a deliberate hack to recompute from `localStorage` on each route change without a global store. Works for now; will get cumbersome if more cross-route state appears.

### 4.4 SRS (`srs.ts`)
A trimmed SM-2 implementation:
- Three ratings map to SM-2 quality scores: `forgot → 0`, `hard → 3`, `easy → 5`.
- `q < 3` → reset (`repetitions = 0`, `interval = 1`).
- Otherwise: 1st correct → 1 day, 2nd correct → 6 days, then `interval *= easeFactor` rounded.
- `easeFactor` updates with the standard SM-2 formula, floored at 1.3.
- `nextReview` stored as ISO `YYYY-MM-DD` strings; `isDue` is a string compare against today.

### 4.5 Tests
Vitest run via `npm test`. Existing coverage:
- `src/srs.test.ts` — scheduling logic.
- `src/storage.test.ts` — localStorage round-trips.
- `src/components/VocabEntry.test.tsx` — render + sanifu disclosure.
- `src/components/ExerciseFillBlank.test.tsx` — answer-checking interaction.

No coverage yet for: ModuleView flow, ReviewView flow, ExerciseMatch, ExerciseTranslate, useSRS, useProgress, useModules.

---

## 5. What's Working End-to-End

1. Browse catalog → filter by category/difficulty → open a module.
2. Read cultural context → study vocab (with sanifu) → read example exchange (with sanifu).
3. Complete fill-blank, match, translate exercises in any order.
4. Once all three exercises are done, the "Add to review" button unlocks; clicking it seeds vocab cards.
5. Nav due-count badge updates on next route change.
6. Visit `/review` → walk through due cards → rate each → SM-2 schedules them → session-complete screen.
7. Refresh the page anytime — module status, exercise unlock state on re-entry, SRS schedule, due count are all persisted via localStorage.

---

## 6. Known Limitations & Risks

These aren't bugs to fix today, but they're the sharp edges that any next-step plan should account for:

### Content
- **Only 2 modules**, both beginner. The promised breadth (transport / food-drink / commerce / health / work-admin / social × 3 difficulty tiers) is mostly unfilled.
- No audio. Spoken Kenyan Swahili has pronunciation and prosody features (e.g. clipped vowels, English/Sheng borrowings) that text alone can't convey.
- No images. The "Context" sections are text-only; a photo of a matatu / kibanda would be worth a paragraph.

### Pedagogy
- **Translate** exercises are unscored — the user grades themselves by clicking "Got it." Honest learners get value; dishonest ones can grind through with no friction.
- The match exercise's distractors come only from the same exercise's pairs. With small pair sets, distractors get repetitive.
- No mastery-based gating between modules; difficulty is advisory, not enforced.
- SRS only covers vocab. Exchange lines and exercise prompts are never reviewed.

### Architecture
- **Index-based SRS keys (`${moduleId}:${vocabIndex}`)** mean any reordering or insertion in `content/modules/*.json` silently scrambles a user's review history. Should migrate to stable per-entry IDs before content scales.
- localStorage is single-device, no sync, no export. A user who switches browsers loses everything.
- `App.tsx`'s due-count recomputation reads localStorage on every route change. Fine at this scale; will need a real store (Zustand / Context) once more components want to react to SRS state live.
- `useSRS`'s `dueKeys` is recomputed on every render from in-memory state — also fine at this scale.
- No service worker, no offline support, no PWA manifest beyond a favicon. Easily added but not done.
- No analytics, no error reporting.
- ESLint config is the default Vite scaffold; not yet upgraded to the type-aware ruleset the README hints at.

### Build/infra
- Public build is just `npm run build` → static `dist/`. No deployment target configured (no Vercel/Netlify config, no CI).
- README is still the unedited Vite template — has nothing project-specific.

---

## 7. Where to Take It Next (Inputs, not Decisions)

A non-prescriptive list of plausible next directions, grouped by the kind of work they'd be:

**Content scaling**
- Author 6–10 more modules to populate the existing categories at beginner level.
- Extend to intermediate / advanced tiers.
- Add audio recordings (native speaker) per vocab entry; wire a simple play button into `VocabEntry` and `Flashcard`.
- Add a *Sheng* layer alongside *Sanifu* for a third register.

**Pedagogy / UX**
- Listening exercise type (audio → transcribe).
- Speaking / shadow-repeat exercise (record, compare).
- Generate match-exercise distractors from the *whole vocab corpus* of the same difficulty band, not just the current exercise's pairs.
- Per-module "test out" path that bypasses exercises if the user proves vocab mastery.
- Daily-streak / commitment surface on the catalog.

**Architecture hardening**
- Replace index-based SRS keys with stable per-vocab UUIDs in the JSON. Migrate existing localStorage data on first load.
- Lift SRS state into a context/store so the nav badge can update live without route changes.
- Optional account + cloud sync (Supabase or similar) — gates everything behind auth, big decision.
- PWA-ify (offline cache + installable).

**Productionization**
- Replace template README with a real one.
- Set up a deploy target (Vercel is one click for Vite).
- Wire CI to run `npm test` and `npm run build` on PRs.
- Add component tests for the views and remaining exercise types.

---

## 8. How to Run

```bash
npm install      # already done
npm run dev      # Vite dev server, http://localhost:5173/
npm run build    # tsc -b && vite build → dist/
npm run preview  # serve dist/ locally
npm test         # Vitest, single run
npm run lint     # ESLint
```

No environment variables. No external services. Everything is local.
