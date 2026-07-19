# Kabisa Swahili App — Implementation Plan V1

Concrete plan for building V1 of the app over the next three months. Source of truth for what each workstream owns and what gets shipped when. Pairs with the PRD (`Kabisa - PRD v1 (May 2026).docx` in the project folder) and the prototype baseline (`STATUS.md`).

*V1 is for absolute beginners only. Every constraint in §1 narrows scope so we can ship.*

---

## 1. V1 constraints

The simplifications that define the scope of V1. They are non-negotiable for this release.

- **Audience:** absolute beginner only. The catalog, lessons, and flashcards are sized for someone who has just started.
- **Noun classes:** only **m/wa** (people: *mtu/watu*, *mwalimu/walimu*) and **n/n** (many things: *nyumba*, *gari*, *simu*). The seed spreadsheet contains content from other classes — we leave it in the database but **do not surface it in V1 lessons, exercises, or grammar panels.**
- **Tense:** **present only** (the *-na-* tense and the *ni / niko / nina* copula family). No past (*-li-*), no future (*-ta-*), no perfect (*-me-*).
- **Vocabulary:** simple beginner vocab and phrases only. Best-guess pick from the seed spreadsheet — admins tune in the content-audit ticket (`C7`).
- **Sanifu deviations are always called out.** Same pedagogical pattern as the prototype: every vocab item, exchange line, and grammar note can carry a `sanifu` form and a `sanifuNote` that explains the divergence. The engine flags non-standard input as `valid-but-non-standard` rather than wrong.

| **V1 scope rule:** if a piece of content would teach a noun class other than m/wa or n/n, or a tense other than present, it is excluded from V1 — even if it lives in the seed corpus. The corpus stores it; the V1 frontend filters it out. |
| :---- |

---

## 2. Workstreams

Six workstreams. Each owns a vertical slice of the build. Tickets are sized in 1–3 day chunks unless noted.

1. **Content** — corpus authoring, spreadsheet migration, beginner curation.
2. **Database & backend** — schema, API, persistence, audit.
3. **Auth** — Google OAuth, sessions, role flag.
4. **Frontend (learner)** — extending the prototype: dialogues, tap-to-explain, flashcards, grammar UI.
5. **Swahili engine v1** — rule library, validator, variant overlay.
6. **Admin tools** — admin console, inline edits, edit log, role grants.

Plus one cross-cutting track:

- **Infra & quality** — hosting, CI, environment config, test coverage.

The six PRD milestones (`M1`–`M6`) compose tickets across workstreams. See §10 for the milestone-by-milestone sequence.

---

## 3. Content workstream

The goal is a clean beginner-only corpus seeded from the spreadsheet, tagged with noun class on every noun, and authored into 8–10 modules and 6 grammar lessons.

### 3.1 Tickets

**C1 · Lock the corpus schema.**
- *Why:* every other content ticket depends on a stable schema.
- *Scope:* finalize the fields on `VocabEntry`, `ExchangeLine`, `Exercise`, `Module`, `GrammarLesson`. Every noun has `nounClass` (`m_wa | n_n | other`). Every verb has `tense` (`present | other`). `other` is allowed in the DB but filtered in the V1 frontend.
- *Output:* `src/types.ts` updates; matching schema doc in `/docs/schema.md`.
- *Sizing:* 1 day.

**C2 · Pick V1 vocab from the seed spreadsheet.**
- *Why:* the seed has thousands of items; V1 needs a curated subset.
- *Scope:* walk every beginner-eligible sheet (Greetings, Home, Kitchen & Food, People, Interaction, Time, Weather, Days/Months/Seasons, Directions, Numbers/Money, Work & Business, Transport). Pull only items that pass all four V1 rules. Tag noun class on every noun.
- *Output:* a single CSV (`content/seed/v1-vocab.csv`) of ~250–400 entries, each with `english`, `kenyan`, `sanifu`, `sanifuNote`, `nounClass`, `category`, `exampleContext`, `partOfSpeech`.
- *Sizing:* 2–3 days. *Best-guess pick; Kevin and Lillian audit in `C7`.*
- *Depends on:* `C1`.

**C3 · Migrate spreadsheet → DB seed.**
- *Scope:* one-time Python script that reads `Kabisa Seed Document May 2026.xlsx`, takes the `v1-vocab.csv` cut from `C2`, and produces SQL inserts (or a Supabase-ready JSON dump). Stable UUIDs assigned per row.
- *Output:* `content/seed/migrate.py`, `content/seed/v1-seed.sql`.
- *Sizing:* 1–2 days.
- *Depends on:* `C1`, `C2`, `D1`.

**C4 · Author 8 beginner modules.**
- *Why:* the catalog needs real breadth. The prototype's two modules are a starting point — we keep them and add ~8 more.
- *Scope:* one module per category in the V1 audience scope (Greetings, Home, Kitchen & Food, People, Time/Days, Weather, Directions, Transport). Each module has: title, context paragraph, 8–12 vocab items, a 6–10 line dialogue, three exercises (fill-blank, match, translate).
- *Constraints:* m/wa or n/n nouns only; present tense only; beginner phrasing only.
- *Output:* `content/modules/*.json` (or DB rows once `M3` lands).
- *Sizing:* 1 day per module, *Lillian-led with Kevin review*.
- *Depends on:* `C2`.

**C5 · Author 6 grammar lessons for V1.**
- *Why:* the grammar section is a top-level surface per the PRD. V1 covers the minimum a beginner needs to make sense of the modules.
- *Scope:* six short lessons.
  1. **Subject prefixes (present)** — *ni-, u-, a-, tu-, m-, wa-* for m/wa class people. *i-, zi-* for n/n class things.
  2. **The *-na-* tense** — how present is built (prefix + *na* + stem). Sanifu-standard.
  3. **The m/wa noun class** — what belongs in it, how plurals form, what changes about the verb and adjective.
  4. **The n/n noun class** — what belongs in it, why most plurals look identical, what the agreement looks like.
  5. **Adjective agreement** — m-/wa- for m/wa class, n-/n- for n/n class. With *-zuri*, *-kubwa*, *-dogo* as the worked examples.
  6. **Possessives in present** — *-angu, -ako, -ake, -etu, -enu, -ao* with m/wa and n/n agreement.
- *Plus one callout:* the **Na- shortform** (*nashuka*) as a recognized Kenyan deviation. Lives inside lesson 2 as a sidebar, not its own lesson.
- *Output:* `content/grammar/*.json` (or DB rows post-`M3`).
- *Sizing:* ~0.5 day per lesson, 3 days total.

**C6 · Author 8 beginner role-play dialogues.**
- *Why:* the role-play / dialogue mode is a new V1 surface. The dialogue lines back the modules from `C4`.
- *Scope:* one dialogue per module. Two speakers, 6–10 lines each, side-by-side English. Sanifu disclosure per line where the Kenyan form deviates.
- *Constraints:* every verb is in present tense; every noun is m/wa or n/n.
- *Output:* embedded in the module JSON (already supported by the prototype's `ExchangeLine[]` shape).
- *Sizing:* 0.5 day per dialogue, 4 days total, *bundled with `C4`*.
- *Depends on:* `C4`.

**C7 · Beginner audit pass.**
- *Why:* Kevin admitted in the May 7 session that the spreadsheet was started when he was already past beginner. Easy stuff might be missing.
- *Scope:* Kevin + Lillian sit together for half a day. Walk the module catalog as if they were a brand-new learner. Flag every missing word, missing greeting, missing common phrase. Flag every example dialogue line that breaks a V1 rule. Decide for each what gets added or rewritten.
- *Output:* a list of edits applied via the admin tools shipped in `AD3`. *This is the moment the admin tools earn their keep.*
- *Sizing:* 1 working session + cleanup.
- *Depends on:* `C4`, `C5`, `C6`, `AD3`.

| **Authoring rule:** if a phrase the seed contains uses a non-m/wa, non-n/n noun, or a non-present tense, it does not appear in any V1 lesson, dialogue, or exercise. It can sit in the corpus for V2. *No exceptions in V1.* |
| :---- |

---

## 4. Database & backend workstream

The prototype is localStorage-only. V1 needs a real backend.

### 4.1 Schema sketch

Tables, not final names:

- **`vocab_entry`** — `id (uuid)`, `english`, `kenyan`, `sanifu`, `sanifu_note`, `noun_class` (`m_wa | n_n | other`), `part_of_speech`, `tense` (nullable, for verbs), `category`, `difficulty`, `example_context`, `audio_url` (nullable).
- **`module`** — `id`, `slug`, `title`, `category`, `difficulty`, `context_text`, `order_index`.
- **`module_vocab`** — `module_id`, `vocab_id`, `order_index` (many-to-many; vocab can appear in multiple modules).
- **`exchange_line`** — `id`, `module_id`, `order_index`, `speaker`, `kenyan`, `sanifu`, `sanifu_note`, `english`.
- **`exercise`** — `id`, `module_id`, `order_index`, `kind` (`fill_blank | match | translate`), `payload` (JSON, kind-specific).
- **`grammar_lesson`** — `id`, `slug`, `title`, `order_index`, `body_md`, `examples` (JSON), `difficulty`.
- **`account`** — `id`, `google_sub`, `email`, `first_name`, `last_name`, `role` (`learner | admin`), `created_at`.
- **`profile`** — `account_id`, `proficiency` (`beginner | medium | advanced`), `created_at`. *V1 hardcodes `beginner`.*
- **`srs_card`** — `account_id`, `vocab_id`, `interval`, `ease_factor`, `repetitions`, `next_review`, `last_rating`.
- **`module_progress`** — `account_id`, `module_id`, `status`, `added_to_review`, `last_reviewed`.
- **`lesson_progress`** — `account_id`, `lesson_id`, `completed_at`.
- **`edit_log`** — `id`, `actor_id`, `target_table`, `target_id`, `field`, `before`, `after`, `changed_at`. *Captures every admin write.*

### 4.2 Tickets

**D1 · Schema design + migration files.**
- *Scope:* write the SQL migrations for every table above. Stable UUID primary keys. Foreign keys with `ON DELETE` policies. Indexes on every foreign key and on `srs_card.next_review`.
- *Sizing:* 2 days.
- *Depends on:* `C1`.

**D2 · Provision Postgres.**
- *Scope:* stand up the database. Default choice is **Supabase** for the auth + DB + row-level-security combo, but final call sits with Kevin + Amos. Three environments: dev / staging / prod.
- *Sizing:* 0.5 day.

**D3 · Backend bootstrap.**
- *Scope:* pick a framework, scaffold the project, wire it to the DB.
- *Default:* Next.js API routes hosted alongside the frontend on Vercel. Alternative: FastAPI on Fly.io if Amos prefers it.
- *Sizing:* 1 day.
- *Depends on:* `D1`, `D2`.

**D4 · Seed loader.**
- *Scope:* run `C3`'s output against the new DB. Idempotent — re-running drops and reloads cleanly.
- *Sizing:* 0.5 day.
- *Depends on:* `C3`, `D1`, `D2`.

**D5 · Public read API.**
- *Scope:* unauthenticated routes for the catalog read path — `GET /modules`, `GET /modules/:slug`, `GET /grammar-lessons`, `GET /grammar-lessons/:slug`. Filtered by `difficulty=beginner` server-side in V1.
- *Sizing:* 1–2 days.
- *Depends on:* `D3`.

**D6 · Authed user API.**
- *Scope:* `GET /me`, `PATCH /me/profile`, `GET /me/srs`, `POST /me/srs/rate`, `POST /me/modules/:id/complete`, `GET /me/progress`. All gated by session.
- *Sizing:* 2 days.
- *Depends on:* `A2`, `D3`.

**D7 · Admin API.**
- *Scope:* `PATCH /admin/vocab/:id`, `PATCH /admin/exchange/:id`, `PATCH /admin/grammar/:id`, `PATCH /admin/modules/:id/difficulty`, `POST /admin/accounts/:id/role`. Every write triggers an `edit_log` insert.
- *Sizing:* 2 days.
- *Depends on:* `D6`.

**D8 · Edit-log write path.**
- *Scope:* middleware (or DB trigger) that captures `before` / `after` snapshots on every admin mutation. Read endpoint at `GET /admin/edit-log` with pagination and filters.
- *Sizing:* 1 day.
- *Depends on:* `D7`.

---

## 5. Auth workstream

Google OAuth only, learner role by default.

**A1 · Google OAuth client.**
- *Scope:* register the app with Google Cloud Console. Configure redirect URIs for dev / staging / prod. Store client secret in env config.
- *Sizing:* 0.5 day.

**A2 · Auth flow implementation.**
- *Scope:* if Supabase: enable Google provider, wire callback. If custom: implement the OAuth dance + session cookie. On first sign-in, insert into `account` with `role=learner` and into `profile` with `proficiency=beginner`.
- *Sizing:* 1–2 days.
- *Depends on:* `A1`, `D3`.

**A3 · Session + role guards.**
- *Scope:* server-side route guards on every authed endpoint. Role check (`admin`) on every admin endpoint. Frontend route guards mirror the server checks.
- *Sizing:* 1 day.
- *Depends on:* `A2`.

**A4 · Sign-in UX.**
- *Scope:* single "Sign in with Google" button on the marketing/landing surface. Post-auth redirect into the catalog.
- *Sizing:* 0.5 day.

---

## 6. Frontend (learner) workstream

Build forward on the current React/Vite/TS/Tailwind prototype. Replace localStorage with API calls.

**F1 · Repoint prototype at backend.**
- *Scope:* swap `storage.ts` localStorage helpers for an API client. Replace `useModules` glob loader with a fetch. Replace `useSRS` and `useProgress` localStorage reads with `GET /me/...`. SRS rating writes go through `POST /me/srs/rate`.
- *Sizing:* 2 days.
- *Depends on:* `D5`, `D6`.

**F2 · Catalog filtered by beginner.**
- *Scope:* the catalog displays only `difficulty=beginner` modules in V1. Filter chips for category remain. Difficulty chip is hidden in V1 (everyone is beginner).
- *Sizing:* 0.5 day.
- *Depends on:* `F1`.

**F3 · Role-play / dialogue mode.**
- *Scope:* new module sub-surface. Two-speaker side-by-side layout. Speaker labels colored, alternating left/right. Each line shows: Kenyan form (large), English meaning (smaller, underneath), Sanifu disclosure (collapsible per line). *Audio play button is a placeholder that does nothing in V1 but is rendered to keep the slot.*
- *Sizing:* 2 days.
- *Depends on:* `F1`.

**F4 · Tap-to-explain panel.**
- *Why:* the most-asked-for new surface in the May 7 session.
- *Scope:* every conjugated verb and every noun in a dialogue, vocab list, or flashcard is tappable. Tap opens a side panel.
  - *For verbs:* show the infinitive (e.g. *kushuka*), the full present-tense conjugation across `ni-/u-/a-/tu-/m-/wa-` (m/wa class subjects), and any Sanifu note from the corpus.
  - *For nouns:* show singular + plural form, noun class (m/wa or n/n), and an inline example with the right adjective and possessive agreement.
- *Constraints:* the panel only knows present tense and only knows m/wa + n/n. *Out-of-class nouns and other tenses don't open the panel in V1.*
- *Sizing:* 4–5 days. *Largest single ticket in V1.*
- *Depends on:* `E2`, `E3`, `E4`.

**F5 · Flashcards English-first.**
- *Scope:* default direction reversed from the prototype. Front = English, back = Kenyan. Easy / hard / forgot rating preserved. Reversal toggle is a per-user setting, defaulted to English-first, hidden behind a small icon.
- *Sizing:* 1 day.
- *Depends on:* `F1`.

**F6 · Grammar lessons surface.**
- *Scope:* new top-level route `/grammar`. List of the six V1 lessons. Lesson detail view renders the lesson body (markdown), examples, and a "mark complete" button. Progress tick mirrored from `lesson_progress`.
- *Sizing:* 2 days.
- *Depends on:* `D5`, `C5`.

**F7 · Proficiency onboarding (stub).**
- *Scope:* one-screen modal on first sign-in. *"What's your level?"* Beginner / Medium / Advanced. In V1, Medium and Advanced are disabled with a tooltip *"V2 — coming soon"*; everyone defaults to Beginner. The screen exists to set the muscle memory for future versions.
- *Sizing:* 0.5 day.
- *Depends on:* `D6`.

**F8 · Sanifu disclosure parity.**
- *Scope:* sanity check that every surface — vocab list, exchange line, flashcard front, flashcard back, tap-to-explain panel — exposes the Sanifu disclosure consistently. Same icon, same interaction.
- *Sizing:* 0.5 day.

**F9 · Mobile polish.**
- *Scope:* Tailwind responsive pass on every new surface. Tap-to-explain panel becomes a bottom sheet on mobile. Dialogue mode collapses to single-column with speaker label inline.
- *Sizing:* 1 day.

---

## 7. Swahili engine v1 workstream

A rule-based validator. Narrow on purpose. Recognizes correct input across m/wa and n/n in present tense, plus the Na- shortform deviation. Anything outside V1 scope returns `out_of_scope`.

### 7.1 The validator contract

```
validate(input: string, expected: { english, vocabId, kind }, context?: { nounClass?, tense? })
  → {
      ok: boolean,
      register: 'sanifu' | 'kenyan' | 'out_of_scope',
      sanifuForm?: string,
      note?: string
    }
```

The exercise UI consumes this and replaces the prototype's exact-match. *No Internet lookups. No LLM call. Just rules + corpus.*

### 7.2 Tickets

**E1 · Rule data model.**
- *Scope:* define the in-memory structures for: subject prefixes (per person × class), tense markers (V1 = just `-na-`), adjective stems with per-class agreement, possessive stems with per-class agreement, noun-class metadata.
- *Output:* `src/engine/rules.ts` (or backend equivalent).
- *Sizing:* 1 day.

**E2 · Subject-prefix conjugator (present).**
- *Scope:* given a verb stem and a subject person × number × noun class, produce the conjugated form in `-na-` tense. *V1 supports:* `ni-, u-, a-, tu-, m-, wa-` for m/wa class subjects; `i-, zi-` for n/n class subjects.
- *Output:* `conjugatePresent(verbStem, subject)` pure function.
- *Sizing:* 1–2 days.
- *Depends on:* `E1`.

**E3 · Adjective + possessive agreement validators.**
- *Scope:* given an adjective or possessive stem and a noun, return the agreed form. Accept the user's input if it matches any valid form for the noun's class.
- *Sizing:* 1–2 days.
- *Depends on:* `E1`.

**E4 · Variant overlay — the Na- shortform.**
- *Scope:* recognize `nashuka` as equivalent to `ninashuka` for 1st-person-singular present forms. Return `register='kenyan'` with a `note` pointing to the Sanifu form. Generalize: any `na-` prefixed verb form where the subject is implied as 1st-singular is accepted, with the Sanifu version surfaced.
- *Sizing:* 1 day.
- *Depends on:* `E2`.

**E5 · Out-of-scope detector.**
- *Scope:* if the input uses `-li-`, `-ta-`, `-me-`, or a noun-class agreement outside m/wa and n/n, return `{ ok: false, register: 'out_of_scope', note: '...' }`. The frontend renders this as a friendly message — *"Nice — that's past tense. We cover past tense in V2."* — rather than a red "wrong."
- *Sizing:* 1 day.
- *Depends on:* `E2`, `E3`.

**E6 · Validation API endpoint.**
- *Scope:* expose `POST /api/validate` that takes `{ input, expected, context }` and returns the validator result. Used by `ExerciseFillBlank` and `ExerciseTranslate` (translate becomes a self-grade hint, not a hard gate).
- *Sizing:* 1 day.
- *Depends on:* `E2`–`E5`, `D3`.

**E7 · Engine unit tests.**
- *Scope:* exhaustive table-driven tests covering every present-tense conjugation in both classes; every adjective agreement; every possessive agreement; the Na- shortform; every out-of-scope rejection. Coverage gate: 100% of the rule paths.
- *Sizing:* 1–2 days.
- *Depends on:* `E2`–`E5`.

| **Engine scope rule:** V1 ships with present tense and two noun classes. The codepaths for `-li-`, `-ta-`, `-me-`, and other classes are stubbed and return `out_of_scope`. We extend the engine in V2, not in V1. |
| :---- |

---

## 8. Admin tools workstream

A second app surface, role-gated. Same login, same backend.

**AD1 · Admin console scaffold.**
- *Scope:* `/admin` route, guarded by `role=admin`. Nav with three sub-surfaces: Corpus, Edit log, Users.
- *Sizing:* 1 day.
- *Depends on:* `A3`, `F1`.

**AD2 · Corpus browser.**
- *Scope:* filterable list of every vocab entry, exchange line, and grammar lesson. Filter by category, module, noun class, tense, difficulty. Click into any row.
- *Sizing:* 2 days.
- *Depends on:* `AD1`, `D5`.

**AD3 · Inline edit.**
- *Scope:* in the corpus browser and inside every learner-facing surface (vocab list, exchange line, grammar callout), an admin sees an edit icon. Click opens a small inline form. Save writes through `PATCH /admin/...` and updates the edit log.
- *Sizing:* 2–3 days.
- *Depends on:* `D7`, `D8`, `AD2`.

**AD4 · Difficulty re-categorization.**
- *Scope:* dropdown on every corpus item — `beginner | medium | advanced`. *In V1, demoting an item from beginner immediately removes it from the V1 catalog.*
- *Sizing:* 0.5 day.
- *Depends on:* `AD3`.

**AD5 · Edit log view.**
- *Scope:* read-only table at `/admin/edit-log` showing actor, target, field, before, after, when. Filters by actor and by date range.
- *Sizing:* 1 day.
- *Depends on:* `D8`.

**AD6 · Role grant tool.**
- *Scope:* user list at `/admin/users`. For each user, show role and a "Promote to admin" button. Promotion is logged to the edit log.
- *Sizing:* 0.5 day.
- *Depends on:* `D7`.

**AD7 · "This is wrong" flag (admin-only).**
- *Scope:* inline flag icon on every learner-visible item. Admin click jumps directly to the corpus edit form for that item with the relevant field pre-focused.
- *Sizing:* 0.5 day.
- *Depends on:* `AD3`.

---

## 9. Infra & quality

Lightweight in V1. Not a separate milestone — folds into the deploy of `M1` and `M6`.

**I1 · Hosting.**
- *Default:* Vercel for the frontend + Next.js API routes. Supabase for DB + auth.
- *Alternative:* Vercel frontend, FastAPI backend on Fly.io, Postgres on Supabase.
- *Sizing:* 0.5 day.

**I2 · Environments.**
- *Scope:* dev / staging / prod. Each with its own Supabase project and env config in Vercel.
- *Sizing:* 0.5 day.
- *Depends on:* `I1`.

**I3 · CI.**
- *Scope:* GitHub Actions runs `npm run lint`, `npm test`, `npm run build` on every PR. Optional: deploy preview from Vercel.
- *Sizing:* 0.5 day.

**I4 · Error reporting.**
- *Scope:* Sentry or equivalent. Frontend + backend. *Cheap to add now.*
- *Sizing:* 0.5 day.

**I5 · Basic analytics.**
- *Scope:* PostHog or Plausible — page views, sign-ups, module completions. *Privacy-respecting, no PII beyond email.*
- *Sizing:* 0.5 day. *Optional for V1; add if low cost.*

---

## 10. Milestone sequence

The six PRD milestones, composed from the tickets above. Each milestone ends with a working demo.

### M1 — DB + auth (Month 1, weeks 1–4)

Foundation. The prototype is repointed at a real database with users.

- `C1` Lock corpus schema.
- `D1` Schema migrations.
- `D2` Provision Postgres.
- `D3` Backend bootstrap.
- `D5` Public read API.
- `A1` Google OAuth client.
- `A2` Auth flow.
- `A3` Session + role guards.
- `A4` Sign-in UX.
- `F1` Repoint prototype at backend.
- `F8` Sanifu disclosure parity (carried forward from prototype).
- `I1`, `I2`, `I3` Hosting, environments, CI.

*Demo:* a user signs in with Google, sees the existing two modules read from the DB, rates flashcards that persist across devices.

### M2 — Admin tools (Month 1–2, weeks 3–6)

Earns the right to scale content. Without admin tools, every corpus mistake becomes a code change.

- `D6` Authed user API (carries some endpoints needed by `AD3`).
- `D7` Admin API.
- `D8` Edit-log write path.
- `AD1` Admin console scaffold.
- `AD2` Corpus browser.
- `AD3` Inline edit.
- `AD4` Difficulty re-categorization.
- `AD5` Edit log view.
- `AD6` Role grant tool.
- `AD7` "This is wrong" flag.

*Demo:* Kevin signs in as admin, edits a vocab item live, sees the change reflected and logged.

### M3 — Content seed (Month 2, weeks 5–8)

Real content. The catalog goes from two modules to ten.

- `C2` Pick V1 vocab.
- `C3` Migrate spreadsheet → DB seed.
- `D4` Seed loader.
- `C4` Author 8 beginner modules.
- `C6` Author 8 role-play dialogues.
- `C7` Beginner audit pass *(uses admin tools from `M2`)*.

*Demo:* the catalog shows 10 beginner modules. Kevin walks Lillian through one end-to-end.

### M4 — Tap-to-explain + grammar (Month 2–3, weeks 7–10)

The big learner-experience moves.

- `C5` Author 6 grammar lessons.
- `F3` Role-play / dialogue mode.
- `F4` Tap-to-explain panel.
- `F6` Grammar lessons surface.

*Demo:* tap a verb in a dialogue, see its present-tense conjugation. Open the grammar lesson on m/wa noun class.

### M5 — Swahili engine v1 (Month 3, weeks 9–12)

Validation upgrade. Fill-blank stops being exact-match.

- `E1` Rule data model.
- `E2` Subject-prefix conjugator.
- `E3` Adjective + possessive agreement.
- `E4` Variant overlay (Na- shortform).
- `E5` Out-of-scope detector.
- `E6` Validation API endpoint.
- `E7` Engine unit tests.

*Demo:* type `ninashuka` where the prompt expects `nashuka` — engine accepts both, calls out which is Sanifu. Try `nilishuka` — friendly out-of-scope message.

### M6 — Proficiency + flashcard direction (Month 3, week 12)

Polish slice. Closes the loop on the V1 spec.

- `F2` Catalog filtered by beginner.
- `F5` Flashcards English-first.
- `F7` Proficiency onboarding (stub).
- `F9` Mobile polish.
- `I4` Error reporting.
- `I5` Basic analytics *(optional)*.

*Demo:* V1 is feature-complete. Kevin and Lillian send it to five friends.

| **Cadence:** Kevin, Lillian, and Amos sync weekly. Every milestone ends with a working demo we can put in front of a friend. *No silent-build months.* |
| :---- |

---

## 11. Definition of done for V1

A V1 release passes when **all** of these are true:

1. A new user can **sign in with Google** and lands on a catalog of beginner modules.
2. The catalog contains at least **10 beginner modules** across the V1 categories.
3. Every module has a **vocab list, context note, role-play dialogue, and three exercises**.
4. Every conjugated verb and every noun in a learner-facing surface is **tappable**, opening the present-tense / m/wa-or-n/n explanation panel.
5. The **grammar lessons section** ships with the six V1 lessons.
6. **Flashcards** default to English-first, with SM-2 scheduling persisted to the user account.
7. The **Swahili engine** validates fill-blank exercises with the rules in §7, accepts the Na- shortform, and returns a friendly out-of-scope message for past or future tenses.
8. **Sanifu disclosure** is visible and consistent on every surface.
9. **Admin tools** allow Kevin or Lillian to edit any corpus item inline, re-categorize difficulty, and read the edit log.
10. **No content outside V1 scope** (other noun classes, other tenses) is visible to learners — even though it may live in the DB.
11. **Cross-device sync** works (sign in on a new device, see your SRS state).
12. **CI is green** and a deploy preview goes up on every PR.

---

## 12. Open questions

To resolve in the next planning session or asynchronously with Amos.

- **Backend framework call.** Next.js API routes vs. FastAPI vs. Supabase Edge Functions. *Default is Next.js + Supabase; reopen if Amos has a reason.*
- **Noun-class tagging coverage in the seed.** Kevin's pick in `C2` decides which spreadsheet rows make V1. If the m/wa + n/n cut is too narrow, we may need to commission more content — flagged at the `C7` audit.
- **Audio in V1?** PRD parks it. Even so, do we add an `audio_url` column to `vocab_entry` now? *Recommended yes — cheap insurance, listed in §4.1.*
- **App name.** Kabisa is the working title. Locked or open for change? *Locked is easier for marketing later.*
- **Sheng as a third register.** Out of V1, but do we reserve a `sheng` column on `vocab_entry` now or accept a V2 migration?
- **Grammar lesson sources.** Confirm we can adapt from *Simplified Swahili* and other reference books. *Adapt rather than reproduce.*
- **Admin authoring policy.** V1 is simple-override. We want a written principle on when (if ever) the AI proposes corpus changes.
- **Engine extension cost.** Estimate the lift to add past and future tense plus a third noun class. *Useful input to V2 planning, not blocking V1.*

---

## 13. References

- **PRD:** `Kabisa - PRD v1 (May 2026).docx` (project folder)
- **Prototype baseline:** `STATUS.md` (this repo)
- **Seed corpus:** `Kabisa Seed Document May 2026.xlsx` (project folder)
- **May 7 planning transcript:** captured in the PRD source

*Plan owner: Kevin. Reviewed weekly. Update in place as decisions land.*
