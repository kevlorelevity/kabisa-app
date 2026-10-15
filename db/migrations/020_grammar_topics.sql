-- 020: the grammar studio — admins draft new grammar sections, or rework existing ones, and publish them.
--   grammar_topic — one row per grammar slug.
--     draft      the version being worked on (admins only see / use it), null when nothing is pending
--     published  the live version every learner gets; null = not live (a new section still in draft,
--                or a bundled section back to its shipped wording)
--     is_new     true for a section that isn't in content/grammar/topics.json
--   A published version replaces the shipped topic; quick ✎ edits made before published_at are
--   already part of it and are skipped at load (src/lib/contentOverrides.ts).
create table if not exists public.grammar_topic (
  slug text primary key check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  draft jsonb,
  published jsonb,
  is_new boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  updated_by uuid default auth.uid() references public.account(id) on delete set null
);
alter table public.grammar_topic enable row level security;
create policy grammar_topic_read on public.grammar_topic for select using (published is not null or public.is_admin());
create policy grammar_topic_admin_insert on public.grammar_topic for insert with check (public.is_admin());
create policy grammar_topic_admin_update on public.grammar_topic for update using (public.is_admin()) with check (public.is_admin());
create policy grammar_topic_admin_delete on public.grammar_topic for delete using (public.is_admin());
