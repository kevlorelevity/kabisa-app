# Kabisa Swahili App

A learning app for **spoken Kenyan Swahili** — the everyday register actually used on the streets of Nairobi, Mombasa, Kisumu — taught with the textbook *Sanifu* equivalent always shown alongside.

V1 is for absolute beginners. Scope is deliberately narrow: only the m/wa and n/n noun classes, only present tense, simple vocabulary from a curated seed. *Skeleton first, then dress it up.*

---

## Stack

- **Vite 8** + **React 19** + **TypeScript 5.9** (strict)
- **react-router-dom 7**
- **Tailwind 3**
- **Vitest 4** + **@testing-library/react**
- **Supabase** — Postgres, Google OAuth, Row-Level Security

Front-end talks to Supabase directly via `@supabase/supabase-js`. No separate backend.

---

## Setup

```bash
# 1. Clone and install
npm install

# 2. Provision Supabase
#    Follow db/README.md to create the project and apply the two SQL
#    migrations (db/migrations/001_init.sql and 002_rls.sql).

# 3. Configure env
cp .env.example .env.local
#    Fill in the four values from Supabase Settings → API.

# 4. Seed content
npm run db:seed
#    Loads every content/modules/*.json into the live DB. Idempotent.

# 5. Run the dev server
npm run dev
```

Without `.env.local`, the prototype still runs against the local JSON glob — useful for offline work and CI. As soon as Supabase env vars are set, the API client takes over.

---

## Scripts

| Script | What it does |
| :---- | :---- |
| `npm run dev` | Vite dev server at `http://localhost:5173/` |
| `npm run build` | `tsc -b && vite build` → `dist/` |
| `npm run preview` | Serve the built `dist/` locally |
| `npm test` | Vitest, single run |
| `npm run lint` | ESLint |
| `npm run db:seed` | Load `content/modules/*.json` into Supabase |

---

## Project structure

```
content/modules/         JSON authoring files (one module per file)
db/
  migrations/            Postgres migrations (apply in order)
  seed/                  Node seed loader (content → Supabase)
docs/
  schema.md              Corpus contract — types, enums, V1 scope rules
public/                  Static assets
src/
  App.tsx                Router shell + nav due-count + SRS legacy-key migration
  main.tsx               Entry point
  types.ts               All shared TypeScript types
  lib/
    supabase.ts          Supabase client factory (returns null if unconfigured)
    api.ts               Read-only data-access functions for V1 content
  srs.ts                 SM-2 scheduling
  storage.ts             localStorage helpers + legacy SRS-key migration
  views/                 CatalogView, ModuleView, ReviewView
  components/            Cards, exercise renderers, flashcard, nav
  hooks/                 useModules, useProgress, useSRS
IMPLEMENTATION_PLAN_V1.md   Workstreams + ticket-level plan
STATUS.md                   Prototype baseline at the V1 kickoff
```

---

## Related docs

- **`IMPLEMENTATION_PLAN_V1.md`** — workstream + ticket-level plan for V1 build.
- **`docs/schema.md`** — corpus contract. Read before changing any type or table.
- **`db/README.md`** — Postgres setup, migrations, seed, RLS overview.
- **`STATUS.md`** — prototype baseline (historical; pre-V1 state).
- **`Kabisa - PRD v1 (May 2026).docx`** — product context (in project folder).

---

## V1 scope rules — the short version

- **Noun classes:** only `m_wa` and `n_n` surface in lessons, flashcards, and the engine. The corpus may store anything; V1 views filter to these two.
- **Tense:** only `present` surfaces. Past, future, and perfect are out-of-scope for V1.
- **Vocabulary:** beginner-only, curated by hand from the seed spreadsheet.
- **Sanifu deviations:** always called out. Same disclosure pattern on every surface.

Full rationale and enforcement details in `docs/schema.md` §1 and `IMPLEMENTATION_PLAN_V1.md` §1.

---

## Contributing

This is an internal project. If you're reading this and you're not Kevin or Lillian, ping Kevin first.
