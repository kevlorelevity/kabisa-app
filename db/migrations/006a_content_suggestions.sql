-- ============================================================================
-- 006a: content suggestions from the admin pencil icons (applied 2026-10-03).
-- api/suggestion.ts stores each one here and copies it into the Google Sheet.
-- ============================================================================

-- Suggestions from the pencil icons.
create table if not exists public.content_suggestion (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  account_id uuid not null default auth.uid() references public.account(id) on delete cascade,
  reviewer_email text,
  reviewer_name text,
  kind text not null default 'phrasing',          -- phrasing | translation | grammar | layout | other
  target_type text not null,                       -- e.g. turn.swahili, practice.explanation, grammar.block
  target_label text,                               -- human-readable location
  lesson_id text,
  item_id text,
  current_text text,
  suggestion text not null check (char_length(suggestion) between 1 and 4000),
  proposed_text text,
  page text,
  status text not null default 'new',              -- new | approved | applied | rejected
  sheet_synced boolean not null default false
);
alter table public.content_suggestion enable row level security;
create policy content_suggestion_admin_all on public.content_suggestion
  for all using (public.is_admin()) with check (public.is_admin());
create index if not exists content_suggestion_created_idx on public.content_suggestion (created_at desc);
