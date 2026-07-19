-- ============================================================================
-- Migration 001 — initial V1 schema
--
-- Target: Postgres 15+ (Supabase-compatible).
-- Mirrors src/types.ts and docs/schema.md. Update all three together.
--
-- Conventions
--   - snake_case in the DB, camelCase in TypeScript. Generated types map.
--   - Every table has a UUID primary key generated via gen_random_uuid().
--   - Timestamps are TIMESTAMPTZ.
--   - Enums are first-class Postgres types.
--   - V1 scope is enforced at the read layer, not as a CHECK. The corpus
--     can hold m_wa, n_n, *and* 'other' rows. V1 views/queries filter to
--     m_wa + n_n + present.
-- ============================================================================

create extension if not exists pgcrypto;   -- gen_random_uuid()

-- ----------------------------------------------------------------------------
-- Enums
-- ----------------------------------------------------------------------------

create type category as enum (
  'transport', 'food-drink', 'commerce', 'health',
  'work-admin', 'social', 'home', 'people',
  'time', 'weather', 'directions', 'numbers'
);

-- One enum for both content difficulty and user proficiency — same axis.
create type difficulty as enum ('beginner', 'medium', 'advanced');

create type module_status as enum ('not-started', 'in-progress', 'reviewed');

create type srs_rating as enum ('forgot', 'hard', 'easy');

create type noun_class as enum ('m_wa', 'n_n', 'other');

create type tense as enum ('present', 'other');

create type part_of_speech as enum (
  'noun', 'verb', 'adjective', 'possessive', 'phrase', 'other'
);

create type register as enum ('sanifu', 'kenyan', 'out_of_scope');

create type account_role as enum ('learner', 'admin');

create type exercise_kind as enum ('fill-blank', 'match', 'translate');

-- ----------------------------------------------------------------------------
-- Corpus tables
-- ----------------------------------------------------------------------------

create table module (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique,                  -- e.g. 'chai-kiosk'
  title           text not null,
  category        category not null,
  difficulty      difficulty not null default 'beginner',
  cultural_note   text not null default '',
  order_index     int not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index module_category_idx   on module (category);
create index module_difficulty_idx on module (difficulty);

create table vocab_entry (
  id                uuid primary key default gen_random_uuid(),
  swahili           text not null,        -- Kenyan colloquial form
  english           text not null,
  example_context   text not null default '',
  sanifu            text,                 -- standard form (only when divergent)
  sanifu_note       text,
  part_of_speech    part_of_speech,
  noun_class        noun_class,           -- required for nouns
  tense             tense,                -- required for verbs
  category          category,
  difficulty        difficulty not null default 'beginner',
  audio_url         text,                 -- reserved for V2
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index vocab_entry_noun_class_idx  on vocab_entry (noun_class);
create index vocab_entry_tense_idx       on vocab_entry (tense);
create index vocab_entry_difficulty_idx  on vocab_entry (difficulty);
create index vocab_entry_category_idx    on vocab_entry (category);

-- Many-to-many: a vocab entry can appear in multiple modules.
create table module_vocab (
  module_id     uuid not null references module(id)        on delete cascade,
  vocab_id      uuid not null references vocab_entry(id)   on delete cascade,
  order_index   int  not null default 0,
  primary key (module_id, vocab_id)
);

create index module_vocab_module_idx on module_vocab (module_id, order_index);
create index module_vocab_vocab_idx  on module_vocab (vocab_id);

create table exchange_line (
  id              uuid primary key default gen_random_uuid(),
  module_id       uuid not null references module(id) on delete cascade,
  order_index     int  not null,
  speaker         text not null,
  swahili         text not null,
  english         text not null,
  sanifu          text,
  sanifu_note     text,
  audio_url       text,                  -- reserved for V2
  created_at      timestamptz not null default now()
);

create index exchange_line_module_idx on exchange_line (module_id, order_index);

create table exercise (
  id              uuid primary key default gen_random_uuid(),
  module_id       uuid not null references module(id) on delete cascade,
  order_index     int  not null,
  kind            exercise_kind not null,
  payload         jsonb not null,        -- shape varies by kind; see docs/schema.md
  created_at      timestamptz not null default now()
);

create index exercise_module_idx on exercise (module_id, order_index);

create table grammar_lesson (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique,
  title           text not null,
  order_index     int not null default 0,
  body_md         text not null default '',
  examples        jsonb not null default '[]'::jsonb,
  difficulty      difficulty not null default 'beginner',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index grammar_lesson_order_idx on grammar_lesson (order_index);

-- ----------------------------------------------------------------------------
-- Account + profile
-- ----------------------------------------------------------------------------

create table account (
  id              uuid primary key default gen_random_uuid(),
  google_sub      text unique,           -- Google OAuth subject ID
  email           text not null unique,
  first_name      text not null default '',
  last_name       text not null default '',
  role            account_role not null default 'learner',
  created_at      timestamptz not null default now()
);

create table profile (
  account_id      uuid primary key references account(id) on delete cascade,
  proficiency     difficulty not null default 'beginner',   -- V1 hardcodes 'beginner'
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Progress
-- ----------------------------------------------------------------------------

create table module_progress (
  account_id        uuid not null references account(id) on delete cascade,
  module_id         uuid not null references module(id)  on delete cascade,
  status            module_status not null default 'not-started',
  added_to_review   boolean not null default false,
  last_reviewed     date,
  updated_at        timestamptz not null default now(),
  primary key (account_id, module_id)
);

create index module_progress_account_idx on module_progress (account_id);

create table srs_card (
  account_id      uuid not null references account(id)      on delete cascade,
  vocab_id        uuid not null references vocab_entry(id)  on delete cascade,
  interval_days   int  not null default 1,
  ease_factor     real not null default 2.5,
  repetitions     int  not null default 0,
  next_review     date not null,
  last_rating     srs_rating,
  updated_at      timestamptz not null default now(),
  primary key (account_id, vocab_id)
);

-- Hot path: list cards due today for a given user.
create index srs_card_due_idx on srs_card (account_id, next_review);

create table lesson_progress (
  account_id      uuid not null references account(id)        on delete cascade,
  lesson_id       uuid not null references grammar_lesson(id) on delete cascade,
  completed_at    timestamptz,
  primary key (account_id, lesson_id)
);

create index lesson_progress_account_idx on lesson_progress (account_id);

-- ----------------------------------------------------------------------------
-- Admin audit log
-- ----------------------------------------------------------------------------

create table edit_log (
  id              uuid primary key default gen_random_uuid(),
  actor_id        uuid not null references account(id),     -- never cascade — preserve audit
  target_table    text not null,
  target_id       uuid not null,
  field           text not null,
  before_value    text,
  after_value     text,
  changed_at      timestamptz not null default now()
);

create index edit_log_target_idx on edit_log (target_table, target_id);
create index edit_log_actor_idx  on edit_log (actor_id, changed_at desc);
create index edit_log_time_idx   on edit_log (changed_at desc);

-- ----------------------------------------------------------------------------
-- updated_at triggers
-- ----------------------------------------------------------------------------

create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger module_set_updated_at
  before update on module
  for each row execute function set_updated_at();

create trigger vocab_entry_set_updated_at
  before update on vocab_entry
  for each row execute function set_updated_at();

create trigger grammar_lesson_set_updated_at
  before update on grammar_lesson
  for each row execute function set_updated_at();

create trigger profile_set_updated_at
  before update on profile
  for each row execute function set_updated_at();

create trigger module_progress_set_updated_at
  before update on module_progress
  for each row execute function set_updated_at();

create trigger srs_card_set_updated_at
  before update on srs_card
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- V1 read views
--
-- V1 surfaces only m/wa + n/n nouns and present-tense verbs. Build the
-- frontend on these views so the constraint is enforced server-side and
-- can't be bypassed by a misbehaving client.
-- ----------------------------------------------------------------------------

create view v1_vocab as
  select *
  from vocab_entry
  where (noun_class is null or noun_class in ('m_wa', 'n_n'))
    and (tense      is null or tense      = 'present');

create view v1_module as
  select *
  from module
  where difficulty = 'beginner';
