# Database — Kabisa Swahili App

Postgres schema, migrations, and seed data for V1. Hosted on Supabase.

---

## 1. Files

```
db/
├── migrations/
│   ├── 001_init.sql       Initial schema: enums, tables, indexes, triggers, V1 views
│   └── 002_rls.sql        Row-level security policies + is_admin() helper
└── seed/
    └── seed.mjs           Loads content/modules/*.json into the live DB
```

---

## 2. Provisioning (one-time)

1. **Create a Supabase project** at `supabase.com`. Free tier is fine for dev.
2. **Apply migrations** from the project dashboard:
   - Open *SQL Editor*.
   - Paste the contents of `001_init.sql`, run.
   - Paste the contents of `002_rls.sql`, run.
   - *Or* use the Supabase CLI: `supabase db push` after putting the files in `supabase/migrations/`.
3. **Copy env vars** from *Settings → API*:
   - `VITE_SUPABASE_URL` and `SUPABASE_URL` ← *Project URL*.
   - `VITE_SUPABASE_ANON_KEY` ← *anon public* key.
   - `SUPABASE_SERVICE_ROLE_KEY` ← *service_role* key.
4. **Save them** in `.env.local` at the repo root, modeled on `.env.example`.

---

## 3. Seed (every time content changes)

```bash
npm run db:seed
```

Reads every `content/modules/*.json`, upserts modules, vocab, exchange lines, and exercises by stable UUID. **Idempotent** — re-running won't duplicate rows.

The seed uses the *service-role* key, which bypasses RLS. Never run it from a browser. Never commit the key.

---

## 4. RLS at a glance

- **Corpus tables** (`module`, `vocab_entry`, `module_vocab`, `exchange_line`, `exercise`, `grammar_lesson`) — `SELECT` open to anyone (anon + authed). Writes require an admin row in `account`.
- **User tables** (`account`, `profile`, `module_progress`, `srs_card`, `lesson_progress`) — owner-only. Admins can read for support.
- **`edit_log`** — admin-only read. Writes happen through service-role RPCs (M2).

The helper `public.is_admin()` checks `account.role` for the current `auth.uid()`.

---

## 5. V1 read views

The migration creates two read-only views the frontend should prefer over raw tables:

- **`v1_vocab`** — `vocab_entry` filtered to `noun_class IN ('m_wa', 'n_n')` and `tense IN ('present', NULL)`.
- **`v1_module`** — `module` filtered to `difficulty = 'beginner'`.

Building on the views enforces the V1 scope rule server-side. *A misbehaving client can't bypass the filter.*

---

## 6. Future migrations

- `003_*` — additions for auth triggers and account-creation flow (ticket A2).
- `004_*` — admin RPCs and edit-log triggers (ticket D8).

Add new migrations with a strictly-increasing prefix. Never edit a migration that's been applied to staging or prod.
