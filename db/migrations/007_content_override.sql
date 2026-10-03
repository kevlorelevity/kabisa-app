-- ============================================================================
-- 007: live content edits from the admin pencils (lib/contentOverrides.ts).
-- Each row: inside lesson/grammar topic/level <scope_id>, replace <find_text>
-- with <replace_text>. Everyone can read active rows (the app applies them on
-- load); only admins can write. To undo an edit: update ... set active = false.
-- ============================================================================
create table if not exists public.content_override (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references public.account(id) on delete set null,
  scope_type text not null check (scope_type in ('lesson', 'grammar', 'level')),
  scope_id text not null,
  item_id text,
  find_text text not null check (char_length(find_text) between 1 and 4000),
  replace_text text not null check (char_length(replace_text) <= 4000),
  suggestion_id uuid references public.content_suggestion(id) on delete set null,
  active boolean not null default true
);
alter table public.content_override enable row level security;
create policy content_override_read_active on public.content_override
  for select using (active or public.is_admin());
create policy content_override_admin_insert on public.content_override
  for insert with check (public.is_admin());
create policy content_override_admin_update on public.content_override
  for update using (public.is_admin()) with check (public.is_admin());
create index if not exists content_override_scope_idx on public.content_override (scope_type, scope_id, created_at);

-- "What should change and why" is optional when the admin edits the text in place.
alter table public.content_suggestion alter column suggestion drop not null;
alter table public.content_suggestion drop constraint if exists content_suggestion_suggestion_check;
alter table public.content_suggestion add constraint content_suggestion_suggestion_check
  check (suggestion is null or char_length(suggestion) <= 4000);
