# Corpus Schema — V1

The contract for every piece of content in the app. Code (`src/types.ts`), DB (`db/migrations/`), and authoring (`content/`) all conform to what's documented here.

*Source of truth: this file. If the code drifts, fix the code.*

---

## 1. Scope rules baked into the schema

The V1 constraints from the PRD and implementation plan are enforced at three layers:

- **Type layer** — `NounClass` and `Tense` unions admit `'other'`, but every V1-facing surface filters that out.
- **DB layer** — `noun_class` and `tense` columns store all values; views and read queries restrict to V1 scope.
- **Engine layer** — the validator returns `register = 'out_of_scope'` for anything outside m/wa + n/n + present.

| **The rule:** the corpus may store content of any noun class or tense. The V1 frontend, V1 grammar lessons, V1 flashcards, and V1 Swahili engine surface only `noun_class IN ('m_wa', 'n_n')` and `tense IN ('present', NULL)`. *NULL covers non-verbs.* |
| :---- |

---

## 2. Identifier conventions

- **Module `id`** — short kebab-case slug used in URLs (`chai-kiosk`, `matatu-nairobi`). Stable across releases.
- **Module `uuid`** — random UUID v4. Used as the primary key in the DB. Stable across renames of the slug.
- **Vocab `id` / ExchangeLine `id` / Exercise `id` / GrammarLesson `id`** — random UUID v4 in the JSON authoring files. Becomes the primary key on import.
- **`account.id` / `profile.account_id`** — random UUID v4 generated at signup.

Never reuse an ID. Never reorder entries to imply meaning — order is captured in `order_index` columns when it matters.

---

## 3. Enums

```ts
type Category =
  | 'transport' | 'food-drink' | 'commerce' | 'health'
  | 'work-admin' | 'social' | 'home' | 'people'
  | 'time' | 'weather' | 'directions' | 'numbers';

type Difficulty   = 'beginner' | 'medium' | 'advanced';
type Proficiency  = 'beginner' | 'medium' | 'advanced';
type ModuleStatus = 'not-started' | 'in-progress' | 'reviewed';
type Rating       = 'forgot' | 'hard' | 'easy';

type NounClass    = 'm_wa' | 'n_n' | 'other';   // V1 surfaces m_wa and n_n only
type Tense        = 'present' | 'other';        // V1 surfaces 'present' only
type PartOfSpeech = 'noun' | 'verb' | 'adjective' | 'possessive' | 'phrase' | 'other';
type Register     = 'sanifu' | 'kenyan' | 'out_of_scope';

type AccountRole  = 'learner' | 'admin';
```

The previous `Difficulty` value `'intermediate'` was renamed to `'medium'` for consistency with the PRD's learner-facing language. *No content used `'intermediate'` at the time of the rename.*

---

## 4. Core content types

### 4.1 VocabEntry

The atomic unit of corpus content. SRS cards key off `VocabEntry.id`.

| Field | Type | Required | Notes |
| :---- | :---- | :---- | :---- |
| `id` | `string` (UUID) | ✓ | Stable. SRS card key. |
| `swahili` | `string` | ✓ | Kenyan colloquial form (the primary form taught). |
| `english` | `string` | ✓ | English gloss. |
| `exampleContext` | `string` | ✓ | One-line situational hint. |
| `sanifu` | `string` | optional | Standard form, only when it diverges from `swahili`. |
| `sanifuNote` | `string` | optional | Short explanation of the divergence. |
| `partOfSpeech` | `PartOfSpeech` | optional | Drives tap-to-explain panel behavior. |
| `nounClass` | `NounClass` | required for nouns | V1 surfaces `m_wa` and `n_n` only. |
| `tense` | `Tense` | required for verbs | V1 surfaces `present` only. |
| `audioUrl` | `string` | optional | Reserved column. No V1 surface uses it yet. |

*The `swahili` field name is legacy. The implementation plan notes a future rename to `kenyan` — out of scope for V1.*

### 4.2 ExchangeLine

A single line in a role-play dialogue. Same Sanifu disclosure pattern as `VocabEntry`.

| Field | Type | Required | Notes |
| :---- | :---- | :---- | :---- |
| `id` | `string` (UUID) | ✓ | Stable. |
| `speaker` | `string` | ✓ | Free-text label (`Mteja`, `Kondakta`, etc.). |
| `swahili` | `string` | ✓ | Kenyan form. |
| `english` | `string` | ✓ | English meaning. |
| `sanifu` | `string` | optional | Standard form when it diverges. |
| `sanifuNote` | `string` | optional | Short divergence note. |
| `audioUrl` | `string` | optional | Reserved. |

### 4.3 Exercise (discriminated union)

Three exercise types. All share an `id` and a `type` discriminator.

- **FillBlank** — `{ id, type: 'fill-blank', prompt, answer }`. V1 grading goes through the Swahili engine instead of exact-match (see §6 of the implementation plan).
- **Match** — `{ id, type: 'match', pairs: [{ swahili, english }, ...] }`. Distractors are drawn from the same pair set in V1 (planned: corpus-wide in V2).
- **Translate** — `{ id, type: 'translate', prompt, answer }`. Open-ended. Self-graded in V1; engine-validated in V2.

### 4.4 Module

A self-contained beginner unit.

| Field | Type | Required | Notes |
| :---- | :---- | :---- | :---- |
| `id` | `string` (slug) | ✓ | URL slug. |
| `uuid` | `string` (UUID) | ✓ | DB primary key. *Authored alongside the slug from the seed.* |
| `title` | `string` | ✓ | Display title. |
| `category` | `Category` | ✓ | One of the V1 categories. |
| `difficulty` | `Difficulty` | ✓ | V1 only surfaces `beginner`. |
| `culturalNote` | `string` | ✓ | Paragraph of context. |
| `vocabulary` | `VocabEntry[]` | ✓ | Ordered for display. |
| `exchange` | `ExchangeLine[]` | ✓ | Ordered. Role-play dialogue. |
| `exercises` | `Exercise[]` | ✓ | Order = display order. |

### 4.5 GrammarLesson

Top-level surface, separate from modules. Six in V1 (see implementation plan §3.1 `C5`).

| Field | Type | Required | Notes |
| :---- | :---- | :---- | :---- |
| `id` | `string` (UUID) | ✓ | Stable. |
| `slug` | `string` | ✓ | URL slug. |
| `title` | `string` | ✓ | Display title. |
| `orderIndex` | `number` | ✓ | Lesson order in the list. |
| `bodyMd` | `string` | ✓ | Markdown body. |
| `examples` | `Array<{ swahili, english, sanifu?, sanifuNote? }>` | ✓ | Worked examples. |
| `difficulty` | `Difficulty` | ✓ | V1 only surfaces `beginner`. |

---

## 5. User and progress types

### 5.1 Account / Profile

```ts
Account  { id, email, firstName, lastName, role: 'learner'|'admin', createdAt }
Profile  { accountId, proficiency: 'beginner'|'medium'|'advanced', createdAt }
```

V1 always sets `Profile.proficiency = 'beginner'`. The onboarding modal shows medium/advanced disabled with a *"V2 — coming soon"* tooltip.

### 5.2 ModuleProgress

Per `(account, module)` pair.

```ts
{ status: ModuleStatus, addedToReview: boolean, lastReviewed: string | null }
```

### 5.3 CardState (SRS)

Per `(account, vocabEntry)` pair. Keyed by `VocabEntry.id`.

```ts
{
  interval: number,        // days between reviews
  easeFactor: number,      // 1.3–2.5, SM-2
  repetitions: number,     // consecutive correct
  nextReview: string       // YYYY-MM-DD
}
```

The legacy SRS key format `${moduleId}:${vocabIndex}` is migrated to the new `VocabEntry.id` key on first load post-V1 via `migrateLegacySRSKeys()` in `src/storage.ts`. Unresolvable legacy keys are dropped silently.

### 5.4 EditLogEntry

Append-only audit row. Written on every admin mutation.

```ts
{ id, actorId, targetTable, targetId, field, before, after, changedAt }
```

---

## 6. Authoring file shape

A module JSON file at `content/modules/<slug>.json` mirrors the in-memory `Module` type one-to-one. Required: every UUID is pre-assigned at authoring time. The seed migration script (`content/seed/migrate.py`, ticket `C3`) imports these files into the DB without rewriting IDs.

Grammar lessons live at `content/grammar/<slug>.json` and mirror `GrammarLesson`.

---

## 7. Engine contract

The Swahili engine consumes corpus data via the DB only. Its public contract:

```ts
validate(input: string, expected: { english, vocabId, kind }, context?: { nounClass?, tense? })
  → {
      ok: boolean,
      register: 'sanifu' | 'kenyan' | 'out_of_scope',
      sanifuForm?: string,
      note?: string
    }
```

V1 scope: present tense (`-na-` + the `ni / niko / nina` copula family), m/wa class subjects, n/n class subjects, the `Na-` shortform deviation for 1st-singular present. Out-of-scope inputs return `register: 'out_of_scope'` with a friendly note.

Full engine spec: implementation plan §7.

---

## 8. Open schema questions

Tracked here so the migration scripts and code don't drift before they're decided. See implementation plan §12 for the broader open list.

- **`audio_url` column on `vocab_entry` and `exchange_line`** — already in the schema as optional. *Recommended kept. Cheap insurance against a V2 migration.*
- **`sheng` column on `vocab_entry`** — not in the V1 schema. Decision before `M3` (content seed) on whether to add now or accept a V2 migration.
- **`kenyan` rename** — `swahili` is the legacy field name and stays for V1. A clean rename to `kenyan` is planned for V2.
- **Tense expansion** — the `Tense` union admits `'other'` today. When V2 adds past and future, we change to `'present' | 'past' | 'future' | 'perfect' | 'other'` and update the engine accordingly.

---

## 9. References

- `src/types.ts` — TypeScript types (mirror of this doc).
- `db/migrations/001_init.sql` — Postgres tables (mirror of this doc, plus indexes and FKs).
- `IMPLEMENTATION_PLAN_V1.md` — workstreams and tickets.
- `Kabisa - PRD v1 (May 2026).docx` — product context (project folder).
- `STATUS.md` — prototype baseline at the time of V1 kickoff.
